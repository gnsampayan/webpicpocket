import React, { useState, useRef, useEffect } from 'react';
import styles from './VoiceNotePlayer.module.css';

interface VoiceNotePlayerProps {
    objectUrl: string; // Can be either a blob URL (preview) or complete URL (posted voice note)
    className?: string;
}

const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({ objectUrl, className = '' }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Use objectUrl directly - it should be either a blob URL (preview) or complete URL (posted)
    const isBlobUrl = objectUrl.startsWith('blob:');
    const mediaUrl = objectUrl;

    const isValidDuration = (dur: number): boolean => {
        return isFinite(dur) && !isNaN(dur) && dur > 0 && dur !== Infinity;
    };

    const formatTime = (time: number): string => {
        if (!isFinite(time) || isNaN(time) || time < 0) {
            return '0:00';
        }
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const audio = audioRef.current;
        if (!audio) return;

        const newTime = parseFloat(e.target.value);
        audio.currentTime = newTime;
        setCurrentTime(newTime);
    };

    const togglePlayPause = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
        } else {
            audio.play().catch(err => {
                console.error('Failed to play audio:', err);
                setError('Failed to play audio');
            });
            setIsPlaying(true);
        }
    };

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleLoadedMetadata = () => {
            const duration = audio.duration;
            if (isValidDuration(duration)) {
                setDuration(duration);
                setIsLoading(false);
                setError(null);
            }
        };

        const handleCanPlay = () => {
            // Try to get duration when audio can play
            const duration = audio.duration;
            if (isValidDuration(duration)) {
                setDuration(duration);
                setIsLoading(false);
                setError(null);
            } else {
                // Just clear loading state, don't try to auto-play
                setIsLoading(false);
            }
        };

        const handleDurationChange = () => {
            const duration = audio.duration;
            if (isValidDuration(duration)) {
                setDuration(duration);
                setIsLoading(false);
            }
        };

        const handleTimeUpdate = () => {
            setCurrentTime(audio.currentTime);
            // Update duration if it wasn't available before
            const audioDuration = audio.duration;
            if (isValidDuration(audioDuration) && duration === 0) {
                setDuration(audioDuration);
            }
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };

        const handleError = () => {
            const audio = audioRef.current;
            if (audio) {
                console.error('🎵 [VoicePlayer] Audio error details:', {
                    error: audio.error,
                    networkState: audio.networkState,
                    readyState: audio.readyState,
                    src: audio.src,
                    currentSrc: audio.currentSrc
                });

                if (audio.error) {
                    const errorMessages = {
                        1: 'MEDIA_ERR_ABORTED - The user canceled the audio.',
                        2: 'MEDIA_ERR_NETWORK - A network error occurred.',
                        3: 'MEDIA_ERR_DECODE - An error occurred while decoding the audio.',
                        4: 'MEDIA_ERR_SRC_NOT_SUPPORTED - The audio format is not supported.'
                    };
                    console.error('🎵 [VoicePlayer] Audio error code:', audio.error.code, '-', errorMessages[audio.error.code as keyof typeof errorMessages] || 'Unknown error');
                }
            }
            console.error('🎵 [VoicePlayer] Audio loading failed for URL:', mediaUrl);
            setError('Failed to load audio');
            setIsLoading(false);
        };

        const handleLoadStart = () => {
            setIsLoading(true);
            setDuration(0);
        };

        // Set up event listeners
        audio.addEventListener('loadstart', handleLoadStart);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('durationchange', handleDurationChange);
        audio.addEventListener('canplay', handleCanPlay);
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('error', handleError);

        // Force load the audio and preload metadata
        audio.preload = 'metadata';
        audio.load();

        // Add a timeout to prevent infinite loading
        const loadingTimeoutRef = setTimeout(() => {
            const currentAudio = audioRef.current;
            if (currentAudio) {
                const hasValidDuration = isValidDuration(currentAudio.duration);

                if (!hasValidDuration && currentAudio.readyState < 3) {
                    // Audio hasn't loaded properly
                    setError('Audio took too long to load');
                }
                setIsLoading(false);
            }
        }, 5000); // 5 second timeout

        // Use Web Audio API to get duration for all audio URLs (blob and regular URLs)
        // This provides accurate duration before playback starts
        const getDurationFromAudio = async () => {
            try {
                console.log('🎵 [VoicePlayer] Fetching audio for duration detection...');
                // Fetch the audio data
                const response = await fetch(objectUrl);
                const arrayBuffer = await response.arrayBuffer();

                // Create audio context and decode
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

                // Get the duration from the decoded audio buffer
                const duration = audioBuffer.duration;
                console.log('🎵 [VoicePlayer] Got duration from Web Audio API:', duration);

                if (isValidDuration(duration)) {
                    setDuration(duration);
                    setIsLoading(false);
                }

                // Clean up audio context
                await audioContext.close();
            } catch (err) {
                console.log('🎵 [VoicePlayer] Web Audio API failed, falling back to natural loading:', err);
                // Fallback to natural loading
                setIsLoading(false);
            }
        };

        // Run Web Audio API detection for all URLs (blob and regular)
        // Use a short delay to let natural loading try first, but always run as backup
        timeoutRef.current = setTimeout(getDurationFromAudio, isBlobUrl ? 100 : 200);

        return () => {
            clearTimeout(loadingTimeoutRef);
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            audio.removeEventListener('loadstart', handleLoadStart);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('durationchange', handleDurationChange);
            audio.removeEventListener('canplay', handleCanPlay);
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('error', handleError);
        };
    }, [mediaUrl, isBlobUrl, objectUrl]);

    if (error) {
        return (
            <div className={`${styles.voiceNotePlayer} ${styles.error} ${className}`}>
                <span className={styles.errorMessage}>🎵 Audio unavailable</span>
            </div>
        );
    }

    const playerClasses = [
        styles.voiceNotePlayer,
        className.includes('preview-player') ? styles.previewPlayer : '',
        className
    ].filter(Boolean).join(' ');

    return (
        <div className={playerClasses}>
            <audio ref={audioRef} preload="metadata">
                <source src={mediaUrl} type="audio/webm; codecs=opus" />
                <source src={mediaUrl} type="audio/webm" />
                <source src={mediaUrl} type="audio/mp4" />
                <source src={mediaUrl} type="audio/mpeg" />
                <source src={mediaUrl} type="audio/mp3" />
                <source src={mediaUrl} type="audio/ogg" />
                <source src={mediaUrl} type="audio/wav" />
                <source src={mediaUrl} type="audio/aac" />
                <source src={mediaUrl} type="audio/flac" />
                Your browser does not support the audio element.
            </audio>

            <div className={styles.voiceNoteControls}>
                {isLoading ? (
                    <div className={styles.loadingButton}>
                        <div className={styles.loadingSpinner}></div>
                    </div>
                ) : (
                    <button
                        onClick={togglePlayPause}
                        className={styles.playPauseButton}
                        title={isPlaying ? 'Pause' : 'Play'}
                    >
                        {isPlaying ? '⏸️' : '▶️'}
                    </button>
                )}

                <div className={styles.voiceNoteProgress}>
                    <input
                        type="range"
                        min="0"
                        max={duration > 0 ? duration : 1}
                        value={currentTime}
                        onChange={handleSeek}
                        className={styles.progressSlider}
                        disabled={isLoading || duration === 0}
                    />
                    <div className={styles.timeDisplay}>
                        <span className={styles.currentTime}>{formatTime(currentTime)}</span>
                        <span className={styles.duration}>{duration > 0 ? formatTime(duration) : '--:--'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VoiceNotePlayer; 
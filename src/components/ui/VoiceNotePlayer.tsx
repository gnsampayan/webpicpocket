import React, { useState, useRef, useEffect } from 'react';
import './VoiceNotePlayer.css';

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

    console.log('🎵 [VoicePlayer] Object URL (using directly):', objectUrl);
    console.log('🎵 [VoicePlayer] Is blob URL:', isBlobUrl);
    console.log('🎵 [VoicePlayer] Final media URL:', mediaUrl);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const isValidDuration = (dur: number): boolean => {
            return isFinite(dur) && !isNaN(dur) && dur > 0 && dur !== Infinity;
        };

        const handleLoadedMetadata = () => {
            const duration = audio.duration;
            console.log('🎵 [VoicePlayer] Duration loaded:', duration);
            if (isValidDuration(duration)) {
                console.log('🎵 [VoicePlayer] Setting valid duration from metadata:', duration);
                setDuration(duration);
                setIsLoading(false);
                setError(null);
            }
        };

        const handleCanPlay = () => {
            // Try to get duration when audio can play
            const duration = audio.duration;
            console.log('🎵 [VoicePlayer] Can play, duration:', duration);
            if (isValidDuration(duration)) {
                console.log('🎵 [VoicePlayer] Setting valid duration from canplay:', duration);
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
            console.log('🎵 [VoicePlayer] Duration changed event:', duration);
            if (isValidDuration(duration)) {
                console.log('🎵 [VoicePlayer] Setting valid duration from durationchange:', duration);
                setDuration(duration);
                setIsLoading(false);
            }
        };

        const handleTimeUpdate = () => {
            setCurrentTime(audio.currentTime);
            // Update duration if it wasn't available before
            const audioDuration = audio.duration;
            if (isValidDuration(audioDuration) && duration === 0) {
                console.log('🎵 [VoicePlayer] Setting valid duration from timeupdate:', audioDuration);
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
            if (isLoading) {
                console.log('🎵 [VoicePlayer] Loading timeout - clearing loading state');
                setIsLoading(false);
                setError('Audio took too long to load');
            }
        }, 5000); // 5 second timeout

        // For blob URLs, use Web Audio API to get duration properly
        if (isBlobUrl) {
            const getDurationFromBlob = async () => {
                try {
                    // Fetch the blob data
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
                    console.log('🎵 [VoicePlayer] Web Audio API failed:', err);
                    // Fallback to natural loading
                    setIsLoading(false);
                }
            };

            // Run after a short delay to let natural loading try first
            timeoutRef.current = setTimeout(getDurationFromBlob, 100);
        }

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
    }, [mediaUrl]);

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

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const audio = audioRef.current;
        if (!audio) return;

        const newTime = parseFloat(e.target.value);
        audio.currentTime = newTime;
        setCurrentTime(newTime);
    };

    const formatTime = (time: number): string => {
        if (!isFinite(time) || isNaN(time) || time < 0) {
            return '0:00';
        }
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    if (error) {
        return (
            <div className={`voice-note-player error ${className}`}>
                <span className="error-message">🎵 Audio unavailable</span>
            </div>
        );
    }

    return (
        <div className={`voice-note-player ${className}`}>
            <audio ref={audioRef} preload="metadata">
                <source src={mediaUrl} type="audio/webm; codecs=opus" />
                <source src={mediaUrl} type="audio/webm" />
                <source src={mediaUrl} type="audio/ogg" />
                Your browser does not support the audio element.
            </audio>

            <div className="voice-note-controls">
                {isLoading ? (
                    <div className="loading-button">
                        <div className="loading-spinner"></div>
                    </div>
                ) : (
                    <button
                        onClick={togglePlayPause}
                        className="play-pause-button"
                        title={isPlaying ? 'Pause' : 'Play'}
                    >
                        {isPlaying ? '⏸️' : '▶️'}
                    </button>
                )}

                <div className="voice-note-progress">
                    <input
                        type="range"
                        min="0"
                        max={duration > 0 ? duration : 1}
                        value={currentTime}
                        onChange={handleSeek}
                        className="progress-slider"
                        disabled={isLoading || duration === 0}
                    />
                    <div className="time-display">
                        <span className="current-time">{formatTime(currentTime)}</span>
                        <span className="duration">{duration > 0 ? formatTime(duration) : '--:--'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VoiceNotePlayer; 
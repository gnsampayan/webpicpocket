import React, { useState, useRef, useEffect } from 'react';
import { api } from '../../services/api';
import VoiceNotePlayer from './VoiceNotePlayer';
import styles from './VoiceNoteRecorder.module.css';

interface VoiceNoteRecorderProps {
    onVoiceNoteReady: (objectKey: string) => void;
    onCancel: () => void;
    isRecording: boolean;
    onRecordingChange: (recording: boolean) => void;
}

const VoiceNoteRecorder: React.FC<VoiceNoteRecorderProps> = ({
    onVoiceNoteReady,
    onCancel,
    isRecording,
    onRecordingChange
}) => {
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [recordingMimeType, setRecordingMimeType] = useState<string>('audio/webm');
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    // Request microphone access and set up recorder
    useEffect(() => {
        const setupRecorder = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

                // Check for supported MIME types
                let mimeType = 'audio/webm;codecs=opus';
                if (!MediaRecorder.isTypeSupported(mimeType)) {
                    mimeType = 'audio/webm';
                    if (!MediaRecorder.isTypeSupported(mimeType)) {
                        mimeType = 'audio/mp4';
                        if (!MediaRecorder.isTypeSupported(mimeType)) {
                            mimeType = ''; // Use default
                        }
                    }
                }

                const recorder = new MediaRecorder(stream, {
                    ...(mimeType && { mimeType })
                });

                // Store the actual MIME type being used
                setRecordingMimeType(mimeType || 'audio/webm');

                recorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        audioChunksRef.current.push(event.data);
                    }
                };

                recorder.onstop = () => {
                    // Stop all tracks to release microphone
                    stream.getTracks().forEach(track => track.stop());

                    // Process the recorded audio
                    handleRecordingComplete();
                };

                setMediaRecorder(recorder);
                setError(null);
            } catch (err) {
                console.error('❌ [VoiceRecorder] Failed to access microphone:', err);
                setError('Microphone access denied. Please allow microphone access and try again.');
            }
        };

        setupRecorder();

        return () => {
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
            }
            if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current);
            }
        };
    }, []);

    const startRecording = () => {
        if (!mediaRecorder) return;

        // Reset state
        audioChunksRef.current = [];
        setRecordingTime(0);
        setError(null);
        setRecordedAudioUrl(null);
        setRecordedBlob(null);
        setShowPreview(false);

        mediaRecorder.start(1000); // Collect data every second
        onRecordingChange(true);

        // Start timer
        recordingIntervalRef.current = setInterval(() => {
            setRecordingTime(prev => prev + 1);
        }, 1000);
    };

    const stopRecording = () => {
        if (!mediaRecorder || mediaRecorder.state !== 'recording') return;

        mediaRecorder.stop();
        onRecordingChange(false);

        if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
            recordingIntervalRef.current = null;
        }
    };

    const handleRecordingComplete = () => {

        if (audioChunksRef.current.length === 0) {
            console.error('❌ [VoiceRecorder] No audio chunks available');
            setError('No audio recorded. Please try again.');
            return;
        }

        try {
            // Create audio blob from chunks
            const audioBlob = new Blob(audioChunksRef.current, { type: recordingMimeType });

            if (audioBlob.size === 0) {
                setError('Recording failed. Please try again.');
                return;
            }

            // Create preview URL
            const previewUrl = URL.createObjectURL(audioBlob);
            setRecordedAudioUrl(previewUrl);
            setRecordedBlob(audioBlob);
            setShowPreview(true);

        } catch (err) {
            console.error('❌ [VoiceRecorder] Failed to create preview:', err);
            setError('Failed to create audio preview');
        }
    };

    const handlePostVoiceNote = async () => {
        if (!recordedBlob) {
            console.error('❌ [VoiceRecorder] No recorded blob available');
            setError('No recording available to upload');
            return;
        }

        setIsUploading(true);
        setError(null);

        try {
            // Determine correct file extension based on MIME type
            const getFileExtension = (mimeType: string): string => {
                if (mimeType.includes('audio/webm')) return 'webm';
                if (mimeType.includes('audio/mp4')) return 'm4a';
                if (mimeType.includes('audio/wav')) return 'wav';
                if (mimeType.includes('audio/ogg')) return 'ogg';
                if (mimeType.includes('audio/mpeg')) return 'mp3';
                if (mimeType.includes('audio/mp3')) return 'mp3';
                if (mimeType.includes('audio/wma')) return 'wma';
                if (mimeType.includes('audio/flac')) return 'flac';
                if (mimeType.includes('audio/aac')) return 'aac';
                if (mimeType.includes('audio/ape')) return 'ape';
                if (mimeType.includes('audio/opus')) return 'opus';
                return 'webm'; // default fallback
            };

            const fileExtension = getFileExtension(recordingMimeType);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5); // Format: 2024-01-15T10-30-45
            const fileName = `voice-note-${timestamp}.${fileExtension}`;

            console.log('🎵 [VoiceRecorder] Creating file:', fileName, 'with type:', recordingMimeType);

            // Convert to File object
            const audioFile = new File([recordedBlob], fileName, {
                type: recordingMimeType
            });


            // Upload to S3
            const uploadResponse = await api.uploadMedia({
                files: [audioFile.name]
            });


            if (!uploadResponse.uploads || uploadResponse.uploads.length === 0) {
                throw new Error('No upload URLs received');
            }

            const upload = uploadResponse.uploads[0];

            // Upload file to S3
            await api.uploadFileToS3(upload.upload_url, audioFile);

            // Notify parent with object key
            onVoiceNoteReady(upload.object_key);
        } catch (err) {
            console.error('❌ [VoiceRecorder] Failed to upload voice note:', err);
            setError(`Failed to upload voice note: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setIsUploading(false);
        }
    };

    const handleRetryRecording = async () => {

        // Clean up current recording
        if (recordedAudioUrl) {
            URL.revokeObjectURL(recordedAudioUrl);
        }

        // Clear any existing timer
        if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
            recordingIntervalRef.current = null;
        }

        // Reset all state
        setRecordedAudioUrl(null);
        setRecordedBlob(null);
        setShowPreview(false);
        audioChunksRef.current = [];
        setRecordingTime(0);
        setError(null);

        // Reinitialize MediaRecorder to ensure it's fresh and ready
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Check for supported MIME types
            let mimeType = 'audio/webm;codecs=opus';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'audio/webm';
                if (!MediaRecorder.isTypeSupported(mimeType)) {
                    mimeType = 'audio/mp4';
                    if (!MediaRecorder.isTypeSupported(mimeType)) {
                        mimeType = ''; // Use default
                    }
                }
            }

            const recorder = new MediaRecorder(stream, {
                ...(mimeType && { mimeType })
            });

            // Store the actual MIME type being used
            setRecordingMimeType(mimeType || 'audio/webm');

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            recorder.onstop = () => {
                // Stop all tracks to release microphone
                stream.getTracks().forEach(track => track.stop());

                // Process the recorded audio
                handleRecordingComplete();
            };

            setMediaRecorder(recorder);
        } catch (err) {
            console.error('❌ [VoiceRecorder] Failed to reinitialize MediaRecorder:', err);
            setError('Failed to access microphone. Please try again.');
        }
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleCancel = () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }
        if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
        }
        if (recordedAudioUrl) {
            URL.revokeObjectURL(recordedAudioUrl);
        }
        onCancel();
    };

    return (
        <div className={styles.voiceNoteRecorder}>
            {error && (
                <div className={styles.voiceNoteError}>
                    {error}
                </div>
            )}

            {!showPreview ? (
                <div className={styles.voiceNoteControls}>
                    {!isRecording ? (
                        <button
                            onClick={startRecording}
                            disabled={!mediaRecorder || isUploading}
                            className={styles.voiceNoteRecordButton}
                            title="Start recording"
                        >
                            🎤 Start Recording
                        </button>
                    ) : (
                        <div className={styles.voiceNoteRecording}>
                            <div className={styles.recordingIndicator}>
                                <div className={styles.recordingDot}></div>
                                Recording... {formatTime(recordingTime)}
                            </div>
                            <button
                                onClick={stopRecording}
                                className={styles.voiceNoteStopButton}
                                title="Stop recording"
                            >
                                ⏹️ Stop
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className={styles.voiceNotePreview}>
                    <h4>Preview Voice Note</h4>
                    {recordedAudioUrl && (
                        <VoiceNotePlayer
                            objectUrl={recordedAudioUrl}
                            className="preview-player"
                        />
                    )}
                    <div className={styles.previewActions}>
                        <button
                            onClick={handleRetryRecording}
                            disabled={isUploading}
                            className={styles.retryButton}
                        >
                            🔄 Record Again
                        </button>
                        <button
                            onClick={handlePostVoiceNote}
                            disabled={isUploading}
                            className={styles.postVoiceNoteButton}
                        >
                            {isUploading ? (
                                <>
                                    <div className={styles.uploadingSpinner}></div>
                                    Posting...
                                </>
                            ) : (
                                '📤 Post Voice Note'
                            )}
                        </button>
                    </div>
                </div>
            )}

            <div className={styles.voiceNoteActions}>
                <button
                    onClick={handleCancel}
                    disabled={isRecording || isUploading}
                    className={styles.voiceNoteCancelButton}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default VoiceNoteRecorder; 
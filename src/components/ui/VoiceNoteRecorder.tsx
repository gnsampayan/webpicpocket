import React, { useState, useRef, useEffect } from 'react';
import { api } from '../../services/api';
import VoiceNotePlayer from './VoiceNotePlayer';
import './VoiceNoteRecorder.css';

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

                console.log('🎤 [VoiceRecorder] Using MIME type:', mimeType || 'default');

                const recorder = new MediaRecorder(stream, {
                    ...(mimeType && { mimeType })
                });

                // Store the actual MIME type being used
                setRecordingMimeType(mimeType || 'audio/webm');

                recorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        console.log('📦 [VoiceRecorder] Audio chunk received:', event.data.size, 'bytes');
                        audioChunksRef.current.push(event.data);
                    }
                };

                recorder.onstop = () => {
                    console.log('⏹️ [VoiceRecorder] Recording stopped, chunks:', audioChunksRef.current.length);
                    // Stop all tracks to release microphone
                    stream.getTracks().forEach(track => track.stop());

                    // Process the recorded audio
                    handleRecordingComplete();
                };

                setMediaRecorder(recorder);
                setError(null);
                console.log('🎤 [VoiceRecorder] MediaRecorder setup complete');
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

        console.log('🎤 [VoiceRecorder] Starting recording...');
        mediaRecorder.start(1000); // Collect data every second
        onRecordingChange(true);

        // Start timer
        recordingIntervalRef.current = setInterval(() => {
            setRecordingTime(prev => prev + 1);
        }, 1000);
    };

    const stopRecording = () => {
        if (!mediaRecorder || mediaRecorder.state !== 'recording') return;

        console.log('⏹️ [VoiceRecorder] Stopping recording...');
        mediaRecorder.stop();
        onRecordingChange(false);

        if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
            recordingIntervalRef.current = null;
        }
    };

    const handleRecordingComplete = () => {
        console.log('🔄 [VoiceRecorder] Processing recording, chunks:', audioChunksRef.current.length);

        if (audioChunksRef.current.length === 0) {
            console.error('❌ [VoiceRecorder] No audio chunks available');
            setError('No audio recorded. Please try again.');
            return;
        }

        try {
            // Create audio blob from chunks
            const audioBlob = new Blob(audioChunksRef.current, { type: recordingMimeType });
            console.log('📦 [VoiceRecorder] Created blob:', audioBlob.size, 'bytes');

            if (audioBlob.size === 0) {
                setError('Recording failed. Please try again.');
                return;
            }

            // Create preview URL
            const previewUrl = URL.createObjectURL(audioBlob);
            setRecordedAudioUrl(previewUrl);
            setRecordedBlob(audioBlob);
            setShowPreview(true);

            console.log('✅ [VoiceRecorder] Preview ready:', previewUrl);
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
            console.log('🚀 [VoiceRecorder] Starting upload, blob size:', recordedBlob.size);

            // Convert to File object
            const audioFile = new File([recordedBlob], 'voice-note.webm', {
                type: recordingMimeType
            });

            console.log('📁 [VoiceRecorder] Created file:', audioFile.name, audioFile.size, 'bytes');

            // Upload to S3
            const uploadResponse = await api.uploadMedia({
                files: [audioFile.name]
            });

            console.log('📤 [VoiceRecorder] Upload response:', uploadResponse);

            if (!uploadResponse.uploads || uploadResponse.uploads.length === 0) {
                throw new Error('No upload URLs received');
            }

            const upload = uploadResponse.uploads[0];
            console.log('🔗 [VoiceRecorder] Upload URL received:', upload.object_key);

            // Upload file to S3
            await api.uploadFileToS3(upload.upload_url, audioFile);
            console.log('✅ [VoiceRecorder] File uploaded to S3 successfully');

            // Notify parent with object key
            onVoiceNoteReady(upload.object_key);
        } catch (err) {
            console.error('❌ [VoiceRecorder] Failed to upload voice note:', err);
            setError(`Failed to upload voice note: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setIsUploading(false);
        }
    };

    const handleRetryRecording = () => {
        // Clean up current recording
        if (recordedAudioUrl) {
            URL.revokeObjectURL(recordedAudioUrl);
        }
        setRecordedAudioUrl(null);
        setRecordedBlob(null);
        setShowPreview(false);
        audioChunksRef.current = [];
        setRecordingTime(0);
        setError(null);

        // Immediately start a new recording
        if (mediaRecorder) {
            console.log('🎤 [VoiceRecorder] Starting new recording from retry...');
            mediaRecorder.start(1000);
            onRecordingChange(true);

            // Start timer
            recordingIntervalRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
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
        <div className="voice-note-recorder">
            {error && (
                <div className="voice-note-error">
                    {error}
                </div>
            )}

            {!showPreview ? (
                <div className="voice-note-controls">
                    {!isRecording ? (
                        <button
                            onClick={startRecording}
                            disabled={!mediaRecorder || isUploading}
                            className="voice-note-record-button"
                            title="Start recording"
                        >
                            🎤 Start Recording
                        </button>
                    ) : (
                        <div className="voice-note-recording">
                            <div className="recording-indicator">
                                <div className="recording-dot"></div>
                                Recording... {formatTime(recordingTime)}
                            </div>
                            <button
                                onClick={stopRecording}
                                className="voice-note-stop-button"
                                title="Stop recording"
                            >
                                ⏹️ Stop
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="voice-note-preview">
                    <h4>Preview Voice Note</h4>
                    {recordedAudioUrl && (
                        <VoiceNotePlayer
                            objectUrl={recordedAudioUrl}
                            className="preview-player"
                        />
                    )}
                    <div className="preview-actions">
                        <button
                            onClick={handleRetryRecording}
                            disabled={isUploading}
                            className="retry-button"
                        >
                            🔄 Record Again
                        </button>
                        <button
                            onClick={handlePostVoiceNote}
                            disabled={isUploading}
                            className="post-voice-note-button"
                        >
                            {isUploading ? (
                                <>
                                    <div className="uploading-spinner"></div>
                                    Posting...
                                </>
                            ) : (
                                '📤 Post Voice Note'
                            )}
                        </button>
                    </div>
                </div>
            )}

            <div className="voice-note-actions">
                <button
                    onClick={handleCancel}
                    disabled={isRecording || isUploading}
                    className="voice-note-cancel-button"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default VoiceNoteRecorder; 
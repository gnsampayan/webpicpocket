import React, { useState, useRef } from 'react';
import { useClaimPhotosToEventMutation, useClaimVideosToEventMutation, useMultipleFileUpload, type UploadFile } from '../../hooks/useMedia';
import './AddMediaModal.css';

interface AddMediaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onMediaAdded?: () => void;
    eventId: string;
    eventTitle?: string;
}

const AddMediaModal: React.FC<AddMediaModalProps> = ({
    isOpen,
    onClose,
    onMediaAdded,
    eventId,
    eventTitle
}) => {
    const [selectedFiles, setSelectedFiles] = useState<UploadFile[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Use shared upload hooks
    const { uploadFile } = useMultipleFileUpload();
    const claimPhotosMutation = useClaimPhotosToEventMutation();
    const claimVideosMutation = useClaimVideosToEventMutation();

    // Note: Metadata extraction is now handled by the useAddMediaMutation hook
    // which uses our comprehensive metadata extraction utility

    // Update file progress
    const updateFileProgress = (fileId: string, progress: Partial<UploadFile>) => {
        setSelectedFiles(prev => prev.map(f =>
            f.id === fileId ? { ...f, ...progress } : f
        ));
    };

    // Handle file selection
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        e.stopPropagation();

        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        console.log(`📁 [AddMediaModal] Selected ${files.length} files for upload`);

        // Filter for image and video files
        const mediaFiles = files.filter(file =>
            file.type.startsWith('image/') || file.type.startsWith('video/')
        );

        if (mediaFiles.length === 0) {
            setError('Please select image or video files only.');
            return;
        }

        const newFiles: UploadFile[] = mediaFiles.map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            file,
            preview: URL.createObjectURL(file),
            uploading: false,
            uploadProgress: 0
        }));

        setSelectedFiles(prev => [...prev, ...newFiles]);
        setError(null);

        // Clear the input for future selections
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }

        // Immediately upload each new file to S3
        for (const file of newFiles) {
            uploadFile(file, updateFileProgress);
        }
    };

    // Drag and drop handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;

        // Filter for image and video files
        const mediaFiles = files.filter(file =>
            file.type.startsWith('image/') || file.type.startsWith('video/')
        );
        if (mediaFiles.length === 0) {
            setError('Please select image or video files only.');
            return;
        }

        console.log(`📁 [AddMediaModal] Dropped ${mediaFiles.length} files for upload`);

        const newFiles: UploadFile[] = mediaFiles.map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            file,
            preview: URL.createObjectURL(file),
            uploading: false,
            uploadProgress: 0
        }));

        setSelectedFiles(prev => [...prev, ...newFiles]);
        setError(null);

        // Immediately upload each new file to S3
        for (const file of newFiles) {
            uploadFile(file, updateFileProgress);
        }
    };

    // Remove a file from the selection
    const handleRemoveFile = (fileId: string) => {
        setSelectedFiles(prev => {
            const fileToRemove = prev.find(f => f.id === fileId);
            if (fileToRemove?.preview) {
                URL.revokeObjectURL(fileToRemove.preview);
            }
            // Note: We don't delete from S3 here since the backend will only use
            // the object keys that are included in the add_photos array
            return prev.filter(f => f.id !== fileId);
        });
    };

    // Submit media to event
    const handleSubmit = async () => {
        if (selectedFiles.length === 0) {
            setError('Please select at least one photo or video');
            return;
        }

        // Check if all files have object keys
        const filesWithoutObjectKeys = selectedFiles.filter(f => !f.objectKey);
        if (filesWithoutObjectKeys.length > 0) {
            setError('Please wait for all files to finish uploading');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            // Separate photos and videos
            const photos = selectedFiles.filter(file =>
                file.objectKey && file.file.type.startsWith('image/')
            );
            const videos = selectedFiles.filter(file =>
                file.objectKey && file.file.type.startsWith('video/')
            );

            console.log('🔄 [AddMediaModal] Claiming media to event');
            console.log('🔄 [AddMediaModal] Photos:', photos.length, 'Videos:', videos.length);

            // Claim photos if any
            if (photos.length > 0) {
                const photoData = photos.map(file => ({
                    objectKey: file.objectKey!,
                    file: file.file
                }));

                await claimPhotosMutation.mutateAsync({
                    eventId,
                    photoData
                });

                console.log('✅ [AddMediaModal] Photos claimed successfully to event');
            }

            // Claim videos if any
            if (videos.length > 0) {
                const videoData = videos.map(file => ({
                    objectKey: file.objectKey!,
                    file: file.file
                }));

                await claimVideosMutation.mutateAsync({
                    eventId,
                    videoData
                });

                console.log('✅ [AddMediaModal] Videos claimed successfully to event');
            }

            // Call the callback to trigger a refetch of event data
            onMediaAdded?.();

            // Close modal and reset state
            handleClose();
        } catch (err) {
            console.error('❌ [AddMediaModal] Failed to claim media:', err);
            setError(err instanceof Error ? err.message : 'Failed to add media to event');
        } finally {
            setSubmitting(false);
        }
    };

    // Handle modal close
    const handleClose = () => {
        // Clean up object URLs
        selectedFiles.forEach(file => {
            if (file.preview) {
                URL.revokeObjectURL(file.preview);
            }
        });

        setSelectedFiles([]);
        setSubmitting(false);
        setError(null);
        setIsDragOver(false);
        onClose();
    };

    // Handle modal overlay click
    const handleModalOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    // Helper function to check if file is a video
    const isVideoFile = (file: File): boolean => {
        return file.type.startsWith('video/');
    };

    // Helper function to format file size
    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    // Get files that are ready to submit (have object keys)
    const readyFiles = selectedFiles.filter(f => f.objectKey);
    const uploadingFiles = selectedFiles.filter(f => f.uploading);
    const errorFiles = selectedFiles.filter(f => f.uploadError);
    const hasUploadingFiles = uploadingFiles.length > 0;

    if (!isOpen) return null;

    return (
        <div className="add-media-modal-overlay" onClick={handleModalOverlayClick}>
            <div className="add-media-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>
                        {eventTitle ? `Add Media to "${eventTitle}"` : 'Add Media to Event'}
                    </h2>
                    <button onClick={handleClose} className="close-button" disabled={submitting}>
                        ✕
                    </button>
                </div>

                <div className="modal-body">
                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    {/* File Selection and Display */}
                    <div className="file-selection-section">
                        <div
                            className={`file-drop-zone ${isDragOver ? 'drag-over' : ''} ${selectedFiles.length > 0 ? 'has-files' : ''}`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={(e) => {
                                // Only trigger file input if no files are selected and click is not on a button
                                if (selectedFiles.length === 0 && !(e.target as HTMLElement).closest('button')) {
                                    fileInputRef.current?.click();
                                }
                            }}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept="image/*,video/*"
                                onChange={handleFileSelect}
                                style={{ display: 'none' }}
                            />

                            {selectedFiles.length === 0 ? (
                                isDragOver ? (
                                    <>
                                        <div className="drag-over-icon">📁</div>
                                        <h3>Drop your media here</h3>
                                        <p>Release to upload your photos and videos to this event.</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="upload-icon">📷🎥</div>
                                        <h3>Add Media to Event</h3>
                                        <p>Start capturing memories by adding your first photos and videos!</p>
                                        <div
                                            className="empty-state-cta"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                fileInputRef.current?.click();
                                            }}
                                        >
                                            <div className="cta-content">
                                                <div className="cta-icon">✨</div>
                                                <div className="cta-text">
                                                    <span className="cta-title">Select Media</span>
                                                    <span className="cta-subtitle">Click here or drag and drop</span>
                                                </div>
                                            </div>
                                            <div className="cta-arrow">→</div>
                                        </div>
                                    </>
                                )
                            ) : (
                                <div className="selected-files-container">
                                    <div className="files-header">
                                        <div className="files-header-content">
                                            <h3>Selected Media ({selectedFiles.length})</h3>
                                            <p>You can still drag and drop more photos and videos here</p>
                                        </div>
                                        <button
                                            className="clear-all-button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedFiles([]);
                                            }}
                                            disabled={submitting}
                                        >
                                            Clear All
                                        </button>
                                    </div>
                                    <div className="files-grid">
                                        {selectedFiles.map((file) => (
                                            <div key={file.id} className="file-item">
                                                <div className="file-preview">
                                                    {isVideoFile(file.file) ? (
                                                        <div className="video-preview">
                                                            <div className="video-icon">🎥</div>
                                                            <span className="video-label">Video</span>
                                                        </div>
                                                    ) : (
                                                        <img src={file.preview} alt="Preview" />
                                                    )}
                                                    <button
                                                        className="remove-file-button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRemoveFile(file.id);
                                                        }}
                                                        disabled={file.uploading || submitting}
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                                <div className="file-info">
                                                    <span className="file-name">{file.file.name}</span>
                                                    <span className="file-size">
                                                        {formatFileSize(file.file.size)}
                                                        {isVideoFile(file.file) && ' • Video'}
                                                    </span>
                                                </div>
                                                <div className="file-status">
                                                    {file.uploading && (
                                                        <div className="upload-status">
                                                            <div className="upload-spinner"></div>
                                                            <span>Uploading...</span>
                                                        </div>
                                                    )}
                                                    {file.objectKey && (
                                                        <div className="upload-success">
                                                            <span>✅ Uploaded</span>
                                                        </div>
                                                    )}
                                                    {file.uploadError && (
                                                        <div className="upload-error">
                                                            <span>❌ {file.uploadError}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Upload Progress Summary */}
                    {hasUploadingFiles && (
                        <div className="upload-summary">
                            <div className="upload-progress-bar">
                                <div
                                    className="progress-fill"
                                    style={{
                                        width: `${(readyFiles.length / selectedFiles.length) * 100}%`
                                    }}
                                ></div>
                            </div>
                            <span>
                                {readyFiles.length} of {selectedFiles.length} files uploaded
                                {uploadingFiles.length > 0 && ` (${uploadingFiles.length} uploading...)`}
                            </span>
                        </div>
                    )}

                    {/* Error Summary */}
                    {errorFiles.length > 0 && (
                        <div className="error-summary">
                            <span>❌ {errorFiles.length} file(s) failed to upload</span>
                        </div>
                    )}
                </div>

                <div className="modal-actions">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="cancel-button"
                        disabled={submitting}
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleSubmit}
                        className="submit-button"
                        disabled={
                            submitting ||
                            claimPhotosMutation.isPending ||
                            claimVideosMutation.isPending ||
                            hasUploadingFiles ||
                            selectedFiles.length === 0 ||
                            readyFiles.length !== selectedFiles.length
                        }
                    >
                        {submitting || claimPhotosMutation.isPending || claimVideosMutation.isPending ? 'Adding to Event...' : 'Add to Event'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddMediaModal; 
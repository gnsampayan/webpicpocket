import React, { useState, useRef } from 'react';
import { api } from '../../services/api';
import { useAddMediaMutation } from '../../hooks/usePhotos';
import './AddMediaModal.css';

interface AddMediaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onMediaAdded: () => void;
    eventId: string;
    eventTitle?: string;
}

interface SelectedFile {
    id: string;
    file: File;
    preview: string;
    objectKey?: string;
    uploading: boolean;
    uploadProgress: number;
    uploadError?: string;
}

const AddMediaModal: React.FC<AddMediaModalProps> = ({
    isOpen,
    onClose,
    onMediaAdded,
    eventId,
    eventTitle
}) => {
    const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // React Query mutation hook
    const addMediaMutation = useAddMediaMutation();

    // Note: Metadata extraction is now handled by the useAddMediaMutation hook
    // which uses our comprehensive metadata extraction utility

    // Handle file selection
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // Note: Metadata extraction is handled during submission by useAddMediaMutation hook
        console.log(`📁 [AddMediaModal] Selected ${files.length} files for upload`);

        const newFiles: SelectedFile[] = files.map(file => ({
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
            uploadFileToS3(file);
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
            // the object keys that are included in the add_media array
            return prev.filter(f => f.id !== fileId);
        });
    };

    // Upload a single file to S3
    const uploadFileToS3 = async (selectedFile: SelectedFile): Promise<string> => {
        try {
            // Update file to uploading state
            setSelectedFiles(prev => prev.map(f =>
                f.id === selectedFile.id
                    ? { ...f, uploading: true, uploadProgress: 0 }
                    : f
            ));

            // Step 1: Get upload URL
            const uploadResponse = await api.uploadMedia({
                files: [selectedFile.file.name],
            });

            if (!uploadResponse.uploads || uploadResponse.uploads.length === 0) {
                throw new Error('No upload URLs received');
            }

            const upload = uploadResponse.uploads[0];

            // Step 2: Upload to S3
            await api.uploadFileToS3(upload.upload_url, selectedFile.file);

            // Update file with object key and mark as complete
            setSelectedFiles(prev => prev.map(f =>
                f.id === selectedFile.id
                    ? {
                        ...f,
                        objectKey: upload.object_key,
                        uploading: false,
                        uploadProgress: 100
                    }
                    : f
            ));

            return upload.object_key;
        } catch (err) {
            console.error('❌ [AddMediaModal] Failed to upload file:', err);

            // Update file with error
            setSelectedFiles(prev => prev.map(f =>
                f.id === selectedFile.id
                    ? {
                        ...f,
                        uploading: false,
                        uploadError: err instanceof Error ? err.message : 'Upload failed'
                    }
                    : f
            ));

            throw err;
        }
    };



    // Submit media to event
    const handleSubmit = async () => {
        if (selectedFiles.length === 0) {
            setError('Please select at least one photo');
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
            console.log('🔄 [AddMediaModal] Adding media to event');

            // Get the actual File objects from selected files
            const mediaFiles = selectedFiles
                .filter(file => file.objectKey) // Only include files that have been uploaded
                .map(file => file.file);

            console.log('🔄 [AddMediaModal] Selected files:', selectedFiles.length);
            console.log('🔄 [AddMediaModal] Files with object keys:', selectedFiles.filter(f => f.objectKey).length);
            console.log('🔄 [AddMediaModal] Media files to upload:', mediaFiles.length);

            // Use the React Query mutation
            await addMediaMutation.mutateAsync({
                eventId,
                mediaFiles
            });

            console.log('✅ [AddMediaModal] Media added successfully to backend');

            // Call the callback to trigger a refetch of event data
            onMediaAdded();

            // Close modal and reset state
            handleClose();
        } catch (err) {
            console.error('❌ [AddMediaModal] Failed to add media:', err);
            console.error('❌ [AddMediaModal] Error details:', {
                message: err instanceof Error ? err.message : 'Unknown error',
                stack: err instanceof Error ? err.stack : undefined
            });
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
        setUploading(false);
        setSubmitting(false);
        setError(null);
        onClose();
    };

    // Handle modal overlay click
    const handleModalOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
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
                        {eventTitle ? `Add Photos to "${eventTitle}"` : 'Add Photos to Event'}
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

                    {/* File Selection */}
                    <div className="file-selection-section">
                        <div className="file-input-container">
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleFileSelect}
                                style={{ display: 'none' }}
                            />
                            <button
                                className="select-files-button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading || submitting}
                            >
                                <span>📷</span>
                                Select Photos
                            </button>
                        </div>
                    </div>

                    {/* Selected Files List */}
                    {selectedFiles.length > 0 && (
                        <div className="selected-files-section">
                            <h3>Selected Photos ({selectedFiles.length})</h3>
                            <div className="files-grid">
                                {selectedFiles.map((file) => (
                                    <div key={file.id} className="file-item">
                                        <div className="file-preview">
                                            <img src={file.preview} alt="Preview" />
                                            <button
                                                className="remove-file-button"
                                                onClick={() => handleRemoveFile(file.id)}
                                                disabled={file.uploading || submitting}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                        <div className="file-info">
                                            <span className="file-name">{file.file.name}</span>
                                            <span className="file-size">
                                                {(file.file.size / 1024 / 1024).toFixed(1)} MB
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
                            addMediaMutation.isPending ||
                            hasUploadingFiles ||
                            selectedFiles.length === 0 ||
                            readyFiles.length !== selectedFiles.length
                        }
                    >
                        {submitting || addMediaMutation.isPending ? 'Adding to Event...' : 'Add to Event'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddMediaModal; 
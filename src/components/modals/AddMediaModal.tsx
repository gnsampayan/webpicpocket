import React, { useState, useRef } from 'react';
import { api } from '../../services/api';
import './AddMediaModal.css';

interface AddMediaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onMediaAdded: () => void;
    eventId: string;
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
    eventId
}) => {
    const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Helper function to extract EXIF data from image files
    const extractImageMetadata = (file: File): Promise<any> => {
        return new Promise((resolve) => {
            if (!file.type.startsWith('image/')) {
                resolve(null);
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    // Basic image metadata
                    const basicMetadata = {
                        width: img.naturalWidth,
                        height: img.naturalHeight,
                        aspectRatio: img.naturalWidth / img.naturalHeight,
                        orientation: img.naturalWidth > img.naturalHeight ? 'landscape' : 'portrait'
                    };

                    // Try to extract EXIF data using a library or manual parsing
                    // For now, we'll use a simple approach to detect if EXIF might be present
                    const arrayBuffer = e.target?.result as ArrayBuffer;
                    const uint8Array = new Uint8Array(arrayBuffer);

                    // Check for EXIF header (JPEG files)
                    let exifData = null;
                    if (file.type === 'image/jpeg') {
                        // Look for EXIF marker (0xFFE1)
                        for (let i = 0; i < uint8Array.length - 1; i++) {
                            if (uint8Array[i] === 0xFF && uint8Array[i + 1] === 0xE1) {
                                exifData = { hasExif: true, position: i };
                                break;
                            }
                        }
                    }

                    resolve({
                        ...basicMetadata,
                        exifData
                    });
                };
                img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        });
    };

    // Handle file selection
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        //TODO: Hook this up to the backend.
        // Extract and log metadata for each file
        for (let index = 0; index < files.length; index++) {
            const file = files[index];

            // Basic file metadata
            const basicMetadata = {
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified,
                lastModifiedDate: new Date(file.lastModified).toISOString(),
                // Additional properties that might be available
                webkitRelativePath: (file as any).webkitRelativePath || null,
                // File extension
                extension: file.name.split('.').pop()?.toLowerCase() || null,
                // Size in different units
                sizeKB: Math.round(file.size / 1024),
                sizeMB: Math.round((file.size / 1024 / 1024) * 100) / 100
            };

            // Extract image-specific metadata
            const imageMetadata = await extractImageMetadata(file);

            // Combine all metadata
            const fullMetadata = {
                ...basicMetadata,
                ...imageMetadata,
                // Additional computed properties
                isImage: file.type.startsWith('image/'),
                isVideo: file.type.startsWith('video/'),
                fileCategory: file.type.split('/')[0] || 'unknown',
                // File age (approximate)
                fileAge: Date.now() - file.lastModified,
                fileAgeDays: Math.floor((Date.now() - file.lastModified) / (1000 * 60 * 60 * 24))
            };

            console.log(`📁 [AddMediaModal] File ${index + 1} metadata:`, fullMetadata);
        }

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

            // Prepare the add_media array - only include files that have been uploaded and are still selected
            const addMedia = selectedFiles
                .filter(file => file.objectKey) // Only include files that have been uploaded
                .map(file => ({
                    media_type: 'photo' as const, // For now, only photos are supported
                    object_key: file.objectKey!
                }));

            console.log('🔄 [AddMediaModal] Selected files:', selectedFiles.length);
            console.log('🔄 [AddMediaModal] Files with object keys:', selectedFiles.filter(f => f.objectKey).length);
            console.log('🔄 [AddMediaModal] Add media array:', addMedia);

            // Make the API call to add media to event using the existing uploadPhotosToEvent method
            const addPhotoRequest = {
                add_photos: addMedia.map(media => ({
                    object_key: media.object_key,
                    metadata: null
                }))
            };

            await api.uploadPhotosToEvent(eventId, addPhotoRequest);
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
                    <h2>Add Photos to Event</h2>
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
                            hasUploadingFiles ||
                            selectedFiles.length === 0 ||
                            readyFiles.length !== selectedFiles.length
                        }
                    >
                        {submitting ? 'Adding to Event...' : 'Add to Event'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddMediaModal; 
import React, { useState, useRef, useEffect } from 'react';
import styles from './EditPlaceholderModal.module.css';
import { api } from '../../services/api';
import { useUpdatePlaceholderMutation } from '../../hooks/useContacts';
import * as ApiTypes from '../../types/api';

interface EditPlaceholderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPlaceholderUpdated: () => void;
    placeholder: ApiTypes.PlaceholderContact | null;
}

interface PlaceholderFormData {
    first_name: string;
    last_name: string;
    description: string;
    profile_object_key?: string;
}

const EditPlaceholderModal: React.FC<EditPlaceholderModalProps> = ({
    isOpen,
    onClose,
    onPlaceholderUpdated,
    placeholder
}) => {
    const [formData, setFormData] = useState<PlaceholderFormData>({
        first_name: '',
        last_name: '',
        description: ''
    });
    const [error, setError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Use the mutation hook for updating placeholders
    const updatePlaceholderMutation = useUpdatePlaceholderMutation();

    // Initialize form data when placeholder changes
    useEffect(() => {
        if (placeholder) {
            setFormData({
                first_name: placeholder.first_name || '',
                last_name: placeholder.last_name || '',
                description: placeholder.description || '',
                profile_object_key: placeholder.profile_object_key
            });
            setError(null);
        }
    }, [placeholder]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file size (10MB limit for profile pictures)
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > 10) {
            setError('Profile picture size must be less than 10MB');
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Profile picture must be an image file');
            return;
        }

        // Create preview URL
        const previewUrl = URL.createObjectURL(file);
        setSelectedFile(file);
        setPreviewUrl(previewUrl);
        setError(null);

        try {
            setIsUploading(true);

            // Get upload URL
            const uploadResponse = await api.uploadMedia({
                files: [file.name]
            });

            // Upload file to S3
            await api.uploadFileToS3(uploadResponse.uploads[0].upload_url, file);

            // Update form data with the object key
            setFormData(prev => ({
                ...prev,
                profile_object_key: uploadResponse.uploads[0].object_key
            }));

            setError(null);
        } catch (error) {
            console.error('Error uploading profile picture:', error);
            setError('Failed to upload profile picture. Please try again.');
            // Clean up preview on error
            setSelectedFile(null);
            setPreviewUrl(null);
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!placeholder) {
            setError('No placeholder selected for editing');
            return;
        }

        if (!formData.first_name.trim() || !formData.last_name.trim()) {
            setError('First name and last name are required');
            return;
        }

        if (formData.first_name.length > 50 || formData.last_name.length > 50) {
            setError('First name and last name must be 50 characters or less');
            return;
        }

        if (formData.description.length > 200) {
            setError('Description must be 200 characters or less');
            return;
        }

        try {
            setError(null);

            // Prepare update data - only include fields that have changed
            const updateData: {
                first_name?: string;
                last_name?: string;
                description?: string;
                profile_object_key?: string;
            } = {
                first_name: formData.first_name.trim(),
                last_name: formData.last_name.trim(),
            };

            // Only include description if it's not empty
            if (formData.description.trim()) {
                updateData.description = formData.description.trim();
            }

            // Only include profile_object_key if it has changed from the original
            if (formData.profile_object_key !== placeholder.profile_object_key) {
                updateData.profile_object_key = formData.profile_object_key;
            }

            // Update placeholder using the mutation
            await updatePlaceholderMutation.mutateAsync({
                placeholderId: placeholder.id,
                data: updateData
            });

            // Close modal and refresh contacts
            onPlaceholderUpdated();
            onClose();
        } catch (error) {
            console.error('Error updating placeholder:', error);
            setError(error instanceof Error ? error.message : 'Failed to update placeholder');
        }
    };

    const handleRemoveFile = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        setFormData(prev => ({
            ...prev,
            profile_object_key: undefined
        }));
        setError(null);
    };

    const handleClose = () => {
        if (!updatePlaceholderMutation.isPending) {
            setError(null);
            onClose();
        }
    };

    if (!isOpen || !placeholder) return null;

    return (
        <div className={styles.modalOverlay} onClick={handleClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h3>Edit Placeholder Contact</h3>
                    <button
                        className={styles.closeButton}
                        onClick={handleClose}
                        disabled={updatePlaceholderMutation.isPending}
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formSection}>
                        <label htmlFor="first_name">First Name *</label>
                        <input
                            type="text"
                            id="first_name"
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleInputChange}
                            placeholder="Enter first name"
                            maxLength={50}
                            required
                            disabled={updatePlaceholderMutation.isPending}
                        />
                    </div>

                    <div className={styles.formSection}>
                        <label htmlFor="last_name">Last Name *</label>
                        <input
                            type="text"
                            id="last_name"
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleInputChange}
                            placeholder="Enter last name"
                            maxLength={50}
                            required
                            disabled={updatePlaceholderMutation.isPending}
                        />
                    </div>

                    <div className={styles.formSection}>
                        <label htmlFor="description">Description (Optional)</label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            placeholder="Enter description (max 200 characters)"
                            maxLength={200}
                            rows={3}
                            disabled={updatePlaceholderMutation.isPending}
                        />
                        <span className={styles.characterCount}>
                            {formData.description.length}/200
                        </span>
                    </div>

                    <div className={styles.formSection}>
                        <label htmlFor="profile_picture">Profile Picture (Optional)</label>
                        <div className={styles.fileUpload}>
                            <input
                                ref={fileInputRef}
                                type="file"
                                id="profile_picture"
                                accept="image/*"
                                onChange={handleFileSelect}
                                disabled={updatePlaceholderMutation.isPending}
                                style={{ display: 'none' }}
                            />

                            {/* Show preview if file is selected */}
                            {(previewUrl || (placeholder.profile_object_key && !selectedFile)) && (
                                <div className={styles.filePreview}>
                                    <img
                                        src={previewUrl || placeholder.profile_picture?.url_medium || placeholder.profile_picture?.url_small}
                                        alt="Profile preview"
                                    />
                                    <button
                                        type="button"
                                        className={styles.removeFileButton}
                                        onClick={handleRemoveFile}
                                        disabled={updatePlaceholderMutation.isPending || isUploading}
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}

                            {/* Upload button */}
                            <button
                                type="button"
                                className={styles.uploadButton}
                                onClick={() => fileInputRef.current?.click()}
                                disabled={updatePlaceholderMutation.isPending || isUploading}
                            >
                                {isUploading ? (
                                    <>
                                        <div className={styles.uploadSpinner}></div>
                                        Uploading...
                                    </>
                                ) : selectedFile || (formData.profile_object_key && formData.profile_object_key !== placeholder.profile_object_key)
                                    ? '✅ Picture Uploaded'
                                    : placeholder.profile_object_key
                                        ? '📷 Change Picture'
                                        : '📷 Choose Picture'
                                }
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className={styles.errorMessage}>
                            <span>❌ {error}</span>
                        </div>
                    )}

                    <div className={styles.formActions}>
                        <button
                            type="button"
                            className={styles.cancelButton}
                            onClick={handleClose}
                            disabled={updatePlaceholderMutation.isPending}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={styles.submitButton}
                            disabled={updatePlaceholderMutation.isPending || !formData.first_name.trim() || !formData.last_name.trim()}
                        >
                            {updatePlaceholderMutation.isPending ? 'Updating...' : 'Update Placeholder'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditPlaceholderModal; 
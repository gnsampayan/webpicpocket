import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { type Pocket, type ContactUser } from '../../types';
import './EditPocketModal.css';

interface EditPocketModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPocketUpdated: () => void;
    pocket: Pocket;
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

const EditPocketModal: React.FC<EditPocketModalProps> = ({
    isOpen,
    onClose,
    onPocketUpdated,
    pocket
}) => {
    const [title, setTitle] = useState(pocket.pocket_title);
    const [selectedCoverPhoto, setSelectedCoverPhoto] = useState<SelectedFile | null>(null);
    const [newMembers, setNewMembers] = useState<ContactUser[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<ContactUser[]>([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const [loadingContacts, setLoadingContacts] = useState(false);
    const [abortController, setAbortController] = useState<AbortController | null>(null);
    const [shouldShowDropdown, setShouldShowDropdown] = useState(false);
    const currentRequestRef = useRef<string | null>(null);
    const shouldShowDropdownRef = useRef(false);
    const memberInputRef = useRef<HTMLInputElement>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset form when modal opens with new pocket
    useEffect(() => {
        if (isOpen) {
            setTitle(pocket.pocket_title);
            setSelectedCoverPhoto(null);
            setNewMembers([]);
            setSearchQuery('');
            setSearchResults([]);
            setShowSearchResults(false);
            setLoadingContacts(false);
            setShouldShowDropdown(false);
            shouldShowDropdownRef.current = false;
            setError(null);
            setSuccess(null);

            // Cancel any ongoing request
            if (abortController) {
                abortController.abort();
                setAbortController(null);
            }
            currentRequestRef.current = null;
        }
    }, [isOpen, pocket]);

    // Handle title change
    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
    };

    // Handle cover photo selection
    const handleCoverPhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const file = files[0];
        const selectedFile: SelectedFile = {
            id: Math.random().toString(36).substr(2, 9),
            file,
            preview: URL.createObjectURL(file),
            uploading: false,
            uploadProgress: 0
        };

        setSelectedCoverPhoto(selectedFile);
        setError(null);

        // Clear the input for future selections
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }

        // Upload the cover photo to S3
        uploadCoverPhotoToS3(selectedFile);
    };

    // Upload cover photo to S3
    const uploadCoverPhotoToS3 = async (selectedFile: SelectedFile): Promise<string> => {
        try {
            // Update file to uploading state
            setSelectedCoverPhoto(prev => prev ? {
                ...prev,
                uploading: true,
                uploadProgress: 0
            } : null);

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
            setSelectedCoverPhoto(prev => prev ? {
                ...prev,
                objectKey: upload.object_key,
                uploading: false,
                uploadProgress: 100
            } : null);

            return upload.object_key;
        } catch (err) {
            console.error('❌ [EditPocketModal] Failed to upload cover photo:', err);

            // Update file with error
            setSelectedCoverPhoto(prev => prev ? {
                ...prev,
                uploading: false,
                uploadError: err instanceof Error ? err.message : 'Upload failed'
            } : null);

            throw err;
        }
    };

    // Handle member search click
    const handleMemberSearchClick = async (e: React.MouseEvent<HTMLInputElement>) => {
        // Ensure we're clicking directly on the input element
        if (e.target !== e.currentTarget) {
            return;
        }

        const input = e.currentTarget;
        const rect = input.getBoundingClientRect();

        // Check if click is within the input bounds
        const clickX = e.clientX;
        const clickY = e.clientY;

        if (clickX < rect.left || clickX > rect.right || clickY < rect.top || clickY > rect.bottom) {
            return;
        }

        setDropdownPosition({
            top: rect.bottom + 8,
            left: rect.left,
            width: rect.width
        });

        // Toggle dropdown visibility
        const shouldShow = !shouldShowDropdownRef.current;
        setShouldShowDropdown(shouldShow);
        shouldShowDropdownRef.current = shouldShow;

        if (shouldShow) {
            setLoadingContacts(true);

            // Cancel any existing request
            if (abortController) {
                abortController.abort();
            }

            // Create new abort controller and request ID
            const controller = new AbortController();
            const requestId = Math.random().toString(36).substr(2, 9);
            setAbortController(controller);
            currentRequestRef.current = requestId;

            try {
                console.log('🔄 Starting API call for contacts');
                const contacts = await api.getContacts(controller.signal);

                // Check if this is still the current request and dropdown should be shown
                if (controller.signal.aborted || currentRequestRef.current !== requestId || !shouldShowDropdownRef.current) {
                    console.log('🔄 Request cancelled or outdated, skipping update');
                    return;
                }

                // Filter out existing members
                const availableContacts = contacts.contacts.filter(contact =>
                    !pocket.pocket_members.some(member => member.id === contact.id)
                );

                console.log('✅ Loading contacts completed, updating UI');
                setSearchResults(availableContacts);
                setShowSearchResults(true);
                setLoadingContacts(false);
            } catch (err) {
                console.log('❌ API call failed or was cancelled:', err);
                // Don't log error if it was cancelled
                if (!controller.signal.aborted) {
                    console.error('❌ Failed to load contacts:', err);
                    setSearchResults([]);
                }
                // Always clear loading state on error
                setLoadingContacts(false);
            }
        } else {
            // Hide dropdown
            setShowSearchResults(false);
            setLoadingContacts(false);

            // Cancel any ongoing request
            if (abortController) {
                abortController.abort();
                setAbortController(null);
            }
            currentRequestRef.current = null;
        }
    };

    // Add member to the list
    const handleAddMember = (user: ContactUser) => {
        setNewMembers(prev => [...prev, user]);
        setSearchQuery('');
        // Hide the dropdown instead of clearing results
        setShouldShowDropdown(false);
        shouldShowDropdownRef.current = false;
        setShowSearchResults(false);
    };

    // Remove member from the list
    const handleRemoveMember = (userId: string) => {
        setNewMembers(prev => prev.filter(member => member.id !== userId));
    };

    // Handle form submission
    const handleSubmit = async () => {
        if (!title.trim()) {
            setError('Please enter a pocket title');
            return;
        }

        // Check if cover photo is still uploading
        if (selectedCoverPhoto && selectedCoverPhoto.uploading) {
            setError('Please wait for the cover photo to finish uploading');
            return;
        }

        setSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            console.log('🔄 [EditPocketModal] Updating pocket');

            // Prepare the update data
            const updateData: any = {};

            // Add title if changed
            if (title !== pocket.pocket_title) {
                updateData.title = title;
            }

            // Add cover photo if selected and uploaded
            if (selectedCoverPhoto && selectedCoverPhoto.objectKey) {
                updateData.cover_photo_object_key = selectedCoverPhoto.objectKey;
            }

            // Add new members if any
            if (newMembers.length > 0) {
                updateData.add_members = newMembers.map(member => member.id);
            }

            // Only make the API call if there are changes
            if (Object.keys(updateData).length > 0) {
                console.log('🔄 [EditPocketModal] Update data:', updateData);

                await api.updatePocket(pocket.pocket_id, updateData);
                console.log('✅ [EditPocketModal] Pocket updated successfully');

                setSuccess('Pocket updated successfully!');

                // Show success message for 1 second, then close modal and refetch
                setTimeout(() => {
                    handleClose();
                    onPocketUpdated();
                }, 1000);
            } else {
                setSuccess('No changes to save');
                setTimeout(() => {
                    handleClose();
                }, 1000);
            }
        } catch (err) {
            console.error('❌ [EditPocketModal] Failed to update pocket:', err);
            setError(err instanceof Error ? err.message : 'Failed to update pocket');
        } finally {
            setSubmitting(false);
        }
    };

    // Handle modal close
    const handleClose = () => {
        // Clean up object URL if cover photo was selected
        if (selectedCoverPhoto?.preview) {
            URL.revokeObjectURL(selectedCoverPhoto.preview);
        }

        // Cancel any ongoing request
        if (abortController) {
            abortController.abort();
            setAbortController(null);
        }

        setTitle(pocket.pocket_title);
        setSelectedCoverPhoto(null);
        setNewMembers([]);
        setSearchQuery('');
        setSearchResults([]);
        setShowSearchResults(false);
        setLoadingContacts(false);
        setShouldShowDropdown(false);
        shouldShowDropdownRef.current = false;
        setError(null);
        setSuccess(null);
        setSubmitting(false);
        currentRequestRef.current = null;
        onClose();
    };

    // Handle modal click
    const handleModalClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent modal from closing

        const target = e.target as HTMLElement;

        // If clicking on the input field, let the input handle it
        if (target === memberInputRef.current) {
            return;
        }

        // If clicking outside the member search container, hide the dropdown
        if (!target.closest('.member-search-container')) {
            console.log('🔄 Clicking outside, hiding dropdown');

            // Cancel any ongoing request
            if (abortController) {
                abortController.abort();
                setAbortController(null);
            }

            // Clear current request ID
            currentRequestRef.current = null;

            setShouldShowDropdown(false);
            shouldShowDropdownRef.current = false;
            setShowSearchResults(false);
            setLoadingContacts(false);
        }
    };

    // Handle modal overlay click
    const handleModalOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="edit-pocket-modal-overlay" onClick={handleModalOverlayClick}>
            <div className="edit-pocket-modal" onClick={handleModalClick}>
                <div className="modal-header">
                    <h2>Edit Pocket</h2>
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

                    {success && (
                        <div className="success-message">
                            {success}
                        </div>
                    )}

                    {/* Pocket Title */}
                    <div className="form-section">
                        <label htmlFor="pocket-title">Pocket Title</label>
                        <input
                            id="pocket-title"
                            type="text"
                            value={title}
                            onChange={handleTitleChange}
                            placeholder="Enter pocket title"
                            disabled={submitting}
                        />
                    </div>

                    {/* Cover Photo */}
                    <div className="form-section">
                        <label>Cover Photo</label>
                        <div className="cover-photo-section">
                            <div className="current-cover">
                                <img
                                    src={selectedCoverPhoto?.preview ||
                                        (pocket.cover_photo_url?.url_large ?
                                            `https://${pocket.cover_photo_url.url_large}` :
                                            'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjNjY3ZWVhIi8+CjxyZWN0IHg9IjQwIiB5PSI0MCIgd2lkdGg9IjEyMCIgaGVpZ2h0PSI3MCIgcng9IjgiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4yIi8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjY1IiByPSIxNSIgZmlsbD0iI2ZmZmZmZiIgZmlsbC1vcGFjaXR5PSIwLjYiLz4KPHBhdGggZD0iTTkwIDc1TDk1IDgwTDEwNSA3MEwxMTUgODBMMTIwIDc1IiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIgc3Ryb2tlLW9wYWNpdHk9IjAuNiIvPgo8dGV4dCB4PSIxMDAiIHk9IjEzMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmaWxsPSIjZmZmZmZmIiBmaWxsLW9wYWNpdHk9IjAuOCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Tm8gQ292ZXIgUGhvdG88L3RleHQ+Cjwvc3ZnPgo=')}
                                    alt="Cover photo"
                                />
                            </div>
                            <div className="cover-photo-actions">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleCoverPhotoSelect}
                                    style={{ display: 'none' }}
                                />
                                <button
                                    type="button"
                                    className="select-cover-button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={submitting}
                                >
                                    📷 Change Cover Photo
                                </button>
                                {selectedCoverPhoto && (
                                    <div className="cover-photo-status">
                                        {selectedCoverPhoto.uploading && (
                                            <div className="upload-status">
                                                <div className="upload-spinner"></div>
                                                <span>Uploading...</span>
                                            </div>
                                        )}
                                        {selectedCoverPhoto.objectKey && (
                                            <div className="upload-success">
                                                <span>✅ Ready</span>
                                            </div>
                                        )}
                                        {selectedCoverPhoto.uploadError && (
                                            <div className="upload-error">
                                                <span>❌ {selectedCoverPhoto.uploadError}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Add Members */}
                    <div className="form-section">
                        <label>Add Members</label>
                        <div className="member-search-container">
                            <input
                                ref={memberInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onClick={handleMemberSearchClick}
                                placeholder="Search contacts by name or username..."
                                disabled={submitting}
                            />
                            {shouldShowDropdown && (showSearchResults || loadingContacts) && (
                                <div
                                    className="search-results"
                                    style={{
                                        top: dropdownPosition.top,
                                        left: dropdownPosition.left,
                                        width: dropdownPosition.width
                                    }}
                                >
                                    {loadingContacts ? (
                                        <div className="search-result-loading" onClick={(e) => e.stopPropagation()}>
                                            <div className="loading-spinner"></div>
                                            <span>Loading contacts...</span>
                                        </div>
                                    ) : searchResults.length > 0 ? (
                                        searchResults.map((contact) => (
                                            <div
                                                key={contact.id}
                                                className="search-result-item"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAddMember(contact);
                                                }}
                                            >
                                                <div className="contact-avatar">
                                                    {contact.profile_picture?.url_small ? (
                                                        <img
                                                            src={contact.profile_picture.url_small.startsWith('http')
                                                                ? contact.profile_picture.url_small
                                                                : `https://${contact.profile_picture.url_small}`}
                                                            alt={`${contact.first_name} ${contact.last_name}`}
                                                            onError={(e) => {
                                                                // Fallback to initials if image fails to load
                                                                e.currentTarget.style.display = 'none';
                                                                const fallback = e.currentTarget.parentElement?.querySelector('.avatar-fallback');
                                                                if (fallback) {
                                                                    fallback.classList.remove('fallback');
                                                                }
                                                            }}
                                                        />
                                                    ) : null}
                                                    <div className="avatar-fallback">
                                                        {contact.first_name.charAt(0)}{contact.last_name.charAt(0)}
                                                    </div>
                                                </div>
                                                <div className="contact-info">
                                                    <span className="contact-name">
                                                        {contact.first_name} {contact.last_name}
                                                    </span>
                                                    <span className="contact-username">
                                                        @{contact.username}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="search-result-empty" onClick={(e) => e.stopPropagation()}>
                                            <span>No available contacts found</span>
                                            <small>All your contacts may already be in this pocket</small>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Selected Members */}
                        {newMembers.length > 0 && (
                            <div className="selected-members">
                                <small>Selected members ({newMembers.length}):</small>
                                {newMembers.map((member) => (
                                    <div key={member.id} className="selected-member">
                                        <div className="selected-member-info">
                                            <div className="contact-avatar">
                                                {member.profile_picture?.url_small ? (
                                                    <img
                                                        src={member.profile_picture.url_small.startsWith('http')
                                                            ? member.profile_picture.url_small
                                                            : `https://${member.profile_picture.url_small}`}
                                                        alt={`${member.first_name} ${member.last_name}`}
                                                        onError={(e) => {
                                                            // Fallback to initials if image fails to load
                                                            e.currentTarget.style.display = 'none';
                                                            const fallback = e.currentTarget.parentElement?.querySelector('.avatar-fallback');
                                                            if (fallback) {
                                                                fallback.classList.remove('fallback');
                                                            }
                                                        }}
                                                    />
                                                ) : null}
                                                <div className="avatar-fallback">
                                                    {member.first_name.charAt(0)}{member.last_name.charAt(0)}
                                                </div>
                                            </div>
                                            <span>{member.first_name} {member.last_name}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveMember(member.id)}
                                            disabled={submitting}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
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
                            !title.trim() ||
                            (selectedCoverPhoto?.uploading ?? false)
                        }
                    >
                        {submitting ? 'Updating...' : 'Update Pocket'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditPocketModal; 
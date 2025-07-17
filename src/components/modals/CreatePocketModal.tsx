import React, { useState, useRef } from 'react';
import { api } from '../../services/api';
import { useCreatePocketMutation } from '../../hooks/usePhotos';
import type { Pocket, ContactUser } from '../../types';
import './CreatePocketModal.css';
import { API_CONFIG } from '../../config/api';
import env from '../../config/env';

interface CreatePocketModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPocketCreated?: (pocket: Pocket) => void;
}


const API_URL = env.API_URL;

const CreatePocketModal: React.FC<CreatePocketModalProps> = ({ isOpen, onClose, onPocketCreated }) => {
    const [title, setTitle] = useState('');
    const [memberSearch, setMemberSearch] = useState('');
    const [selectedMembers, setSelectedMembers] = useState<ContactUser[]>([]);
    const [searchResults, setSearchResults] = useState<ContactUser[]>([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const [loadingContacts, setLoadingContacts] = useState(false);
    const [abortController, setAbortController] = useState<AbortController | null>(null);
    const [shouldShowDropdown, setShouldShowDropdown] = useState(false);
    const currentRequestRef = useRef<string | null>(null);
    const shouldShowDropdownRef = useRef(false);
    const memberInputRef = useRef<HTMLInputElement>(null);
    const [coverPhotoFile, setCoverPhotoFile] = useState<File | null>(null);
    const [coverPhotoUploading, setCoverPhotoUploading] = useState(false);
    const [coverPhotoObjectKey, setCoverPhotoObjectKey] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // React Query mutation
    const createPocketMutation = useCreatePocketMutation();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim()) {
            setError('Pocket title is required');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Prepare request body
            const requestBody: any = {
                title: title.trim()
            };

            // Add members if selected
            if (selectedMembers.length > 0) {
                requestBody.members = selectedMembers.map(member => member.id);
            }

            // Add cover photo object key if available
            if (coverPhotoObjectKey) {
                requestBody.cover_photo_object_key = coverPhotoObjectKey;
            }

            console.log('Creating pocket with data:', requestBody);

            // If cover photo is still uploading, wait for it
            if (coverPhotoFile && !coverPhotoObjectKey && coverPhotoUploading) {
                console.log('⏳ Waiting for cover photo upload to complete...');
                // Wait for upload to complete (this will be handled by the state changes)
                return;
            }

            const newPocket = await createPocketMutation.mutateAsync(requestBody);
            console.log('✅ Pocket created successfully:', newPocket);

            // Reset form
            setTitle('');
            setMemberSearch('');
            setSelectedMembers([]);
            setCoverPhotoFile(null);
            setCoverPhotoObjectKey(null);

            // Call callback and close modal
            onPocketCreated?.(newPocket);
            onClose();
        } catch (err) {
            console.error('❌ Failed to create pocket:', err);
            let errorMessage = 'Failed to create pocket';

            if (err instanceof Error) {
                if (err.message.includes('Invalid upload response')) {
                    errorMessage = 'Failed to upload cover photo. Please try again.';
                } else if (err.message.includes('Cover photo size')) {
                    errorMessage = 'Cover photo must be less than 10MB.';
                } else if (err.message.includes('Cover photo must be an image')) {
                    errorMessage = 'Please select a valid image file for the cover photo.';
                } else {
                    errorMessage = err.message;
                }
            }

            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {

        const file = e.target.files?.[0];
        if (file) {
            setCoverPhotoFile(file);
            setCoverPhotoObjectKey(null); // Reset previous object key
            setCoverPhotoUploading(true);

            try {
                // Upload to S3 immediately
                const uploadUrl = `${API_URL}${API_CONFIG.endpoints.upload}`;
                const fileName = file.name;

                const uploadResponse = await api.authenticatedRequest(uploadUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        files: [fileName],
                    }),
                });

                const uploadData = await uploadResponse.json();

                if (!uploadData.uploads || !uploadData.uploads[0]) {
                    throw new Error("Invalid upload response from server");
                }

                // Upload file to S3
                await api.uploadFileToS3(
                    uploadData.uploads[0].upload_url,
                    file
                );

                setCoverPhotoObjectKey(uploadData.uploads[0].object_key);
                console.log('✅ Cover photo uploaded successfully:', uploadData.uploads[0].object_key);
            } catch (err) {
                console.error('❌ Failed to upload cover photo:', err);
                setError('Failed to upload cover photo. Please try again.');
                setCoverPhotoFile(null);
            } finally {
                setCoverPhotoUploading(false);
            }
        }
    };

    const handleClose = () => {
        if (!loading) {
            // Cancel any ongoing request
            if (abortController) {
                abortController.abort();
                setAbortController(null);
            }

            setTitle('');
            setMemberSearch('');
            setSelectedMembers([]);
            setCoverPhotoFile(null);
            setCoverPhotoObjectKey(null);
            setError(null);
            setShouldShowDropdown(false);
            shouldShowDropdownRef.current = false;
            setShowSearchResults(false);
            setLoadingContacts(false);
            currentRequestRef.current = null;
            onClose();
        }
    };

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

    const handleMemberSelect = (contact: ContactUser) => {
        if (!selectedMembers.find(member => member.id === contact.id)) {
            setSelectedMembers(prev => [...prev, contact]);
        }
        setMemberSearch('');
        setShowSearchResults(false);
    };

    const handleRemoveMember = (contactId: string) => {
        setSelectedMembers(prev => prev.filter(member => member.id !== contactId));
    };

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

                console.log('✅ Loading contacts completed, updating UI');
                setSearchResults(contacts.contacts);
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

    if (!isOpen) return null;

    return (
        <div className="create-pocket-modal-overlay" onClick={handleClose}>
            <div className="create-pocket-modal" onClick={handleModalClick}>
                <div className="modal-header">
                    <h2>Create New Pocket</h2>
                    <button className="close-button" onClick={handleClose} disabled={loading}>
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    {error && (
                        <div className="error-message">
                            <span>❌ {error}</span>
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="cover-photo">Cover Photo (Optional)</label>
                        <input
                            id="cover-photo"
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            disabled={loading}
                        />
                        {coverPhotoFile && (
                            <div className="selected-file">
                                <span>📷 {coverPhotoFile.name}</span>
                                {coverPhotoUploading && (
                                    <span className="upload-status">⏳ Uploading...</span>
                                )}
                                {coverPhotoObjectKey && !coverPhotoUploading && (
                                    <span className="upload-status success">✅ Uploaded</span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCoverPhotoFile(null);
                                        setCoverPhotoObjectKey(null);
                                    }}
                                    disabled={loading}
                                >
                                    ✕
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label htmlFor="pocket-title">Pocket Title *</label>
                        <input
                            id="pocket-title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter pocket title"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="pocket-members">Add Members (Optional)</label>
                        <div className="member-search-container">
                            <input
                                ref={memberInputRef}
                                id="pocket-members"
                                type="text"
                                value={memberSearch}
                                onChange={(e) => setMemberSearch(e.target.value)}
                                onClick={handleMemberSearchClick}
                                placeholder="Search contacts by name or username..."
                                disabled={loading}
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
                                        <div className="search-result-loading">
                                            <div className="loading-spinner"></div>
                                            <span>Loading contacts...</span>
                                        </div>
                                    ) : searchResults.length > 0 ? (
                                        searchResults.map((contact) => (
                                            <div
                                                key={contact.id}
                                                className="search-result-item"
                                                onClick={() => handleMemberSelect(contact)}
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
                                        <div className="search-result-empty">
                                            <span>No contacts found</span>
                                            <small>Try searching with a different name or username</small>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {selectedMembers.length > 0 && (
                            <div className="selected-members">
                                <small>Selected members:</small>
                                {selectedMembers.map((member) => (
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
                                            disabled={loading}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="modal-actions">
                        <button
                            type="button"
                            className="cancel-button"
                            onClick={handleClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="create-button"
                            disabled={loading || !title.trim() || (!!coverPhotoFile && coverPhotoUploading)}
                        >
                            {loading ? 'Creating...' :
                                coverPhotoFile && coverPhotoUploading ? 'Waiting for upload...' :
                                    'Create Pocket'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreatePocketModal; 
import React, { useState, useRef } from 'react';
import { api } from '../../services/api';
import { useCreatePocketMutation } from '../../hooks/useMedia';
import type { Pocket, ContactUser } from '../../types';
import styles from './CreatePocketWizard.module.css';
import { API_CONFIG } from '../../config/api';
import env from '../../config/env';

interface CreatePocketWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onPocketCreated?: (pocket: Pocket) => void;
}

type WizardStep = 'members' | 'details';

const API_URL = env.API_URL;

const CreatePocketWizard: React.FC<CreatePocketWizardProps> = ({ isOpen, onClose, onPocketCreated }) => {
    // Wizard state
    const [currentStep, setCurrentStep] = useState<WizardStep>('members');

    // Form state
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
    const [isDragOver, setIsDragOver] = useState(false);

    // React Query mutation
    const createPocketMutation = useCreatePocketMutation();

    const handleNextStep = () => {
        if (currentStep === 'members') {
            if (selectedMembers.length === 0) {
                setError('Please add at least one member to create a pocket');
                return;
            }

            // If only one member, create pocket immediately
            if (selectedMembers.length === 1) {
                handleCreatePocket();
                return;
            }

            // If multiple members, go to details step
            setError(null);
            setCurrentStep('details');
        }
    };

    const handlePreviousStep = () => {
        if (currentStep === 'details') {
            setCurrentStep('members');
        }
    };

    const handleCreatePocket = async () => {
        try {
            setLoading(true);
            setError(null);

            // Validate title is required for multiple members
            if (selectedMembers.length > 1 && !title.trim()) {
                setError('Please enter a pocket title');
                setLoading(false);
                return;
            }

            // Prepare request body
            const requestBody: any = {
                members: selectedMembers.map(member => member.id)
            };

            // Add title if provided (only for multiple members step)
            if (title.trim()) {
                requestBody.title = title.trim();
            }

            // Add cover photo object key if available
            if (coverPhotoObjectKey) {
                requestBody.cover_photo_object_key = coverPhotoObjectKey;
            }

            console.log('Creating pocket with data:', requestBody);

            // If cover photo is still uploading, wait for it
            if (coverPhotoFile && !coverPhotoObjectKey && coverPhotoUploading) {
                console.log('⏳ Waiting for cover photo upload to complete...');
                return;
            }

            const newPocket = await createPocketMutation.mutateAsync(requestBody);
            console.log('✅ Pocket created successfully:', newPocket);

            // Reset form
            resetForm();

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

    const resetForm = () => {
        setCurrentStep('members');
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
    };

    const handleFileChange = async (file: File) => {
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

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileChange(file);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            const file = files[0];
            // Check if it's an image file
            if (file.type.startsWith('image/')) {
                handleFileChange(file);
            } else {
                setError('Please select a valid image file for the cover photo.');
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

            resetForm();
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
        if (!target.closest(`.${styles.memberSearchContainer}`)) {
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
        setError(null); // Clear error when member is added
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

    const getStepTitle = () => {
        // If only one member selected, show quick create title
        if (selectedMembers.length === 1) {
            return 'Quick Create Pocket';
        }

        switch (currentStep) {
            case 'members':
                return 'Add Members';
            case 'details':
                return 'Pocket Details';
            default:
                return 'Create New Pocket';
        }
    };

    const getStepDescription = () => {
        // If only one member selected, show quick create description
        if (selectedMembers.length === 1) {
            return 'Creating a pocket with one person';
        }

        switch (currentStep) {
            case 'members':
                return 'Choose people to share memories with';
            case 'details':
                return 'Add a title (required) and cover photo (optional)';
            default:
                return '';
        }
    };

    const getAvailableContacts = () => {
        return searchResults.filter(contact => !selectedMembers.find(member => member.id === contact.id));
    };

    if (!isOpen) return null;

    return (
        <div className={styles.createPocketModalOverlay} onClick={handleClose}>
            <div className={`${styles.createPocketModal} ${styles.wizardModal}`} onClick={handleModalClick}>
                <div className={styles.modalHeader}>
                    <div className={styles.wizardHeader}>
                        {/* Only show steps if multiple members or no members selected */}
                        {selectedMembers.length !== 1 ? (
                            <div className={styles.wizardSteps}>
                                <div className={`${styles.wizardStep} ${currentStep === 'members' ? 'active' : 'completed'}`}>
                                    <div className={styles.stepNumber}>1</div>
                                    <span>Members</span>
                                </div>
                                <div className={styles.wizardDivider}></div>
                                <div className={`${styles.wizardStep} ${currentStep === 'details' ? 'active' : 'pending'}`}>
                                    <div className={styles.stepNumber}>2</div>
                                    <span>Details</span>
                                </div>
                            </div>
                        ) : (
                            <div></div>
                        )}
                        <button className={styles.closeButton} onClick={handleClose} disabled={loading}>
                            ✕
                        </button>
                    </div>
                    <div className={styles.wizardTitle}>
                        <h2>{getStepTitle()}</h2>
                        <p>{getStepDescription()}</p>
                    </div>
                </div>

                <div className={styles.modalForm}>
                    {error && (
                        <div className={styles.errorMessage}>
                            <span>❌ {error}</span>
                        </div>
                    )}

                    {/* Step 1: Members */}
                    {currentStep === 'members' && (
                        <div className={styles.wizardStepContent}>
                            <div className={styles.formGroup}>
                                <label htmlFor="pocket-members">Search and add people</label>
                                <div className={styles.memberSearchContainer}>
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
                                            className={styles.searchResults}
                                            style={{
                                                top: dropdownPosition.top,
                                                left: dropdownPosition.left,
                                                width: dropdownPosition.width
                                            }}
                                        >
                                            {loadingContacts ? (
                                                <div className={styles.searchResultLoading}>
                                                    <div className={styles.loadingSpinner}></div>
                                                    <span>Loading contacts...</span>
                                                </div>
                                            ) : searchResults.length > 0 ? (
                                                getAvailableContacts().map((contact) => (
                                                    <div
                                                        key={contact.id}
                                                        className={styles.searchResultItem}
                                                        onClick={() => handleMemberSelect(contact)}
                                                    >
                                                        <div className={styles.contactAvatar}>
                                                            {contact.profile_picture?.url_small ? (
                                                                <img
                                                                    src={contact.profile_picture.url_small.startsWith('http')
                                                                        ? contact.profile_picture.url_small
                                                                        : `https://${contact.profile_picture.url_small}`}
                                                                    alt={`${contact.first_name} ${contact.last_name}`}
                                                                    onError={(e) => {
                                                                        // Fallback to initials if image fails to load
                                                                        e.currentTarget.style.display = 'none';
                                                                        const fallback = e.currentTarget.parentElement?.querySelector(`.${styles.avatarFallback}`);
                                                                        if (fallback) {
                                                                            fallback.classList.remove('fallback');
                                                                        }
                                                                    }}
                                                                />
                                                            ) : null}
                                                            <div className={styles.avatarFallback}>
                                                                {contact.first_name.charAt(0)}{contact.last_name.charAt(0)}
                                                            </div>
                                                        </div>
                                                        <div className={styles.contactInfo}>
                                                            <span className={styles.contactName}>
                                                                {contact.first_name} {contact.last_name}
                                                            </span>
                                                            <span className={styles.contactUsername}>
                                                                @{contact.username}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className={styles.searchResultEmpty}>
                                                    <span>
                                                        {searchResults.length > 0 && getAvailableContacts().length === 0
                                                            ? 'All contacts are already selected'
                                                            : 'No contacts found'
                                                        }
                                                    </span>
                                                    <small>
                                                        {searchResults.length > 0 && getAvailableContacts().length === 0
                                                            ? 'Try removing some members or searching for different people'
                                                            : 'Try searching with a different name or username'
                                                        }
                                                    </small>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {selectedMembers.length > 0 && (
                                    <div className={styles.selectedMembers}>
                                        <small>Selected members ({selectedMembers.length}):</small>
                                        {selectedMembers.map((member) => (
                                            <div key={member.id} className={styles.selectedMember}>
                                                <div className={styles.selectedMemberInfo}>
                                                    <div className={styles.contactAvatar}>
                                                        {member.profile_picture?.url_small ? (
                                                            <img
                                                                src={member.profile_picture.url_small.startsWith('http')
                                                                    ? member.profile_picture.url_small
                                                                    : `https://${member.profile_picture.url_small}`}
                                                                alt={`${member.first_name} ${member.last_name}`}
                                                                onError={(e) => {
                                                                    // Fallback to initials if image fails to load
                                                                    e.currentTarget.style.display = 'none';
                                                                    const fallback = e.currentTarget.parentElement?.querySelector(`.${styles.avatarFallback}`);
                                                                    if (fallback) {
                                                                        fallback.classList.remove('fallback');
                                                                    }
                                                                }}
                                                            />
                                                        ) : null}
                                                        <div className={styles.avatarFallback}>
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

                            {selectedMembers.length === 1 && (
                                <div className={styles.singleMemberNotice}>
                                    <div className={styles.noticeContent}>
                                        <span className={styles.noticeIcon}>💡</span>
                                        <div className={styles.noticeText}>
                                            <strong>Quick Create</strong>
                                            <p>Since you've added just one person, we'll create the pocket immediately when you click "Create Pocket".</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedMembers.length > 1 && (
                                <div className={styles.multipleMembersNotice}>
                                    <div className={styles.noticeContent}>
                                        <span className={styles.noticeIcon}>✨</span>
                                        <div className={styles.noticeText}>
                                            <strong>Multiple Members</strong>
                                            <p>You can add a title and cover photo in the next step to personalize your pocket.</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 2: Details (only for multiple members) */}
                    {currentStep === 'details' && (
                        <div className={styles.wizardStepContent}>
                            <div className={styles.formGroup}>
                                <label htmlFor="cover-photo">Cover Photo (Optional)</label>
                                <input
                                    id="cover-photo"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileInputChange}
                                    disabled={loading}
                                    style={{ display: 'none' }}
                                />
                                <div
                                    className={`${styles.uploadArea} ${isDragOver ? styles.dragOver : ''}`}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => document.getElementById('cover-photo')?.click()}
                                >
                                    <div className={styles.uploadContent}>
                                        <div className={styles.uploadIcon}>📷</div>
                                        <div className={styles.uploadText}>
                                            <span className={styles.uploadTitle}>Click to upload or drag & drop</span>
                                            <span className={styles.uploadSubtitle}>Supports: JPG, PNG, GIF (max 10MB)</span>
                                        </div>
                                    </div>
                                </div>
                                {coverPhotoFile && (
                                    <div className={styles.selectedFile}>
                                        <span>📷 {coverPhotoFile.name}</span>
                                        {coverPhotoUploading && (
                                            <span className={styles.uploadStatus}>⏳ Uploading...</span>
                                        )}
                                        {coverPhotoObjectKey && !coverPhotoUploading && (
                                            <span className={`${styles.uploadStatus} ${styles.success}`}>✅ Uploaded</span>
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

                            <div className={styles.formGroup}>
                                <label htmlFor="pocket-title">Pocket Title</label>
                                <input
                                    id="pocket-title"
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Give your pocket a name..."
                                    disabled={loading}
                                />
                            </div>

                            <div className={styles.selectedMembersSummary}>
                                <small>Creating pocket with {selectedMembers.length} members:</small>
                                <div className={styles.membersAvatars}>
                                    {selectedMembers.map((member) => (
                                        <div key={member.id} className={styles.memberAvatarSmall}>
                                            {member.profile_picture?.url_small ? (
                                                <img
                                                    src={member.profile_picture.url_small.startsWith('http')
                                                        ? member.profile_picture.url_small
                                                        : `https://${member.profile_picture.url_small}`}
                                                    alt={`${member.first_name} ${member.last_name}`}
                                                    onError={(e) => {
                                                        // Fallback to initials if image fails to load
                                                        e.currentTarget.style.display = 'none';
                                                        const fallback = e.currentTarget.parentElement?.querySelector(`.${styles.avatarFallback}`);
                                                        if (fallback) {
                                                            fallback.classList.remove('fallback');
                                                        }
                                                    }}
                                                />
                                            ) : null}
                                            <div className={styles.avatarFallback}>
                                                {member.first_name.charAt(0)}{member.last_name.charAt(0)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className={styles.modalActions}>
                    <div className={styles.actionButtons}>
                        {/* Back button (only on details step) */}
                        {currentStep === 'details' && (
                            <button
                                type="button"
                                className={styles.backButton}
                                onClick={handlePreviousStep}
                                disabled={loading}
                            >
                                ← Back
                            </button>
                        )}

                        {/* Cancel button */}
                        <button
                            type="button"
                            className={styles.cancelButton}
                            onClick={handleClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>

                        {/* Primary action button */}
                        {currentStep === 'members' ? (
                            <button
                                type="button"
                                className={styles.nextButton}
                                onClick={handleNextStep}
                                disabled={loading || selectedMembers.length === 0}
                            >
                                {selectedMembers.length === 1 ? 'Create Pocket' :
                                    selectedMembers.length > 1 ? 'Next →' :
                                        'Add Members'}
                            </button>
                        ) : (
                            <button
                                type="button"
                                className={styles.createButton}
                                onClick={handleCreatePocket}
                                disabled={loading || (!!coverPhotoFile && coverPhotoUploading) || (selectedMembers.length > 1 && !title.trim())}
                            >
                                {loading ? 'Creating...' :
                                    coverPhotoFile && coverPhotoUploading ? 'Waiting for upload...' :
                                        selectedMembers.length > 1 && !title.trim() ? 'Enter title...' :
                                            'Create Pocket'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreatePocketWizard; 
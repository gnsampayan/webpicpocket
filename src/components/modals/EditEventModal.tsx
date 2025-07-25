import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { useEditEventMutation } from '../../hooks/usePhotos';
import { type Event, type ContactUser, type Pocket } from '../../types';
import './EditEventModal.css';

interface EditEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onEventUpdated?: () => void;
    event: Event;
    pocket: Pocket;
}

const EditEventModal: React.FC<EditEventModalProps> = ({
    isOpen,
    onClose,
    onEventUpdated,
    event,
    pocket
}) => {
    const [title, setTitle] = useState(event.title);
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

    // React Query mutation
    const editEventMutation = useEditEventMutation();

    // Reset form when modal opens with new event
    useEffect(() => {
        if (isOpen) {
            setTitle(event.title);
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
    }, [isOpen, event]);

    // Handle title change
    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
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

                // Filter out existing members (both pocket members and additional event members)
                const existingMemberIds = [
                    ...(pocket.pocket_members?.map(member => member.id) || []),
                    ...(event.additional_members?.map(member => member.id) || [])
                ];

                const availableContacts = contacts.contacts.filter(contact =>
                    !existingMemberIds.includes(contact.id)
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
            setError('Please enter an event title');
            return;
        }

        setSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            console.log('🔄 [EditEventModal] Updating event');

            // Prepare the update data
            const updateData: any = {};

            // Add title if changed
            if (title !== event.title) {
                updateData.title = title;
            }

            // Add new members if any
            if (newMembers.length > 0) {
                updateData.members_to_add = newMembers.map(member => member.id);
            }

            // Only make the API call if there are changes
            if (Object.keys(updateData).length > 0) {
                console.log('🔄 [EditEventModal] Update data:', updateData);

                await editEventMutation.mutateAsync({ eventId: event.id, data: updateData, pocketId: pocket.pocket_id });
                console.log('✅ [EditEventModal] Event updated successfully');

                setSuccess('Event updated successfully!');

                // Show success message for 1 second, then close modal and refetch
                setTimeout(() => {
                    handleClose();
                    onEventUpdated?.();
                }, 1000);
            } else {
                setSuccess('No changes to save');
                setTimeout(() => {
                    handleClose();
                }, 1000);
            }
        } catch (err) {
            console.error('❌ [EditEventModal] Failed to update event:', err);
            setError(err instanceof Error ? err.message : 'Failed to update event');
        } finally {
            setSubmitting(false);
        }
    };

    // Handle modal close
    const handleClose = () => {
        // Cancel any ongoing request
        if (abortController) {
            abortController.abort();
            setAbortController(null);
        }

        setTitle(event.title);
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
        <div className="edit-event-modal-overlay" onClick={handleModalOverlayClick}>
            <div className="edit-event-modal" onClick={handleModalClick}>
                <div className="modal-header">
                    <h2>Edit Event</h2>
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

                    {/* Event Title */}
                    <div className="form-section">
                        <label htmlFor="event-title">Event Title</label>
                        <input
                            id="event-title"
                            type="text"
                            value={title}
                            onChange={handleTitleChange}
                            placeholder="Enter event title"
                            disabled={submitting}
                        />
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
                                            <small>All your contacts may already be in this event</small>
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
                            !title.trim()
                        }
                    >
                        {submitting ? 'Updating...' : 'Update Event'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditEventModal; 
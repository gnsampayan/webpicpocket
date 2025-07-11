import React, { useState, useRef, useEffect } from 'react';
import './CreateEventModal.css';
import { api } from '../../services/api';
import { type ContactUser, type Event, type Pocket } from '../../types';

interface CreateEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onEventCreated: (newEvent: Event) => void;
    pocketId: string;
    pocket?: Pocket | null;
}

const CreateEventModal: React.FC<CreateEventModalProps> = ({
    isOpen,
    onClose,
    onEventCreated,
    pocketId,
    pocket
}) => {
    const [title, setTitle] = useState('');
    const [selectedMembers, setSelectedMembers] = useState<ContactUser[]>([]);
    const [memberSearchTerm, setMemberSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<ContactUser[]>([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const [loadingContacts, setLoadingContacts] = useState(false);
    const [abortController, setAbortController] = useState<AbortController | null>(null);
    const [shouldShowDropdown, setShouldShowDropdown] = useState(false);
    const currentRequestRef = useRef<string | null>(null);
    const shouldShowDropdownRef = useRef(false);
    const memberInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Cleanup on modal close
    useEffect(() => {
        if (!isOpen) {
            setTitle('');
            setSelectedMembers([]);
            setMemberSearchTerm('');
            setError(null);
            if (abortController) {
                abortController.abort();
                setAbortController(null);
            }
            setShouldShowDropdown(false);
            shouldShowDropdownRef.current = false;
            setShowSearchResults(false);
            setLoadingContacts(false);
            currentRequestRef.current = null;
        }
    }, [isOpen, abortController]);

    const handleMemberSelect = (contact: ContactUser) => {
        if (!selectedMembers.find(member => member.id === contact.id)) {
            setSelectedMembers(prev => [...prev, contact]);
        }
        setMemberSearchTerm('');
    };

    const handleRemoveMember = (memberId: string) => {
        setSelectedMembers(prev => prev.filter(member => member.id !== memberId));
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
                const contacts = await api.getContacts(controller.signal);

                // Check if this is still the current request and dropdown should be shown
                if (controller.signal.aborted || currentRequestRef.current !== requestId || !shouldShowDropdownRef.current) {
                    return;
                }

                setSearchResults(contacts.contacts);
                setShowSearchResults(true);
                setLoadingContacts(false);
            } catch (err) {
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

    const handleModalClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent modal from closing

        const target = e.target as HTMLElement;

        // If clicking on the input field, let the input handle it
        if (target === memberInputRef.current) {
            return;
        }

        // If clicking outside the member search container, hide the dropdown
        if (!target.closest('.member-search-container')) {

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

    // Filter out pocket members from contacts since they're automatically added
    const filteredContacts = searchResults.filter(contact => {
        // First filter by search term
        const matchesSearch = contact.username?.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
            contact.first_name?.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
            contact.last_name?.toLowerCase().includes(memberSearchTerm.toLowerCase());

        if (!matchesSearch) return false;

        // Then filter out pocket members
        const isPocketMember = pocket?.pocket_members?.some(pocketMember =>
            pocketMember.id === contact.id
        );

        return !isPocketMember;
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim()) {
            setError('Please enter an event title');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const eventData: any = {
                title: title.trim(),
                pocket_id: pocketId
            };

            // Only include members if there are selected members
            if (selectedMembers.length > 0) {
                eventData.additional_members = selectedMembers.map(member => member.id);
            }

            const newEvent = await api.createEvent(eventData);

            onEventCreated(newEvent);
            onClose();
        } catch (err) {
            console.error('Error creating event:', err);
            setError(err instanceof Error ? err.message : 'Failed to create event');
        } finally {
            setLoading(false);
        }
    };

    const handleModalOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleModalOverlayClick}>
            <div className="modal-content" onClick={handleModalClick}>
                <div className="modal-header">
                    <h2>Create New Event</h2>
                    <button onClick={onClose} className="close-button">
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="event-title">Event Title *</label>
                        <input
                            id="event-title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter event title..."
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label>Add Members (Optional)</label>
                        <div className="member-search-container">
                            <input
                                ref={memberInputRef}
                                type="text"
                                value={memberSearchTerm}
                                onChange={(e) => setMemberSearchTerm(e.target.value)}
                                onClick={handleMemberSearchClick}
                                placeholder="Search contacts to add..."
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
                                    ) : filteredContacts.length > 0 ? (
                                        filteredContacts.map(contact => (
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
                                            <small>
                                                {memberSearchTerm ?
                                                    'Try searching with a different name or username' :
                                                    'All contacts are already pocket members'
                                                }
                                            </small>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {selectedMembers.length > 0 && (
                            <div className="selected-members">
                                <small>Selected members:</small>
                                {selectedMembers.map(member => (
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
                                            className="remove-member-button"
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
                            onClick={onClose}
                            className="cancel-button"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="create-button"
                            disabled={loading || !title.trim()}
                        >
                            {loading ? 'Creating...' : 'Create Event'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateEventModal; 
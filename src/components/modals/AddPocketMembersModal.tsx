import React, { useState, useRef } from 'react';
import { api } from '../../services/api';
import { type ContactUser } from '../../types';
import './AddPocketMembersModal.css';

interface AddPocketMembersModalProps {
    isOpen: boolean;
    onClose: () => void;
    onMembersAdded: () => void;
    pocketId: string;
    pocketTitle: string;
    existingMembers: string[];
}

const AddPocketMembersModal: React.FC<AddPocketMembersModalProps> = ({
    isOpen,
    onClose,
    onMembersAdded,
    pocketId,
    pocketTitle,
    existingMembers
}) => {
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
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // TODO: Wait for backend to support adding members to existing pockets
    const handleSubmit = async () => {
        if (selectedMembers.length === 0) {
            setError('Please select at least one person to add');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const newMemberIds = selectedMembers.map(member => member.id);

            console.log('🔄 Adding members to pocket:', {
                pocketId,
                existingMembers: existingMembers.length,
                newMembers: newMemberIds.length,
                newMemberIds
            });

            // Try sending only the new members - the backend might handle adding them to existing
            await api.updatePocket(pocketId, {
                members: newMemberIds
            });

            console.log('✅ Members added successfully to pocket');
            onMembersAdded();
            handleClose();
        } catch (err) {
            console.error('Error adding members to pocket:', err);
            setError(err instanceof Error ? err.message : 'Failed to add members to pocket');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            // Cancel any ongoing request
            if (abortController) {
                abortController.abort();
                setAbortController(null);
            }

            setMemberSearch('');
            setSelectedMembers([]);
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

                // Filter out existing members
                const availableContacts = contacts.contacts.filter(contact =>
                    !existingMembers.includes(contact.id)
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

    const handleModalOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="add-pocket-members-modal-overlay" onClick={handleModalOverlayClick}>
            <div className="add-pocket-members-modal" onClick={handleModalClick}>
                <div className="modal-header">
                    <h2>Add People to {pocketTitle}</h2>
                    <button onClick={handleClose} className="close-button" disabled={loading}>
                        ✕
                    </button>
                </div>

                <div className="modal-body">
                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    {/* Member Search Section */}
                    <div className="form-group">
                        <label htmlFor="pocket-members">Select people to add:</label>
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
                                                    {contact.first_name.charAt(0)}{contact.last_name.charAt(0)}
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
                                            <span>No available contacts found</span>
                                            <small>All your contacts may already be in this pocket</small>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Selected Members */}
                        {selectedMembers.length > 0 && (
                            <div className="selected-members">
                                <small>Selected members ({selectedMembers.length}):</small>
                                {selectedMembers.map((member) => (
                                    <div key={member.id} className="selected-member">
                                        <div className="selected-member-info">
                                            <div className="contact-avatar">
                                                {member.first_name.charAt(0)}{member.last_name.charAt(0)}
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
                </div>

                <div className="modal-actions">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="cancel-button"
                        disabled={loading}
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleSubmit}
                        className="submit-button"
                        disabled={loading || selectedMembers.length === 0}
                    >
                        {loading ? 'Adding Members...' : `Add ${selectedMembers.length} Member${selectedMembers.length !== 1 ? 's' : ''}`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddPocketMembersModal; 
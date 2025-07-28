import React, { useState, useRef } from 'react';
import { useSearchUsers, useSendContactRequestMutation, getContactAvatar, getContactName } from '../../hooks/useContacts';
import * as ApiTypes from '../../types/api';
import './AddContactsModal.css';

interface AddContactsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onContactAdded?: () => void;
}

const AddContactsModal: React.FC<AddContactsModalProps> = ({
    isOpen,
    onClose,
    onContactAdded
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<ApiTypes.ContactUser[]>([]);

    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const [shouldShowDropdown, setShouldShowDropdown] = useState(false);
    const shouldShowDropdownRef = useRef(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Hooks
    const { data: searchResults, isLoading: searching } = useSearchUsers(searchQuery);
    const sendContactRequestMutation = useSendContactRequestMutation();

    const handleSubmit = async () => {
        if (selectedUsers.length === 0) {
            setError('Please select at least one person to add');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Send contact requests for all selected users
            for (const user of selectedUsers) {
                await sendContactRequestMutation.mutateAsync(user.id);
            }

            console.log('✅ Contact requests sent successfully');
            onContactAdded?.();
            handleClose();
        } catch (err) {
            console.error('Error sending contact requests:', err);
            setError(err instanceof Error ? err.message : 'Failed to send contact requests');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            setSearchQuery('');
            setSelectedUsers([]);
            setError(null);
            setShouldShowDropdown(false);
            shouldShowDropdownRef.current = false;
            onClose();
        }
    };

    const handleModalClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent modal from closing

        const target = e.target as HTMLElement;

        // If clicking on the input field, let the input handle it
        if (target === searchInputRef.current) {
            return;
        }

        // If clicking outside the search container, hide the dropdown
        if (!target.closest('.search-container')) {
            console.log('🔄 Clicking outside, hiding dropdown');
            setShouldShowDropdown(false);
            shouldShowDropdownRef.current = false;
        }
    };

    const handleUserSelect = (user: ApiTypes.ContactUser) => {
        if (!selectedUsers.find(selectedUser => selectedUser.id === user.id)) {
            setSelectedUsers(prev => [...prev, user]);
        }
        setSearchQuery('');
        setShouldShowDropdown(false);
        shouldShowDropdownRef.current = false;
    };

    const handleRemoveUser = (userId: string) => {
        setSelectedUsers(prev => prev.filter(user => user.id !== userId));
    };

    const handleSearchClick = (e: React.MouseEvent<HTMLInputElement>) => {
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
    };

    const handleModalOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    // Filter out already selected users from search results
    const filteredSearchResults = searchResults?.filter(user =>
        !selectedUsers.find(selectedUser => selectedUser.id === user.id)
    ) || [];

    if (!isOpen) return null;

    return (
        <div className="add-contacts-modal-overlay" onClick={handleModalOverlayClick}>
            <div className="add-contacts-modal" onClick={handleModalClick}>
                <div className="modal-header">
                    <h2>Add New Contacts</h2>
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

                    {/* Search Section */}
                    <div className="form-group">
                        <label htmlFor="contact-search">Search for people to add:</label>
                        <div className="search-container">
                            <input
                                ref={searchInputRef}
                                id="contact-search"
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onClick={handleSearchClick}
                                placeholder="Search by username, first name, or last name..."
                                disabled={loading}
                            />
                            {shouldShowDropdown && (filteredSearchResults.length > 0 || searching || searchQuery.length > 0) && (
                                <div
                                    className="search-results"
                                    style={{
                                        top: dropdownPosition.top,
                                        left: dropdownPosition.left,
                                        width: dropdownPosition.width
                                    }}
                                >
                                    {searching ? (
                                        <div className="search-result-loading">
                                            <div className="loading-spinner"></div>
                                            <span>Searching users...</span>
                                        </div>
                                    ) : filteredSearchResults.length > 0 ? (
                                        filteredSearchResults.map((user) => (
                                            <div
                                                key={user.id}
                                                className="search-result-item"
                                                onClick={() => handleUserSelect(user)}
                                            >
                                                <div className="contact-avatar">
                                                    <img
                                                        src={getContactAvatar(user)}
                                                        alt={getContactName(user)}
                                                        onError={(e) => {
                                                            // Fallback to initials if image fails to load
                                                            e.currentTarget.style.display = 'none';
                                                            const fallback = e.currentTarget.parentElement?.querySelector('.avatar-fallback');
                                                            if (fallback) {
                                                                fallback.classList.remove('fallback');
                                                            }
                                                        }}
                                                    />
                                                    <div className="avatar-fallback">
                                                        {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                                                    </div>
                                                </div>
                                                <div className="contact-info">
                                                    <span className="contact-name">
                                                        {getContactName(user)}
                                                    </span>
                                                    <span className="contact-username">
                                                        @{user.username}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    ) : searchQuery && !searching ? (
                                        <div className="search-result-empty">
                                            <span>No users found</span>
                                            <small>Try searching with a different term</small>
                                        </div>
                                    ) : (
                                        <div className="search-result-empty">
                                            <span>Start typing to search for users</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Selected Users */}
                        {selectedUsers.length > 0 && (
                            <div className="selected-users">
                                <small>Selected users ({selectedUsers.length}):</small>
                                {selectedUsers.map((user) => (
                                    <div key={user.id} className="selected-user">
                                        <div className="selected-user-info">
                                            <div className="contact-avatar">
                                                <img
                                                    src={getContactAvatar(user)}
                                                    alt={getContactName(user)}
                                                    onError={(e) => {
                                                        // Fallback to initials if image fails to load
                                                        e.currentTarget.style.display = 'none';
                                                        const fallback = e.currentTarget.parentElement?.querySelector('.avatar-fallback');
                                                        if (fallback) {
                                                            fallback.classList.remove('fallback');
                                                        }
                                                    }}
                                                />
                                                <div className="avatar-fallback">
                                                    {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                                                </div>
                                            </div>
                                            <span>{getContactName(user)}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveUser(user.id)}
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
                        disabled={loading || selectedUsers.length === 0}
                    >
                        {loading ? 'Sending Requests...' : `Send ${selectedUsers.length} Request${selectedUsers.length !== 1 ? 's' : ''}`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddContactsModal; 
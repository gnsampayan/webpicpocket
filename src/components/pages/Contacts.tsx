import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Contacts.css';
import NavBar from '../ui/NavBar';
import UserAvatar from '../ui/UserAvatar';
import { useEmailVerification } from '../../context/EmailVerificationContext';
import {
    useContacts,
    useSearchUsers,
    useAcceptContactMutation,
    useRejectContactMutation,
    useCancelContactMutation,
    useDeleteContactMutation,
    useSendContactRequestMutation,
    getContactAvatar,
    getContactName,
} from '../../hooks/useContacts';
import * as ApiTypes from '../../types/api';

const Contacts: React.FC = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all');
    const [showAddContact, setShowAddContact] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const { showEmailVerification, setEmailVerifiedCallback } = useEmailVerification();

    // React Query hooks
    const { data: contactsData, isLoading, error } = useContacts();
    const { data: searchResults, isLoading: searching } = useSearchUsers(searchQuery);

    // Mutations
    const acceptContactMutation = useAcceptContactMutation();
    const rejectContactMutation = useRejectContactMutation();
    const cancelContactMutation = useCancelContactMutation();
    const deleteContactMutation = useDeleteContactMutation();
    const sendContactRequestMutation = useSendContactRequestMutation();

    // Extract data from contacts response
    const contacts = contactsData?.contacts || [];
    const contactRequestsReceived = contactsData?.contact_requests_received || [];
    const contactRequestsSent = contactsData?.contact_requests_sent || [];

    const handleAcceptContact = (userId: string) => {
        acceptContactMutation.mutate(userId);
    };

    const handleRejectContact = (userId: string) => {
        rejectContactMutation.mutate(userId);
    };

    const handleCancelContact = (userId: string) => {
        cancelContactMutation.mutate(userId);
    };

    const handleDeleteContact = (userId: string) => {
        deleteContactMutation.mutate(userId);
    };

    const handleSendContactRequest = (userId: string) => {
        sendContactRequestMutation.mutate(userId, {
            onSuccess: () => {
                setSearchQuery('');
                setShowAddContact(false);
            },
        });
    };

    const handleContactClick = (contact: ApiTypes.ContactUser) => {
        // Navigate to the profile route with the username
        navigate(`/contacts/${contact.username}`);
    };

    // Filter contacts based on search term and filter
    const filteredContacts = contacts.filter(contact => {
        const matchesSearch = contact.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contact.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contact.username.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filter === 'all' || filter === 'contacts';
        return matchesSearch && matchesFilter;
    });

    const filteredRequestsReceived = contactRequestsReceived.filter(contact => {
        const matchesSearch = contact.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contact.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contact.username.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filter === 'all' || filter === 'requests';
        return matchesSearch && matchesFilter;
    });

    const filteredRequestsSent = contactRequestsSent.filter(contact => {
        const matchesSearch = contact.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contact.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contact.username.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filter === 'all' || filter === 'sent';
        return matchesSearch && matchesFilter;
    });

    // Get error message for display
    const errorMessage = error instanceof Error ? error.message : error;



    if (isLoading) {
        return (
            <div className="contacts-page">
                <NavBar />
                <main className="main-content">
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>Loading contacts...</p>
                    </div>
                </main>
            </div>
        );
    }


    return (
        <div className="contacts-page">
            <NavBar />
            {/* Main Content */}
            <main className="main-content">
                {/* Header */}
                <header className="contacts-header">
                    <div className="header-left">
                        <h1>Contacts</h1>
                        <p>Manage your contacts and sharing permissions</p>
                    </div>
                    <div className="header-right">
                        <button
                            className="add-contact-button"
                            onClick={() => setShowAddContact(!showAddContact)}
                        >
                            <span>➕</span>
                            Add Contact
                        </button>
                        <div className="user-menu">
                            <UserAvatar size="medium" />
                        </div>
                    </div>
                </header>

                {/* Error Display */}
                {error && (
                    <div className="error-message">
                        <span>❌ {errorMessage}</span>
                        {typeof errorMessage === 'string' && errorMessage.includes('verify your email') && (
                            <button
                                className="verify-email-button"
                                onClick={() => {
                                    setEmailVerifiedCallback(() => () => {
                                        // Refetch contacts after email verification
                                        window.location.reload();
                                    });
                                    showEmailVerification();
                                }}
                            >
                                Verify Email
                            </button>
                        )}
                        <button onClick={() => window.location.reload()}>✕</button>
                    </div>
                )}

                {/* Add Contact Modal */}
                {showAddContact && (
                    <div className="add-contact-modal">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h3>Add New Contact</h3>
                                <button onClick={() => setShowAddContact(false)}>✕</button>
                            </div>
                            <div className="search-section">
                                <input
                                    type="text"
                                    placeholder="Search by username, first name, or last name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                {searching && <div className="searching-indicator">Searching...</div>}
                            </div>
                            <div className="search-results">
                                {searchResults?.map((user) => (
                                    <div key={user.id} className="search-result-item">
                                        <div className="user-info">
                                            <img
                                                src={getContactAvatar(user)}
                                                alt={getContactName(user)}
                                                onError={(e) => {
                                                    // Fallback if the profile picture fails to load
                                                    e.currentTarget.src = getContactAvatar(user);
                                                }}
                                            />
                                            <div>
                                                <h4>{getContactName(user)}</h4>
                                                <p>@{user.username}</p>
                                            </div>
                                        </div>
                                        <button
                                            className="send-request-button"
                                            onClick={() => handleSendContactRequest(user.id)}
                                        >
                                            Send Request
                                        </button>
                                    </div>
                                ))}
                                {searchQuery && !searching && (!searchResults || searchResults.length === 0) && (
                                    <p className="no-results">No users found</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Controls */}
                <section className="controls-section">
                    <div className="controls-left">
                        <div className="search-box">
                            <input
                                type="text"
                                placeholder="Search contacts..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <span>🔍</span>
                        </div>
                        <div className="filter-dropdown">
                            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                                <option value="all">All</option>
                                <option value="contacts">Contacts</option>
                                <option value="requests">Requests Received</option>
                                <option value="sent">Requests Sent</option>
                            </select>
                        </div>
                    </div>
                    <div className="controls-right">
                        <button className="import-button">
                            <span>📥</span>
                            Import Contacts
                        </button>
                    </div>
                </section>

                {/* Contacts List */}
                <section className="contacts-section">
                    <div className="contacts-header-row">
                        <h2>
                            {filter === 'all' && 'All Contacts'}
                            {filter === 'contacts' && 'My Contacts'}
                            {filter === 'requests' && 'Contact Requests'}
                            {filter === 'sent' && 'Sent Requests'}
                            {' '}
                            ({filteredContacts.length + filteredRequestsReceived.length + filteredRequestsSent.length})
                        </h2>
                        <div className="view-options">
                            <button className="view-option active">List</button>
                            <button className="view-option">Grid</button>
                        </div>
                    </div>

                    <div className="contacts-list">
                        {/* Contact Requests Received */}
                        {filteredRequestsReceived.map((contact) => (
                            <div key={`received-${contact.id}`} className="contact-item contact-request">
                                <div
                                    className="contact-avatar clickable"
                                    onClick={() => handleContactClick(contact)}
                                >
                                    <img
                                        src={getContactAvatar(contact)}
                                        alt={getContactName(contact)}
                                        onError={(e) => {
                                            // Fallback if the profile picture fails to load
                                            e.currentTarget.src = getContactAvatar(contact);
                                        }}
                                    />
                                    <span className="status-indicator pending"></span>
                                </div>
                                <div
                                    className="contact-info clickable"
                                    onClick={() => handleContactClick(contact)}
                                >
                                    <h3>{getContactName(contact)}</h3>
                                    <p className="contact-username">@{contact.username}</p>
                                    <p className="contact-status">Wants to connect with you</p>
                                </div>
                                <div className="contact-actions">
                                    <button
                                        className="action-button accept"
                                        onClick={() => handleAcceptContact(contact.id)}
                                    >
                                        <span>✓</span>
                                        Accept
                                    </button>
                                    <button
                                        className="action-button reject"
                                        onClick={() => handleRejectContact(contact.id)}
                                    >
                                        <span>✕</span>
                                        Reject
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Sent Contact Requests */}
                        {filteredRequestsSent.map((contact) => (
                            <div key={`sent-${contact.id}`} className="contact-item contact-request">
                                <div
                                    className="contact-avatar clickable"
                                    onClick={() => handleContactClick(contact)}
                                >
                                    <img
                                        src={getContactAvatar(contact)}
                                        alt={getContactName(contact)}
                                        onError={(e) => {
                                            // Fallback if the profile picture fails to load
                                            e.currentTarget.src = getContactAvatar(contact);
                                        }}
                                    />
                                    <span className="status-indicator pending"></span>
                                </div>
                                <div
                                    className="contact-info clickable"
                                    onClick={() => handleContactClick(contact)}
                                >
                                    <h3>{getContactName(contact)}</h3>
                                    <p className="contact-username">@{contact.username}</p>
                                    <p className="contact-status">Request sent</p>
                                </div>
                                <div className="contact-actions">
                                    <button
                                        className="action-button cancel"
                                        onClick={() => handleCancelContact(contact.id)}
                                    >
                                        <span>↶</span>
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Accepted Contacts */}
                        {filteredContacts.map((contact) => (
                            <div key={contact.id} className="contact-item">
                                <div
                                    className="contact-avatar clickable"
                                    onClick={() => handleContactClick(contact)}
                                >
                                    <img
                                        src={getContactAvatar(contact)}
                                        alt={getContactName(contact)}
                                        onError={(e) => {
                                            // Fallback if the profile picture fails to load
                                            e.currentTarget.src = getContactAvatar(contact);
                                        }}
                                    />
                                    <span className="status-indicator online"></span>
                                </div>
                                <div
                                    className="contact-info clickable"
                                    onClick={() => handleContactClick(contact)}
                                >
                                    <h3>{getContactName(contact)}</h3>
                                    <p className="contact-username">@{contact.username}</p>
                                </div>
                                <div className="contact-actions">
                                    <button className="action-button share">
                                        <span>📤</span>
                                        Share
                                    </button>
                                    <button className="action-button message">
                                        <span>💬</span>
                                        Message
                                    </button>
                                    <button
                                        className="action-button delete"
                                        onClick={() => handleDeleteContact(contact.id)}
                                    >
                                        <span>🗑️</span>
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Empty State */}
                        {filteredContacts.length === 0 &&
                            filteredRequestsReceived.length === 0 &&
                            filteredRequestsSent.length === 0 && (
                                <div className="empty-state">
                                    <div className="empty-icon">👥</div>
                                    <h3>No contacts found</h3>
                                    <p>
                                        {filter === 'all' && "You don't have any contacts yet. Start by adding some friends!"}
                                        {filter === 'contacts' && "You don't have any accepted contacts yet."}
                                        {filter === 'requests' && "No pending contact requests."}
                                        {filter === 'sent' && "No sent contact requests."}
                                    </p>
                                    {filter === 'all' && (
                                        <button
                                            className="add-contact-button"
                                            onClick={() => setShowAddContact(true)}
                                        >
                                            Add Your First Contact
                                        </button>
                                    )}
                                </div>
                            )}
                    </div>
                </section>
            </main>
        </div >
    );
};

export default Contacts; 
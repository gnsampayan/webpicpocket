import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Contacts.css';
import NavBar from '../ui/NavBar';
import UserAvatar from '../ui/UserAvatar';
import AddContactsModal from '../modals/AddContactsModal';
import { useEmailVerification } from '../../context/EmailVerificationContext';
import {
    useContacts,
    useAcceptContactMutation,
    useRejectContactMutation,
    useCancelContactMutation,
    useDeleteContactMutation,
    getContactAvatar,
    getContactName,
} from '../../hooks/useContacts';
import * as ApiTypes from '../../types/api';

const Contacts: React.FC = () => {
    const navigate = useNavigate();

    // Load initial state from localStorage
    const getInitialViewMode = (): 'grid' | 'list' => {
        const saved = localStorage.getItem('contacts-view-mode');
        return (saved === 'list' || saved === 'grid') ? saved : 'list';
    };

    const [viewMode, setViewMode] = useState<'grid' | 'list'>(getInitialViewMode);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all');
    const [showAddContact, setShowAddContact] = useState(false);
    const { showEmailVerification, setEmailVerifiedCallback } = useEmailVerification();

    // Functions to save state to localStorage
    const saveViewMode = (mode: 'grid' | 'list') => {
        localStorage.setItem('contacts-view-mode', mode);
    };

    // Wrapper functions to update state and save to localStorage
    const handleViewModeChange = (mode: 'grid' | 'list') => {
        setViewMode(mode);
        saveViewMode(mode);
    };

    // React Query hooks
    const { data: contactsData, isLoading, error, refetch } = useContacts();

    // Mutations
    const acceptContactMutation = useAcceptContactMutation();
    const rejectContactMutation = useRejectContactMutation();
    const cancelContactMutation = useCancelContactMutation();
    const deleteContactMutation = useDeleteContactMutation();

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

    const handleContactAdded = () => {
        setShowAddContact(false);
        refetch(); // Refresh the contacts list
    };

    const handleContactClick = (contact: ApiTypes.ContactUser) => {
        // Navigate to the profile route with the user ID
        navigate(`/profile/${contact.id}`);
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
                            <UserAvatar size="medium" clickable={true} />
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

                {/* Add Contacts Modal */}
                <AddContactsModal
                    isOpen={showAddContact}
                    onClose={() => setShowAddContact(false)}
                    onContactAdded={handleContactAdded}
                />

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
                            <span className="search-icon">🔍</span>
                            {searchTerm.trim() && (
                                <button
                                    className="clear-search-button"
                                    onClick={() => setSearchTerm('')}
                                    type="button"
                                    aria-label="Clear search"
                                >
                                    ✕
                                </button>
                            )}
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
                        <div className="view-toggle">
                            <button
                                className={`view-button ${viewMode === 'grid' ? 'active' : ''}`}
                                onClick={() => handleViewModeChange('grid')}
                            >
                                <span>⊞</span>
                            </button>
                            <button
                                className={`view-button ${viewMode === 'list' ? 'active' : ''}`}
                                onClick={() => handleViewModeChange('list')}
                            >
                                <span>☰</span>
                            </button>
                        </div>
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
                            {searchTerm.trim() ? (
                                <>
                                    Search Results
                                    <span className="search-results-info">
                                        {filteredContacts.length + filteredRequestsReceived.length + filteredRequestsSent.length} contact{(filteredContacts.length + filteredRequestsReceived.length + filteredRequestsSent.length) !== 1 ? 's' : ''} found for "{searchTerm}"
                                    </span>
                                </>
                            ) : (
                                <>
                                    {filter === 'all' && 'All Contacts'}
                                    {filter === 'contacts' && 'My Contacts'}
                                    {filter === 'requests' && 'Contact Requests'}
                                    {filter === 'sent' && 'Sent Requests'}
                                    {' '}
                                    ({filteredContacts.length + filteredRequestsReceived.length + filteredRequestsSent.length})
                                </>
                            )}
                        </h2>
                    </div>

                    <div className={`contacts-container ${viewMode === 'list' ? 'contacts-list' : 'contacts-grid'}`}>
                        {/* Contact Requests Received */}
                        {filteredRequestsReceived.map((contact) => (
                            <div key={`received-${contact.id}`} className={`contact-item contact-request ${viewMode === 'list' ? 'contact-list-item' : 'contact-grid-item'}`}>
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
                            <div key={`sent-${contact.id}`} className={`contact-item contact-request ${viewMode === 'list' ? 'contact-list-item' : 'contact-grid-item'}`}>
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
                            <div key={contact.id} className={`contact-item ${viewMode === 'list' ? 'contact-list-item' : 'contact-grid-item'}`}>
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
import React, { useState, useEffect } from 'react';
import './Contacts.css';
import NavBar from './NavBar';
import { api } from '../services/api';
import * as ApiTypes from '../types/api';

const Contacts: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [contacts, setContacts] = useState<ApiTypes.ContactUser[]>([]);
    const [contactRequestsReceived, setContactRequestsReceived] = useState<ApiTypes.ContactUser[]>([]);
    const [contactRequestsSent, setContactRequestsSent] = useState<ApiTypes.ContactUser[]>([]);
    const [showAddContact, setShowAddContact] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<ApiTypes.ContactUser[]>([]);
    const [searching, setSearching] = useState(false);

    // Fetch contacts on component mount
    useEffect(() => {
        fetchContacts();
    }, []);

    const fetchContacts = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.getContacts();
            setContacts(response.contacts || []);
            setContactRequestsReceived(response.contact_requests_received || []);
            setContactRequestsSent(response.contact_requests_sent || []);
        } catch (err) {
            console.error('Failed to fetch contacts:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch contacts');
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptContact = async (userId: string) => {
        try {
            await api.updateContact(userId, { accept: true });
            await fetchContacts(); // Refresh the contacts list
        } catch (err) {
            console.error('Failed to accept contact:', err);
            setError(err instanceof Error ? err.message : 'Failed to accept contact request');
        }
    };

    const handleRejectContact = async (userId: string) => {
        try {
            await api.updateContact(userId, { reject: true });
            await fetchContacts(); // Refresh the contacts list
        } catch (err) {
            console.error('Failed to reject contact:', err);
            setError(err instanceof Error ? err.message : 'Failed to reject contact request');
        }
    };

    const handleCancelContact = async (userId: string) => {
        try {
            await api.updateContact(userId, { cancel: true });
            await fetchContacts(); // Refresh the contacts list
        } catch (err) {
            console.error('Failed to cancel contact:', err);
            setError(err instanceof Error ? err.message : 'Failed to cancel contact request');
        }
    };

    const handleDeleteContact = async (userId: string) => {
        try {
            await api.deleteContact(userId);
            await fetchContacts(); // Refresh the contacts list
        } catch (err) {
            console.error('Failed to delete contact:', err);
            setError(err instanceof Error ? err.message : 'Failed to delete contact');
        }
    };

    const handleSearchUsers = async (query: string) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        try {
            setSearching(true);
            const results = await api.getOtherUsersData(query);
            setSearchResults(results);
        } catch (err) {
            console.error('Failed to search users:', err);
            setSearchResults([]);
        } finally {
            setSearching(false);
        }
    };

    const handleSendContactRequest = async (userId: string) => {
        try {
            await api.sendContactRequest(userId);
            setSearchResults([]);
            setSearchQuery('');
            setShowAddContact(false);
            await fetchContacts(); // Refresh to show the sent request
        } catch (err) {
            console.error('Failed to send contact request:', err);
            setError(err instanceof Error ? err.message : 'Failed to send contact request');
        }
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

    // Default placeholder image as data URI for better reliability
    const DEFAULT_PROFILE_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjUiIGN5PSIyNSIgcj0iMjUiIGZpbGw9IiM2NjdlZWEiLz4KPGNpcmNsZSBjeD0iMjUiIGN5PSIyMCIgcj0iOCIgZmlsbD0iI2ZmZmZmZiIgZmlsbC1vcGFjaXR5PSIwLjgiLz4KPHBhdGggZD0iTTEwIDQwQzEwIDM1IDE1IDMwIDI1IDMwQzM1IDMwIDQwIDM1IDQwIDQwIiBmaWxsPSIjZmZmZmZmIiBmaWxsLW9wYWNpdHk9IjAuOCIvPgo8L3N2Zz4K';

    const getContactAvatar = (contact: ApiTypes.ContactUser): string => {
        let rawUrl: string | undefined;

        // Handle different profile picture formats from API (like React Native does)
        if (contact.profile_picture_url) {
            rawUrl = contact.profile_picture_url;
        }

        if (!rawUrl) {
            return DEFAULT_PROFILE_PLACEHOLDER;
        }

        // URLs are already perfect S3 signed URLs - no decoding needed!
        // If it's already HTTP, return as-is
        if (rawUrl.startsWith("http")) {
            return rawUrl;
        }

        // If it doesn't start with http, add https:// (fallback)
        return `https://${rawUrl}`;
    };

    const getContactName = (contact: ApiTypes.ContactUser) => {
        return `${contact.first_name} ${contact.last_name}`;
    };

    if (loading) {
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
                            <img src="https://picsum.photos/40/40?random=1" alt="User" className="user-avatar" />
                        </div>
                    </div>
                </header>

                {/* Error Display */}
                {error && (
                    <div className="error-message">
                        <span>❌ {error}</span>
                        <button onClick={() => setError(null)}>✕</button>
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
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        handleSearchUsers(e.target.value);
                                    }}
                                />
                                {searching && <div className="searching-indicator">Searching...</div>}
                            </div>
                            <div className="search-results">
                                {searchResults.map((user) => (
                                    <div key={user.id} className="search-result-item">
                                        <div className="user-info">
                                            <img
                                                src={getContactAvatar(user)}
                                                alt={getContactName(user)}
                                                onError={(e) => {
                                                    // Fallback if the profile picture fails to load
                                                    e.currentTarget.src = DEFAULT_PROFILE_PLACEHOLDER;
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
                                {searchQuery && !searching && searchResults.length === 0 && (
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
                                <div className="contact-avatar">
                                    <img
                                        src={getContactAvatar(contact)}
                                        alt={getContactName(contact)}
                                        onError={(e) => {
                                            // Fallback if the profile picture fails to load
                                            e.currentTarget.src = DEFAULT_PROFILE_PLACEHOLDER;
                                        }}
                                    />
                                    <span className="status-indicator pending"></span>
                                </div>
                                <div className="contact-info">
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
                                <div className="contact-avatar">
                                    <img
                                        src={getContactAvatar(contact)}
                                        alt={getContactName(contact)}
                                        onError={(e) => {
                                            // Fallback if the profile picture fails to load
                                            e.currentTarget.src = DEFAULT_PROFILE_PLACEHOLDER;
                                        }}
                                    />
                                    <span className="status-indicator pending"></span>
                                </div>
                                <div className="contact-info">
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
                                <div className="contact-avatar">
                                    <img
                                        src={getContactAvatar(contact)}
                                        alt={getContactName(contact)}
                                        onError={(e) => {
                                            // Fallback if the profile picture fails to load
                                            e.currentTarget.src = DEFAULT_PROFILE_PLACEHOLDER;
                                        }}
                                    />
                                    <span className="status-indicator online"></span>
                                </div>
                                <div className="contact-info">
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
        </div>
    );
};

export default Contacts; 
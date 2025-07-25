import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Contacts.module.css';
import NavBar from '../ui/NavBar';
import UserAvatar from '../ui/UserAvatar';
import AddContactsModal from '../modals/AddContactsModal';
import AddPlaceholderModal from '../modals/AddPlaceholderModal';
import EditPlaceholderModal from '../modals/EditPlaceholderModal';
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
    const [showAddPlaceholder, setShowAddPlaceholder] = useState(false);
    const [showEditPlaceholder, setShowEditPlaceholder] = useState(false);
    const [selectedPlaceholder, setSelectedPlaceholder] = useState<ApiTypes.PlaceholderContact | null>(null);
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
    const placeholderContacts = contactsData?.placeholder_contacts || [];

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
        const confirmed = window.confirm('Are you sure you want to remove this contact? This action cannot be undone.');
        if (confirmed) {
            deleteContactMutation.mutate(userId);
        }
    };

    const handleContactAdded = () => {
        setShowAddContact(false);
        refetch(); // Refresh the contacts list
    };

    const handleAddPlaceholderContact = () => {
        setShowAddPlaceholder(true);
    };

    const handlePlaceholderAdded = () => {
        setShowAddPlaceholder(false);
        // The mutation hook will automatically invalidate the contacts cache
    };

    const handleEditPlaceholder = (placeholder: ApiTypes.PlaceholderContact) => {
        setSelectedPlaceholder(placeholder);
        setShowEditPlaceholder(true);
    };

    const handlePlaceholderUpdated = () => {
        setShowEditPlaceholder(false);
        setSelectedPlaceholder(null);
        // The mutation hook will automatically invalidate the contacts cache
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

    const filteredPlaceholderContacts = placeholderContacts.filter(contact => {
        const matchesSearch = contact.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contact.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (contact.username && contact.username.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesFilter = filter === 'all' || filter === 'placeholders';
        return matchesSearch && matchesFilter;
    });

    // Get error message for display
    const errorMessage = error instanceof Error ? error.message : error;



    if (isLoading) {
        return (
            <div className={styles.contactsPage}>
                <NavBar />
                <main className={styles.mainContent}>
                    <div className={styles.loadingState}>
                        <div className={styles.loadingSpinner}></div>
                        <p>Loading contacts...</p>
                    </div>
                </main>
            </div>
        );
    }


    return (
        <div className={styles.contactsPage}>
            <NavBar />
            {/* Main Content */}
            <main className={styles.mainContent}>
                {/* Header */}
                <header className={styles.contactsHeader}>
                    <div className={styles.headerLeft}>
                        <h1>Contacts</h1>
                        <p>Manage your contacts and sharing permissions</p>
                    </div>
                    <div className={styles.headerRight}>
                        <button
                            className={styles.addPlaceholderButton}
                            onClick={handleAddPlaceholderContact}
                            title="Add a placeholder contact for someone without an account"
                        >
                            <span>🎭</span>
                            Add Placeholder
                        </button>
                        <button
                            className={styles.addContactButton}
                            onClick={() => setShowAddContact(!showAddContact)}
                        >
                            <span>➕</span>
                            Add Contact
                        </button>
                        <div className={styles.userMenu}>
                            <UserAvatar size="medium" clickable={true} />
                        </div>
                    </div>
                </header>

                {/* Error Display */}
                {error && (
                    <div className={styles.errorMessage}>
                        <span>❌ {errorMessage}</span>
                        {typeof errorMessage === 'string' && errorMessage.includes('verify your email') && (
                            <button
                                className={styles.verifyEmailButton}
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

                {/* Add Placeholder Modal */}
                <AddPlaceholderModal
                    isOpen={showAddPlaceholder}
                    onClose={() => setShowAddPlaceholder(false)}
                    onPlaceholderAdded={handlePlaceholderAdded}
                />

                {/* Edit Placeholder Modal */}
                <EditPlaceholderModal
                    isOpen={showEditPlaceholder}
                    onClose={() => setShowEditPlaceholder(false)}
                    onPlaceholderUpdated={handlePlaceholderUpdated}
                    placeholder={selectedPlaceholder}
                />

                {/* Controls */}
                <section className={styles.controlsSection}>
                    <div className={styles.controlsLeft}>
                        <div className={styles.searchBox}>
                            <input
                                type="text"
                                placeholder="Search contacts..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <span className={styles.searchIcon}>🔍</span>
                            {searchTerm.trim() && (
                                <button
                                    className={styles.clearSearchButton}
                                    onClick={() => setSearchTerm('')}
                                    type="button"
                                    aria-label="Clear search"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>
                    <div className={styles.controlsRight}>
                        <div className={styles.viewToggle}>
                            <button
                                className={`${styles.viewButton} ${viewMode === 'grid' ? styles.active : ''}`}
                                onClick={() => handleViewModeChange('grid')}
                            >
                                <span>⊞</span>
                            </button>
                            <button
                                className={`${styles.viewButton} ${viewMode === 'list' ? styles.active : ''}`}
                                onClick={() => handleViewModeChange('list')}
                            >
                                <span>☰</span>
                            </button>
                        </div>
                        <div className={styles.filterDropdown}>
                            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                                <option value="all">All</option>
                                <option value="contacts">Contacts</option>
                                <option value="requests">Requests Received</option>
                                <option value="sent">Requests Sent</option>
                                <option value="placeholders">Placeholders</option>
                            </select>
                        </div>
                    </div>
                </section>

                {/* Contacts List */}
                <section className={styles.contactsSection}>
                    <h2>
                        {searchTerm.trim() ? (
                            <>
                                Search Results
                                <span className={styles.searchResultsInfo}>
                                    {filteredContacts.length + filteredRequestsReceived.length + filteredRequestsSent.length + filteredPlaceholderContacts.length} contact{(filteredContacts.length + filteredRequestsReceived.length + filteredRequestsSent.length + filteredPlaceholderContacts.length) !== 1 ? 's' : ''} found for "{searchTerm}"
                                </span>
                            </>
                        ) : (
                            <>
                                {filter === 'all' && 'All Contacts'}
                                {filter === 'contacts' && 'My Contacts'}
                                {filter === 'requests' && 'Contact Requests'}
                                {filter === 'sent' && 'Sent Requests'}
                                {filter === 'placeholders' && 'Placeholder Contacts'}
                                {' '}
                                ({filteredContacts.length + filteredRequestsReceived.length + filteredRequestsSent.length + filteredPlaceholderContacts.length})
                            </>
                        )}
                    </h2>

                    {/* Show contacts container only when there are contacts to display */}
                    {(filteredContacts.length > 0 || filteredRequestsReceived.length > 0 || filteredRequestsSent.length > 0 || filteredPlaceholderContacts.length > 0) ? (
                        <div className={`${styles.contactsContainer} ${viewMode === 'list' ? styles.contactsList : styles.contactsGrid}`}>
                            {/* Placeholder Contacts - Show first when filter is "All" */}
                            {filter === 'all' && filteredPlaceholderContacts.map((contact) => (
                                <div key={contact.id} className={`${styles.contactItem} ${styles.contactPlaceholder} ${viewMode === 'list' ? styles.contactListItem : styles.contactGridItem}`}>
                                    <div
                                        className={`${styles.contactAvatar} ${styles.clickable}`}
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
                                        <span className={`${styles.statusIndicator} ${styles.placeholder}`}></span>
                                    </div>
                                    <div
                                        className={`${styles.contactInfo} ${styles.clickable}`}
                                        onClick={() => handleContactClick(contact)}
                                    >
                                        <h3>{getContactName(contact)}</h3>
                                        <p className={styles.contactUsername}>🎭 Placeholder</p>
                                        {contact.description && (
                                            <p className={styles.contactDescription}>{contact.description}</p>
                                        )}
                                    </div>
                                    <div className={styles.contactActions}>
                                        <button
                                            className={`${styles.actionButton} ${styles.edit}`}
                                            onClick={() => handleEditPlaceholder(contact)}
                                            title="Edit placeholder"
                                        >
                                            <span>✏️</span>
                                            Edit
                                        </button>
                                        <button className={`${styles.actionButton} ${styles.share}`}>
                                            <span>📤</span>
                                            Share
                                        </button>
                                        <button className={`${styles.actionButton} ${styles.more}`}>
                                            <span>💬</span>
                                            Message
                                        </button>
                                        <button
                                            className={`${styles.actionButton} ${styles.delete}`}
                                            onClick={() => handleDeleteContact(contact.id)}
                                        >
                                            <span>🗑️</span>
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {/* Contact Requests Received */}
                            {filteredRequestsReceived.map((contact) => (
                                <div key={`received-${contact.id}`} className={`${styles.contactItem} ${styles.contactRequest} ${viewMode === 'list' ? styles.contactListItem : styles.contactGridItem}`}>
                                    <div
                                        className={`${styles.contactAvatar} ${styles.clickable}`}
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
                                        <span className={`${styles.statusIndicator} ${styles.pending}`}></span>
                                    </div>
                                    <div
                                        className={`${styles.contactInfo} ${styles.clickable}`}
                                        onClick={() => handleContactClick(contact)}
                                    >
                                        <h3>{getContactName(contact)}</h3>
                                        <p className={styles.contactUsername}>@{contact.username}</p>
                                        <p className={styles.contactStatus}>Wants to connect with you</p>
                                    </div>
                                    <div className={styles.contactActions}>
                                        <button
                                            className={`${styles.actionButton} ${styles.accept}`}
                                            onClick={() => handleAcceptContact(contact.id)}
                                        >
                                            <span>✓</span>
                                            Accept
                                        </button>
                                        <button
                                            className={`${styles.actionButton} ${styles.reject}`}
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
                                <div key={`sent-${contact.id}`} className={`${styles.contactItem} ${styles.contactRequest} ${viewMode === 'list' ? styles.contactListItem : styles.contactGridItem}`}>
                                    <div
                                        className={`${styles.contactAvatar} ${styles.clickable}`}
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
                                        <span className={`${styles.statusIndicator} ${styles.pending}`}></span>
                                    </div>
                                    <div
                                        className={`${styles.contactInfo} ${styles.clickable}`}
                                        onClick={() => handleContactClick(contact)}
                                    >
                                        <h3>{getContactName(contact)}</h3>
                                        <p className={styles.contactUsername}>@{contact.username}</p>
                                        <p className={styles.contactStatus}>Request sent</p>
                                    </div>
                                    <div className={styles.contactActions}>
                                        <button
                                            className={`${styles.actionButton} ${styles.cancel}`}
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
                                <div key={contact.id} className={`${styles.contactItem} ${viewMode === 'list' ? styles.contactListItem : styles.contactGridItem}`}>
                                    <div
                                        className={`${styles.contactAvatar} ${styles.clickable}`}
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
                                        <span className={`${styles.statusIndicator} ${styles.online}`}></span>
                                    </div>
                                    <div
                                        className={`${styles.contactInfo} ${styles.clickable}`}
                                        onClick={() => handleContactClick(contact)}
                                    >
                                        <h3>{getContactName(contact)}</h3>
                                        <p className={styles.contactUsername}>@{contact.username}</p>
                                    </div>
                                    <div className={styles.contactActions}>
                                        <button className={`${styles.actionButton} ${styles.share}`}>
                                            <span>📤</span>
                                            Share
                                        </button>
                                        <button className={`${styles.actionButton} ${styles.more}`}>
                                            <span>💬</span>
                                            Message
                                        </button>
                                        <button
                                            className={`${styles.actionButton} ${styles.delete}`}
                                            onClick={() => handleDeleteContact(contact.id)}
                                        >
                                            <span>🗑️</span>
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {/* Placeholder Contacts - Show when filter is specifically "placeholders" */}
                            {filter === 'placeholders' && filteredPlaceholderContacts.map((contact) => (
                                <div key={contact.id} className={`${styles.contactItem} ${styles.contactPlaceholder} ${viewMode === 'list' ? styles.contactListItem : styles.contactGridItem}`}>
                                    <div
                                        className={`${styles.contactAvatar} ${styles.clickable}`}
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
                                        <span className={`${styles.statusIndicator} ${styles.placeholder}`}></span>
                                    </div>
                                    <div
                                        className={`${styles.contactInfo} ${styles.clickable}`}
                                        onClick={() => handleContactClick(contact)}
                                    >
                                        <h3>{getContactName(contact)}</h3>
                                        <p className={styles.contactUsername}>🎭 Placeholder</p>
                                        {contact.description && (
                                            <p className={styles.contactDescription}>{contact.description}</p>
                                        )}
                                    </div>
                                    <div className={styles.contactActions}>
                                        <button
                                            className={`${styles.actionButton} ${styles.edit}`}
                                            onClick={() => handleEditPlaceholder(contact)}
                                            title="Edit placeholder"
                                        >
                                            <span>✏️</span>
                                            Edit
                                        </button>
                                        <button className={`${styles.actionButton} ${styles.share}`}>
                                            <span>📤</span>
                                            Share
                                        </button>
                                        <button className={`${styles.actionButton} ${styles.more}`}>
                                            <span>💬</span>
                                            Message
                                        </button>
                                        <button
                                            className={`${styles.actionButton} ${styles.delete}`}
                                            onClick={() => handleDeleteContact(contact.id)}
                                        >
                                            <span>🗑️</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* Empty State - Outside of any container */
                        <div className={styles.emptyState}>
                            {searchTerm.trim() ? (
                                <>
                                    <div className={`${styles.emptyStateIcon} ${styles.searchIcon}`}>
                                        <div className={styles.searchGlass}>
                                            <div className={styles.magnifyingGlass}>
                                                <div className={styles.glassCircle}></div>
                                                <div className={styles.glassHandle}></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={styles.emptyStateContent}>
                                        <h3>No contacts found</h3>
                                        <p>No contacts match "{searchTerm}". Try a different search term or check your spelling.</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className={styles.emptyStateContent}>
                                        <h3>No contacts found</h3>
                                        <p>
                                            {filter === 'all' && "You don't have any contacts yet. Start by adding some friends!"}
                                            {filter === 'contacts' && "You don't have any accepted contacts yet."}
                                            {filter === 'requests' && "No pending contact requests."}
                                            {filter === 'sent' && "No sent contact requests."}
                                            {filter === 'placeholders' && "No placeholder contacts yet."}
                                        </p>
                                    </div>
                                    {filter === 'all' && (
                                        <div
                                            className={styles.emptyStateCta}
                                            onClick={() => setShowAddContact(true)}
                                        >
                                            <div className={styles.ctaContent}>
                                                <div className={styles.ctaIcon}>✨</div>
                                                <div className={styles.ctaText}>
                                                    <span className={styles.ctaTitle}>Add Your First Contact</span>
                                                    <span className={styles.ctaSubtitle}>Click here to get started</span>
                                                </div>
                                            </div>
                                            <div className={styles.ctaArrow}>→</div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </section>
            </main>
        </div >
    );
};

export default Contacts; 
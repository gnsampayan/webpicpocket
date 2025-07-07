import React, { useState } from 'react';
import './Contacts.css';
import NavBar from './NavBar';

const Contacts: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all');

    const contacts = [
        { id: 1, name: 'Sarah Johnson', email: 'sarah@example.com', phone: '+1 (555) 123-4567', avatar: 'https://picsum.photos/50/50?random=1', status: 'online' },
        { id: 2, name: 'Mike Chen', email: 'mike@example.com', phone: '+1 (555) 234-5678', avatar: 'https://picsum.photos/50/50?random=2', status: 'offline' },
        { id: 3, name: 'Emily Davis', email: 'emily@example.com', phone: '+1 (555) 345-6789', avatar: 'https://picsum.photos/50/50?random=3', status: 'online' },
        { id: 4, name: 'David Wilson', email: 'david@example.com', phone: '+1 (555) 456-7890', avatar: 'https://picsum.photos/50/50?random=4', status: 'away' },
        { id: 5, name: 'Lisa Brown', email: 'lisa@example.com', phone: '+1 (555) 567-8901', avatar: 'https://picsum.photos/50/50?random=5', status: 'online' },
        { id: 6, name: 'John Smith', email: 'john@example.com', phone: '+1 (555) 678-9012', avatar: 'https://picsum.photos/50/50?random=6', status: 'offline' }
    ];

    const filteredContacts = contacts.filter(contact => {
        const matchesSearch = contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contact.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filter === 'all' || contact.status === filter;
        return matchesSearch && matchesFilter;
    });

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
                        <button className="add-contact-button">
                            <span>➕</span>
                            Add Contact
                        </button>
                        <div className="user-menu">
                            <img src="https://picsum.photos/40/40?random=1" alt="User" className="user-avatar" />
                        </div>
                    </div>
                </header>

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
                                <option value="all">All Contacts</option>
                                <option value="online">Online</option>
                                <option value="offline">Offline</option>
                                <option value="away">Away</option>
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
                        <h2>All Contacts ({filteredContacts.length})</h2>
                        <div className="view-options">
                            <button className="view-option active">List</button>
                            <button className="view-option">Grid</button>
                        </div>
                    </div>

                    <div className="contacts-list">
                        {filteredContacts.map((contact) => (
                            <div key={contact.id} className="contact-item">
                                <div className="contact-avatar">
                                    <img src={contact.avatar} alt={contact.name} />
                                    <span className={`status-indicator ${contact.status}`}></span>
                                </div>
                                <div className="contact-info">
                                    <h3>{contact.name}</h3>
                                    <p className="contact-email">{contact.email}</p>
                                    <p className="contact-phone">{contact.phone}</p>
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
                                    <button className="action-button more">
                                        <span>⋯</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
};

export default Contacts; 
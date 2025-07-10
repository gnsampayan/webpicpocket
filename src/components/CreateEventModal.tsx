import React, { useState, useRef, useEffect } from 'react';
import './CreateEventModal.css';
import UserAvatar from './UserAvatar';
import { api } from '../services/api';
import { type ContactUser, type Event } from '../types';

interface CreateEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onEventCreated: (newEvent: Event) => void;
    pocketId: string;
}

const CreateEventModal: React.FC<CreateEventModalProps> = ({
    isOpen,
    onClose,
    onEventCreated,
    pocketId
}) => {
    const [title, setTitle] = useState('');
    const [selectedMembers, setSelectedMembers] = useState<ContactUser[]>([]);
    const [memberSearchTerm, setMemberSearchTerm] = useState('');
    const [contacts, setContacts] = useState<ContactUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Refs for dropdown control
    const memberInputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [showMemberDropdown, setShowMemberDropdown] = useState(false);
    const [isLoadingContacts, setIsLoadingContacts] = useState(false);
    const [abortController, setAbortController] = useState<AbortController | null>(null);
    const [requestId, setRequestId] = useState<string>('');

    // Fetch contacts when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchContacts();
        }
    }, [isOpen]);

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
        }
    }, [isOpen, abortController]);

    const fetchContacts = async () => {
        if (isLoadingContacts) return;

        const newRequestId = Math.random().toString(36);
        setRequestId(newRequestId);
        setIsLoadingContacts(true);

        const controller = new AbortController();
        setAbortController(controller);

        try {
            const contactsData = await api.getContacts(controller.signal);
            if (requestId === newRequestId) {
                setContacts(contactsData.contacts);
            }
        } catch (err) {
            if (requestId === newRequestId && err instanceof Error && err.name !== 'AbortError') {
                console.error('Error fetching contacts:', err);
                setError('Failed to load contacts');
            }
        } finally {
            if (requestId === newRequestId) {
                setIsLoadingContacts(false);
                setAbortController(null);
            }
        }
    };

    const handleMemberInputClick = () => {
        if (!showMemberDropdown) {
            setShowMemberDropdown(true);
            if (contacts.length === 0) {
                fetchContacts();
            }
        }
    };

    const handleMemberInputBlur = () => {
        // Small delay to allow clicking on dropdown items
        setTimeout(() => {
            setShowMemberDropdown(false);
        }, 100);
    };

    const handleMemberSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setMemberSearchTerm(value);

        if (!showMemberDropdown) {
            setShowMemberDropdown(true);
        }
    };

    const handleMemberSelect = (contact: ContactUser) => {
        if (!selectedMembers.find(member => member.id === contact.id)) {
            setSelectedMembers(prev => [...prev, contact]);
        }
        setMemberSearchTerm('');
        setShowMemberDropdown(false);
    };

    const handleRemoveMember = (memberId: string) => {
        setSelectedMembers(prev => prev.filter(member => member.id !== memberId));
    };

    const filteredContacts = contacts.filter(contact =>
        contact.username?.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
        contact.first_name?.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
        contact.last_name?.toLowerCase().includes(memberSearchTerm.toLowerCase())
    );

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
                eventData.members = selectedMembers.map(member => member.id);
            }

            console.log('Creating event with data:', eventData);
            console.log('Request body JSON:', JSON.stringify(eventData, null, 2));
            const newEvent = await api.createEvent(eventData);

            console.log('✅ Event created successfully:', newEvent);
            onEventCreated(newEvent);
            onClose();
        } catch (err) {
            console.error('Error creating event:', err);
            setError(err instanceof Error ? err.message : 'Failed to create event');
        } finally {
            setLoading(false);
        }
    };

    const handleModalClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleModalClick}>
            <div className="modal-content">
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
                        <div className="member-input-container">
                            <input
                                ref={memberInputRef}
                                type="text"
                                value={memberSearchTerm}
                                onChange={handleMemberSearchChange}
                                onClick={handleMemberInputClick}
                                onBlur={handleMemberInputBlur}
                                placeholder="Search contacts to add..."
                                disabled={loading}
                            />

                            {showMemberDropdown && (
                                <div ref={dropdownRef} className="member-dropdown">
                                    {isLoadingContacts ? (
                                        <div className="dropdown-loading">
                                            <div className="loading-spinner"></div>
                                            <span>Loading contacts...</span>
                                        </div>
                                    ) : filteredContacts.length > 0 ? (
                                        filteredContacts.map(contact => (
                                            <div
                                                key={contact.id}
                                                className="dropdown-item"
                                                onClick={() => handleMemberSelect(contact)}
                                            >
                                                <UserAvatar size="small" />
                                                <span>{contact.first_name} {contact.last_name}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="dropdown-empty">
                                            {memberSearchTerm ? 'No contacts found' : 'No contacts available'}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {selectedMembers.length > 0 && (
                            <div className="selected-members">
                                {selectedMembers.map(member => (
                                    <div key={member.id} className="selected-member">
                                        <UserAvatar size="small" />
                                        <span>{member.first_name} {member.last_name}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveMember(member.id)}
                                            className="remove-member-button"
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
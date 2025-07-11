import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './EventView.css';
import NavBar from './NavBar';
import UserAvatar from './UserAvatar';
import CreateEventModal from './CreateEventModal';

import { api } from '../services/api';
import { type Pocket, type Event, type PreviewPhoto, type PocketMember, type ContactUser } from '../types';

const EventView: React.FC = () => {
    const { pocketId } = useParams<{ pocketId: string }>();
    const navigate = useNavigate();

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // State for pocket and events data
    const [pocket, setPocket] = useState<Pocket | null>(null);
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Default placeholder images as data URI for better reliability
    const DEFAULT_EVENT_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjNjY3ZWVhIi8+CjxyZWN0IHg9IjQwIiB5PSI0MCIgd2lkdGg9IjEyMCIgaGVpZ2h0PSI3MCIgcng9IjgiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4yIi8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjY1IiByPSIxNSIgZmlsbD0iI2ZmZmZmZiIgZmlsbC1vcGFjaXR5PSIwLjYiLz4KPHBhdGggZD0iTTkwIDc1TDk1IDgwTDEwNSA3MEwxMTUgODBMMTIwIDc1IiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIgc3Ryb2tlLW9wYWNpdHk9IjAuNiIvPgo8dGV4dCB4PSIxMDAiIHk9IjEzMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmaWxsPSIjZmZmZmZmIiBmaWxsLW9wYWNpdHk9IjAuOCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Tm8gUGhvdG9zPC90ZXh0Pgo8L3N2Zz4K';
    const DEFAULT_PROFILE_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjUiIGN5PSIyNSIgcj0iMjUiIGZpbGw9IiM2NjdlZWEiLz4KPGNpcmNsZSBjeD0iMjUiIGN5PSIyMCIgcj0iOCIgZmlsbD0iI2ZmZmZmZiIgZmlsbC1vcGFjaXR5PSIwLjgiLz4KPHBhdGggZD0iTTEwIDQwQzEwIDM1IDE1IDMwIDI1IDMwQzM1IDMwIDQwIDM1IDQwIDQwIiBmaWxsPSIjZmZmZmZmIiBmaWxsLW9wYWNpdHk9IjAuOCIvPgo8L3N2Zz4K';

    // Fetch pocket and events data when component mounts or pocketId changes
    useEffect(() => {
        const fetchPocketAndEvents = async () => {
            if (!pocketId) {
                setError('No pocket ID provided');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                // Fetch pocket details
                const pocketsData = await api.getPockets();
                const currentPocket = pocketsData.find(p => p.pocket_id === pocketId);

                if (!currentPocket) {
                    throw new Error('Pocket not found');
                }

                setPocket(currentPocket);

                // Fetch events for this pocket
                const eventsData = await api.getEvents(pocketId);
                setEvents(eventsData);

                console.log('EventView loaded pocket:', currentPocket);
                console.log('EventView loaded events:', eventsData);
            } catch (err) {
                console.error('Error fetching pocket and events:', err);
                setError(err instanceof Error ? err.message : 'Failed to load pocket and events');
            } finally {
                setLoading(false);
            }
        };

        fetchPocketAndEvents();
    }, [pocketId]);

    // Debug: Log events data when component mounts or events change
    useEffect(() => {
        console.log('EventView received events:', events);
        console.log('Events length:', events?.length);
        if (events && events.length > 0) {
            console.log('First event:', events[0]);
            console.log('First event preview_photos:', events[0].preview_photos);
        }
    }, [events]);

    // Filter events based on search term
    const filteredEvents = events.filter(event =>
        event.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Handle back to pockets view
    const handleBackToPockets = () => {
        navigate('/pockets');
    };

    // Helper function to get photo URL with better fallback logic - similar to React Native implementation
    const getPhotoUrl = (photo: PreviewPhoto): string => {
        let rawUrl: string | undefined;

        // Handle different photo_url formats from API (like React Native does)
        if (typeof photo.photo_url === "string") {
            // Direct string URL (PreviewPhoto format)
            rawUrl = photo.photo_url;
        } else if (typeof photo.photo_url === "object") {
            // Object with url properties (other formats)
            // Prioritize medium for best quality, then small as fallback
            rawUrl = photo.photo_url?.url_med ?? photo.photo_url?.url_small;
        }

        if (!rawUrl) {
            console.log('No photo URL found for photo:', photo);
            return DEFAULT_EVENT_PLACEHOLDER;
        }

        // URLs are already perfect S3 signed URLs - no decoding needed!
        // If it's already HTTP, return as-is
        if (rawUrl.startsWith("http")) {
            return rawUrl;
        }

        // If it doesn't start with http, add https:// (fallback)
        return `https://${rawUrl}`;
    };

    // Helper function to format date
    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric'
        });
    };

    // Helper function to get profile picture URL - similar to React Native implementation
    const getProfilePictureUrl = (member: PocketMember | ContactUser): string => {
        let rawUrl: string | undefined;

        // Handle different profile picture formats from API
        if ('profile_picture_default' in member && member.profile_picture_default) {
            // User has default profile picture, use placeholder
            return DEFAULT_PROFILE_PLACEHOLDER;
        } else if ('profile_picture' in member && member.profile_picture) {
            // Both PocketMember and ContactUser now use profile_picture object
            if (typeof member.profile_picture === "string") {
                rawUrl = member.profile_picture;
            } else if (typeof member.profile_picture === "object") {
                // Prioritize small for avatars, then medium, then large
                rawUrl = member.profile_picture?.url_small ?? member.profile_picture?.url_medium ?? member.profile_picture?.url_large;
            }
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

    // Handle event click
    const handleEventClick = (event: Event) => {
        setSelectedEvent(event);
    };

    // Handle close event detail view
    const handleCloseEventDetail = () => {
        setSelectedEvent(null);
    };

    // Handle open grid photo view
    const handleOpenGridPhotoView = (event: Event) => {
        navigate(`/pockets/${pocketId}/${event.id}`);
    };

    // Handle event creation
    const handleEventCreated = (newEvent: Event) => {
        setEvents(prev => [newEvent, ...prev]);
        console.log('✅ New event added to list:', newEvent);
    };



    // Render event card with photo previews
    const renderEventCard = (event: Event) => {
        // Get up to 5 photos for preview (1 large + 4 small)
        const previewPhotos = event.preview_photos?.slice(0, 5) || [];
        const totalPhotoCount = event.photo_count || 0;
        const totalMemberCount = (pocket?.pocket_members?.length || 0) + (event.additional_member_count || 0);

        // Debug: Log the entire event object to see its structure
        console.log(`Event "${event.title}" full data:`, event);

        // Debug logging to help identify photo rendering issues
        if (previewPhotos.length > 0) {
            console.log(`Event "${event.title}" has ${previewPhotos.length} preview photos:`, previewPhotos);
            console.log(`First photo URL:`, getPhotoUrl(previewPhotos[0]));
        } else {
            console.log(`Event "${event.title}" has no preview photos. Photo count: ${totalPhotoCount}`);
        }

        return (
            <div key={event.id} className="event-card"
                onClick={() => {
                    handleOpenGridPhotoView(event);
                }}>
                {/* Event Header */}
                <div className="event-header">
                    <div className="event-title-section">
                        <button className="add-photos-button">
                            <span>+</span>
                        </button>
                        <h3
                            className="event-title clickable-title"
                        >
                            {event.title}
                        </h3>
                    </div>
                    <div className="event-meta">
                        <span className="event-date">{totalPhotoCount} photos</span>
                        <span className="event-updated">Updated {formatDate(event.updated_at)}</span>
                        <button
                            className="event-options-button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleEventClick(event);
                            }}
                        >
                            <span>⋯</span>
                        </button>
                    </div>
                </div>

                {/* Event Photo Preview */}
                <div className="event-photos-preview">
                    {previewPhotos.length > 0 ? (
                        <div className="photo-grid">
                            {/* Large photo on the left */}
                            {previewPhotos[0] && (
                                <div className="large-photo">
                                    <img
                                        src={getPhotoUrl(previewPhotos[0])}
                                        alt="Event photo"
                                        onError={(e) => {
                                            e.currentTarget.src = DEFAULT_EVENT_PLACEHOLDER;
                                        }}
                                    />
                                </div>
                            )}

                            {/* 2x2 grid on the right */}
                            <div className="small-photos-grid">
                                <div className="top-row">
                                    {previewPhotos[1] && (
                                        <div className="small-photo">
                                            <img
                                                src={getPhotoUrl(previewPhotos[1])}
                                                alt="Event photo"
                                                onError={(e) => {
                                                    e.currentTarget.src = DEFAULT_EVENT_PLACEHOLDER;
                                                }}
                                            />
                                        </div>
                                    )}
                                    {previewPhotos[2] && (
                                        <div className="small-photo">
                                            <img
                                                src={getPhotoUrl(previewPhotos[2])}
                                                alt="Event photo"
                                                onError={(e) => {
                                                    e.currentTarget.src = DEFAULT_EVENT_PLACEHOLDER;
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="bottom-row">
                                    {previewPhotos[3] && (
                                        <div className="small-photo">
                                            <img
                                                src={getPhotoUrl(previewPhotos[3])}
                                                alt="Event photo"
                                                onError={(e) => {
                                                    e.currentTarget.src = DEFAULT_EVENT_PLACEHOLDER;
                                                }}
                                            />
                                        </div>
                                    )}
                                    {previewPhotos[4] && (
                                        <div className="small-photo">
                                            <img
                                                src={getPhotoUrl(previewPhotos[4])}
                                                alt="Event photo"
                                                onError={(e) => {
                                                    e.currentTarget.src = DEFAULT_EVENT_PLACEHOLDER;
                                                }}
                                            />
                                            {/* Show "more" overlay if there are additional photos */}
                                            {totalPhotoCount > 5 && (
                                                <div
                                                    className="more-photos-overlay"
                                                >
                                                    <span>+{totalPhotoCount - 5}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="empty-event-photos">
                            <div className="empty-photos-placeholder">
                                <div className="placeholder-icon">📷</div>
                                <p>No photos yet</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Event Footer */}
                <div className="event-footer">
                    <div className="event-members">
                        <span className="member-count">{totalMemberCount} members</span>
                        <div className="member-avatars">
                            {/* Show pocket members first */}
                            {pocket?.pocket_members?.slice(0, 3).map((member) => (
                                <div key={member.id} className="member-avatar">
                                    <img
                                        src={getProfilePictureUrl(member)}
                                        alt={member.first_name}
                                        onError={(e) => {
                                            e.currentTarget.src = DEFAULT_PROFILE_PLACEHOLDER;
                                        }}
                                    />
                                </div>
                            ))}
                            {/* Show additional members if any */}
                            {event.additional_members?.slice(0, Math.max(0, 3 - (pocket?.pocket_members?.length || 0))).map((member) => (
                                <div key={member.id} className="member-avatar">
                                    <img
                                        src={getProfilePictureUrl(member)}
                                        alt={member.first_name}
                                        onError={(e) => {
                                            e.currentTarget.src = DEFAULT_PROFILE_PLACEHOLDER;
                                        }}
                                    />
                                </div>
                            ))}
                            {totalMemberCount > 3 && (
                                <span className="more-members">+{totalMemberCount - 3}</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };



    // Show loading state
    if (loading) {
        return (
            <div className="event-view-page">
                <NavBar />
                <main className="main-content">
                    <div className="loading-state">
                        <div className="loading-spinner"></div>
                        <p>Loading events...</p>
                    </div>
                </main>
            </div>
        );
    }

    // Show error state
    if (error || !pocket) {
        return (
            <div className="event-view-page">
                <NavBar />
                <main className="main-content">
                    <div className="error-state">
                        <h2>Error Loading Events</h2>
                        <p>{error || 'Pocket not found'}</p>
                        <button onClick={handleBackToPockets} className="retry-button">
                            Back to Pockets
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="event-view-page">
            <NavBar />
            <main className="main-content">
                {/* Header */}
                <header className="event-view-header">
                    <div className="header-left">
                        <div className="back-button-section">
                            <button onClick={handleBackToPockets} className="back-button">
                                <span>←</span>
                            </button>
                            <h1 className="pocket-title">{pocket.pocket_title}</h1>
                        </div>
                        <p>Events and photos in this pocket</p>
                    </div>
                    <div className="header-right">
                        <button
                            className="upload-button"
                            onClick={() => setShowCreateModal(true)}
                        >
                            <span>+</span>
                            Create Event
                        </button>
                        <div className="user-menu">
                            <UserAvatar size="medium" />
                        </div>
                    </div>
                </header>

                {/* Controls */}
                <section className="controls-section">
                    <div className="controls-left">
                        <div className="search-box">
                            <input
                                type="text"
                                placeholder="Search events..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <span>🔍</span>
                        </div>
                    </div>
                    <div className="controls-right">
                        <div className="filter-dropdown">
                            <select>
                                <option value="newest-oldest">Newest to Oldest</option>
                                <option value="oldest-newest">Oldest to Newest</option>
                                <option value="a-z">A-Z</option>
                                <option value="z-a">Z-A</option>
                                <option value="photo-high-low">Photo Count (High to Low)</option>
                                <option value="photo-low-high">Photo Count (Low to High)</option>
                            </select>
                        </div>
                    </div>
                </section>

                {/* Events List */}
                <section className="events-section">
                    {events.length === 0 ? (
                        <div className="empty-events">
                            <div className="empty-icon">📅</div>
                            <h3>No events in this pocket</h3>
                            <p>This pocket doesn't have any events yet. Create your first event to start sharing photos!</p>
                            <button className="create-event-button-large" onClick={() => setShowCreateModal(true)}>
                                <span>+</span>
                                Create Your First Event
                            </button>
                        </div>
                    ) : filteredEvents.length === 0 ? (
                        <div className="empty-events">
                            <div className="empty-icon">🔍</div>
                            <h3>No events found</h3>
                            <p>No events match "{searchTerm}"</p>
                        </div>
                    ) : (
                        <div className="events-list">
                            {filteredEvents.map(renderEventCard)}
                        </div>
                    )}
                </section>
            </main>

            {/* Event Detail Modal */}
            {
                selectedEvent && (
                    <div className="event-detail-modal">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h2>{selectedEvent.title}</h2>
                                <button onClick={handleCloseEventDetail} className="close-button">
                                    ✕
                                </button>
                            </div>
                            <div className="modal-body">
                                <p className="event-description">Event with {selectedEvent.photo_count} photos</p>
                                <div className="event-dates">
                                    <p className="event-created">Created: {formatDate(selectedEvent.created_at)}</p>
                                    <p className="event-updated">Last updated: {formatDate(selectedEvent.updated_at)}</p>
                                </div>
                                <div className="event-members-list">
                                    <h3>Members ({(pocket?.pocket_members?.length || 0) + (selectedEvent.additional_member_count || 0)})</h3>
                                    <div className="members-grid">
                                        {/* Show pocket members first */}
                                        {pocket?.pocket_members?.map((member) => (
                                            <div key={member.id} className="member-item">
                                                <img
                                                    src={getProfilePictureUrl(member)}
                                                    alt={member.first_name}
                                                    onError={(e) => {
                                                        e.currentTarget.src = DEFAULT_PROFILE_PLACEHOLDER;
                                                    }}
                                                />
                                                <span>{member.first_name} {member.last_name}</span>
                                            </div>
                                        ))}
                                        {/* Show additional members */}
                                        {selectedEvent.additional_members?.map((member) => (
                                            <div key={member.id} className="member-item">
                                                <img
                                                    src={getProfilePictureUrl(member)}
                                                    alt={member.first_name}
                                                    onError={(e) => {
                                                        e.currentTarget.src = DEFAULT_PROFILE_PLACEHOLDER;
                                                    }}
                                                />
                                                <span>{member.first_name} {member.last_name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Create Event Modal */}
            <CreateEventModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onEventCreated={handleEventCreated}
                pocketId={pocketId || ''}
                pocket={pocket}
            />

        </div >
    );
};

export default EventView; 
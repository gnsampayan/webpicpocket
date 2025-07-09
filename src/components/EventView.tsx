import React, { useState, useEffect } from 'react';
import './EventView.css';
import NavBar from './NavBar';
import UserAvatar from './UserAvatar';
import { type Pocket, type Event, type PreviewPhoto, type PocketMember, type ContactUser } from '../types';

interface EventViewProps {
    pocket: Pocket;
    events: Event[];
    loading: boolean;
    error: string | null;
    onBack: () => void;
}

const EventView: React.FC<EventViewProps> = ({ pocket, events, loading, error, onBack }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

    // Default placeholder image as data URI for better reliability
    const DEFAULT_EVENT_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjNjY3ZWVhIi8+CjxyZWN0IHg9IjQwIiB5PSI0MCIgd2lkdGg9IjEyMCIgaGVpZ2h0PSI3MCIgcng9IjgiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4yIi8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjY1IiByPSIxNSIgZmlsbD0iI2ZmZmZmZiIgZmlsbC1vcGFjaXR5PSIwLjYiLz4KPHBhdGggZD0iTTkwIDc1TDk1IDgwTDEwNSA3MEwxMTUgODBMMTIwIDc1IiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIgc3Ryb2tlLW9wYWNpdHk9IjAuNiIvPgo8dGV4dCB4PSIxMDAiIHk9IjEzMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmaWxsPSIjZmZmZmZmIiBmaWxsLW9wYWNpdHk9IjAuOCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Tm8gUGhvdG9zPC90ZXh0Pgo8L3N2Zz4K';

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
    const getProfilePictureUrl = (member: PocketMember | ContactUser, memberId: string): string => {
        let rawUrl: string | undefined;

        // Handle different profile picture formats from API
        if ('profile_picture_url' in member && member.profile_picture_url) {
            // ContactUser format with direct URL
            rawUrl = member.profile_picture_url;
        } else if ('profile_picture' in member && member.profile_picture) {
            // PocketMember format with object
            if (typeof member.profile_picture === "string") {
                rawUrl = member.profile_picture;
            } else if (typeof member.profile_picture === "object") {
                // Prioritize small for avatars, then medium, then large
                rawUrl = member.profile_picture?.url_small ?? member.profile_picture?.url_medium ?? member.profile_picture?.url_large;
            }
        }

        if (!rawUrl) {
            return `https://picsum.photos/30/30?random=${memberId}`;
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

    // Render event card with photo previews
    const renderEventCard = (event: Event) => {
        // Get up to 5 photos for preview (1 large + 4 small)
        const previewPhotos = event.preview_photos?.slice(0, 5) || [];
        const totalPhotoCount = event.photo_count || 0;
        const totalMemberCount = (pocket.pocket_members?.length || 0) + (event.additional_member_count || 0);

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
            <div key={event.id} className="event-card" onClick={() => handleEventClick(event)}>
                {/* Event Header */}
                <div className="event-header">
                    <div className="event-title-section">
                        <button className="add-photos-button">
                            <span>+</span>
                        </button>
                        <h3 className="event-title">{event.title}</h3>
                    </div>
                    <div className="event-meta">
                        <span className="event-date">{totalPhotoCount} photos</span>
                        <span className="event-updated">Updated {formatDate(event.updated_at)}</span>
                        <button className="event-options-button">
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
                                                <div className="more-photos-overlay">
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
                            {pocket.pocket_members?.slice(0, 3).map((member) => (
                                <div key={member.id} className="member-avatar">
                                    <img
                                        src={getProfilePictureUrl(member, member.id)}
                                        alt={member.first_name}
                                        onError={(e) => {
                                            e.currentTarget.src = `https://picsum.photos/30/30?random=${member.id}`;
                                        }}
                                    />
                                </div>
                            ))}
                            {/* Show additional members if any */}
                            {event.additional_members?.slice(0, Math.max(0, 3 - (pocket.pocket_members?.length || 0))).map((member) => (
                                <div key={member.id} className="member-avatar">
                                    <img
                                        src={getProfilePictureUrl(member, member.id)}
                                        alt={member.first_name}
                                        onError={(e) => {
                                            e.currentTarget.src = `https://picsum.photos/30/30?random=${member.id}`;
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

    if (loading) {
        return (
            <div className="event-view-page">
                <NavBar />
                <main className="main-content">
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>Loading events...</p>
                    </div>
                </main>
            </div>
        );
    }

    if (error) {
        return (
            <div className="event-view-page">
                <NavBar />
                <main className="main-content">
                    <div className="error-container">
                        <h2>Error Loading Events</h2>
                        <p>{error}</p>
                        <button onClick={onBack} className="retry-button">
                            Go Back
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
                    <div className="header-top">
                        <div className="back-button-section">
                            <button onClick={onBack} className="back-button">
                                <span>←</span>
                            </button>
                            <h1 className="pocket-title">{pocket.pocket_title}</h1>
                        </div>
                        <div className="header-actions">
                            <UserAvatar size="medium" />
                        </div>
                    </div>
                    <div className="header-bottom">
                        <div className="search-container">
                            <span className="search-icon">🔍</span>
                            <input
                                type="text"
                                placeholder="Search events..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                        </div>
                        <button className="create-event-button">
                            <span>+</span>
                        </button>
                    </div>
                </header>

                {/* Events List */}
                <section className="events-section">
                    {events.length === 0 ? (
                        <div className="empty-events">
                            <div className="empty-icon">📅</div>
                            <h3>No events in this pocket</h3>
                            <p>This pocket doesn't have any events yet. Create your first event to start sharing photos!</p>
                            <button className="create-event-button-large">
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
            {selectedEvent && (
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
                                <h3>Members ({(pocket.pocket_members?.length || 0) + (selectedEvent.additional_member_count || 0)})</h3>
                                <div className="members-grid">
                                    {/* Show pocket members first */}
                                    {pocket.pocket_members?.map((member) => (
                                        <div key={member.id} className="member-item">
                                            <img
                                                src={getProfilePictureUrl(member, member.id)}
                                                alt={member.first_name}
                                                onError={(e) => {
                                                    e.currentTarget.src = `https://picsum.photos/40/40?random=${member.id}`;
                                                }}
                                            />
                                            <span>{member.first_name} {member.last_name}</span>
                                        </div>
                                    ))}
                                    {/* Show additional members */}
                                    {selectedEvent.additional_members?.map((member) => (
                                        <div key={member.id} className="member-item">
                                            <img
                                                src={getProfilePictureUrl(member, member.id)}
                                                alt={member.first_name}
                                                onError={(e) => {
                                                    e.currentTarget.src = `https://picsum.photos/40/40?random=${member.id}`;
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
            )}
        </div>
    );
};

export default EventView; 
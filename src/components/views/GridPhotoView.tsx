import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import type { Photo, Pocket, PocketMember, ContactUser } from '../../types';
import AddMediaModal from '../modals/AddMediaModal';
import PhotoDetailsModal from '../modals/PhotoDetailsModal';
import './GridPhotoView.css';

interface EventDetailResponse {
    event_id: string;
    title: string;
    photo_count: number;
    additional_member_count: number;
    additional_members: Array<{
        id: string;
        username: string;
        first_name: string;
        last_name: string;
        email: string;
        profile_picture_default: boolean;
        profile_picture: {
            url_small?: string;
            url_medium?: string;
            url_large?: string;
            [key: string]: any;
        };
    }>;
    current_user_added: boolean;
    current_user_add_permissions: boolean;
    photos: Photo[];
}

const GridPhotoView: React.FC = () => {
    const { pocketTitle, eventTitle } = useParams<{ pocketTitle: string; eventTitle: string }>();
    const navigate = useNavigate();

    const [eventData, setEventData] = useState<EventDetailResponse | null>(null);
    const [pocket, setPocket] = useState<Pocket | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Load initial state from localStorage
    const getInitialFilter = (): string => {
        const saved = localStorage.getItem('photos-sort-filter');
        return saved || 'newest-created';
    };

    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
    const [loadedPhotos, setLoadedPhotos] = useState<Set<string>>(new Set());
    const [photosPerRow] = useState(3);
    const [filter, setFilter] = useState(getInitialFilter);

    // Functions to save state to localStorage
    const saveFilter = (filterValue: string) => {
        localStorage.setItem('photos-sort-filter', filterValue);
    };

    // Wrapper function to update state and save to localStorage
    const handleFilterChange = (filterValue: string) => {
        setFilter(filterValue);
        saveFilter(filterValue);
    };

    // Helper function to sort photos based on filter
    const sortPhotos = (photosToSort: Photo[], sortFilter: string): Photo[] => {
        const sorted = [...photosToSort];

        switch (sortFilter) {
            case 'newest-created':
                return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            case 'oldest-created':
                return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            case 'newest-updated':
                return sorted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
            case 'oldest-updated':
                return sorted.sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
            case 'comment-high-low':
                return sorted.sort((a, b) => b.comment_count - a.comment_count);
            case 'comment-low-high':
                return sorted.sort((a, b) => a.comment_count - b.comment_count);
            default:
                return sorted;
        }
    };

    // Modal state
    const [showAddMediaModal, setShowAddMediaModal] = useState(false);

    // Default placeholder images as data URI for better reliability
    const DEFAULT_PHOTO_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjNjY3ZWVhIi8+CjxyZWN0IHg9IjQwIiB5PSI0MCIgd2lkdGg9IjEyMCIgaGVpZ2h0PSI3MCIgcng9IjgiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4yIi8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjY1IiByPSIxNSIgZmlsbD0iI2ZmZmZmZiIgZmlsbC1vcGFjaXR5PSIwLjYiLz4KPHBhdGggZD0iTTkwIDc1TDk1IDgwTDEwNSA3MEwxMTUgODBMMTIwIDc1IiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIgc3Ryb2tlLW9wYWNpdHk9IjAuNiIvPgo8dGV4dCB4PSIxMDAiIHk9IjEzMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmaWxsPSIjZmZmZmZmIiBmaWxsLW9wYWNpdHk9IjAuOCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Tm8gUGhvdG9zPC90ZXh0Pgo8L3N2Zz4K';
    const DEFAULT_PROFILE_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjUiIGN5PSIyNSIgcj0iMjUiIGZpbGw9IiM2NjdlZWEiLz4KPGNpcmNsZSBjeD0iMjUiIGN5PSIyMCIgcj0iOCIgZmlsbD0iI2ZmZmZmZiIgZmlsbC1vcGFjaXR5PSIwLjgiLz4KPHBhdGggZD0iTTEwIDQwQzEwIDM1IDE1IDMwIDI1IDMwQzM1IDMwIDQwIDM1IDQwIDQwIiBmaWxsPSIjZmZmZmZmIiBmaWxsLW9wYWNpdHk9IjAuOCIvPgo8L3N2Zz4K';

    useEffect(() => {
        const fetchEventAndPocketData = async () => {
            if (!eventTitle || !pocketTitle) {
                setError('No event title or pocket title provided');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                // Parse pocket title and ID suffix from URL
                const decodedPocketTitle = decodeURIComponent(pocketTitle);
                const pocketLastDashIndex = decodedPocketTitle.lastIndexOf('-');
                const actualPocketTitle = pocketLastDashIndex !== -1 ? decodedPocketTitle.substring(0, pocketLastDashIndex) : decodedPocketTitle;
                const pocketIdSuffix = pocketLastDashIndex !== -1 ? decodedPocketTitle.substring(pocketLastDashIndex + 1) : '';

                // Parse event title and ID suffix from URL
                const decodedEventTitle = decodeURIComponent(eventTitle);
                const eventLastDashIndex = decodedEventTitle.lastIndexOf('-');
                const actualEventTitle = eventLastDashIndex !== -1 ? decodedEventTitle.substring(0, eventLastDashIndex) : decodedEventTitle;
                const eventIdSuffix = eventLastDashIndex !== -1 ? decodedEventTitle.substring(eventLastDashIndex + 1) : '';

                console.log('🔍 [GridPhotoView] Fetching data for pocket:', actualPocketTitle, 'with suffix:', pocketIdSuffix);
                console.log('🔍 [GridPhotoView] Fetching data for event:', actualEventTitle, 'with suffix:', eventIdSuffix);

                // Fetch pockets data first to find the pocket
                const pocketsData = await api.getPockets();
                const currentPocket = pocketsData.find(p =>
                    p.pocket_id.endsWith(pocketIdSuffix)
                );

                if (!currentPocket) {
                    throw new Error('Pocket not found');
                }

                // Fetch events for this pocket to find the event
                const eventsData = await api.getEvents(currentPocket.pocket_id);
                const currentEvent = eventsData.find(e =>
                    e.id.endsWith(eventIdSuffix)
                );

                if (!currentEvent) {
                    throw new Error('Event not found');
                }

                // Fetch event details using the event ID
                const eventResponse = await api.getEventDetails(currentEvent.id);

                console.log('✅ [GridPhotoView] Event details fetched successfully:', eventResponse);
                console.log('✅ [GridPhotoView] Pocket data fetched successfully:', currentPocket);

                setEventData(eventResponse);
                setPocket(currentPocket);
            } catch (err) {
                console.error('❌ [GridPhotoView] Failed to fetch data:', err);
                setError(err instanceof Error ? err.message : 'Failed to load event and pocket data');
            } finally {
                setLoading(false);
            }
        };

        fetchEventAndPocketData();
    }, [eventTitle, pocketTitle]);

    // Handle back to event view
    const handleBackToEventView = () => {
        if (pocketTitle) {
            navigate(`/pockets/${pocketTitle}`);
        } else {
            navigate('/pockets');
        }
    };

    // Helper function to get photo URL
    const getPhotoUrl = (photo: Photo): string => {
        let rawUrl: string | undefined;

        if (typeof photo.photo_url === "string") {
            rawUrl = photo.photo_url;
        } else if (typeof photo.photo_url === "object") {
            rawUrl = photo.photo_url?.url_med ?? photo.photo_url?.url_small;
        }

        if (!rawUrl) {
            console.log('No photo URL found for photo:', photo);
            return DEFAULT_PHOTO_PLACEHOLDER;
        }

        if (rawUrl.startsWith("http")) {
            return rawUrl;
        }

        return `https://${rawUrl}`;
    };

    // Helper function to get profile picture URL - similar to EventView implementation
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

    // Handle photo click
    const handlePhotoClick = (photo: Photo) => {
        setSelectedPhoto(photo);
    };

    // Handle close photo detail view
    const handleClosePhotoDetail = () => {
        setSelectedPhoto(null);
    };

    // Handle photo favorite toggle
    const handleToggleFavorite = async (photo: Photo) => {
        try {
            console.log('🔄 [GridPhotoView] Toggling favorite for photo:', photo.id, 'Current state:', photo.is_favorite);

            if (photo.is_favorite) {
                console.log('🔄 [GridPhotoView] Removing from favorites...');
                await api.manageFavorite({ remove_favorite: [photo.id] });
            } else {
                console.log('🔄 [GridPhotoView] Adding to favorites...');
                await api.manageFavorite({ add_favorite: [photo.id] });
            }

            // Update the photo in the local state
            setEventData(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    photos: prev.photos.map(p =>
                        p.id === photo.id
                            ? { ...p, is_favorite: !p.is_favorite }
                            : p
                    )
                };
            });

            console.log('✅ Photo favorite status updated');
        } catch (err) {
            console.error('❌ [GridPhotoView] Failed to toggle favorite:', err);

            // Show user-friendly error message
            if (err instanceof Error) {
                if (err.message.includes('502')) {
                    console.error('❌ [GridPhotoView] Server is temporarily unavailable. Please try again later.');
                } else if (err.message.includes('Network')) {
                    console.error('❌ [GridPhotoView] Network error. Please check your connection.');
                } else {
                    console.error('❌ [GridPhotoView] Unexpected error:', err.message);
                }
            }
        }
    };

    // Handle photo delete
    const handleDeletePhoto = async (photo: Photo) => {
        if (!photo.can_delete) {
            console.log('❌ User cannot delete this photo');
            return;
        }

        try {
            await api.deletePhoto(photo.id);

            // Remove the photo from the local state
            setEventData(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    photos: prev.photos.filter(p => p.id !== photo.id),
                    photo_count: prev.photo_count - 1
                };
            });

            console.log('✅ Photo deleted successfully');
        } catch (err) {
            console.error('❌ [GridPhotoView] Failed to delete photo:', err);
        }
    };

    // Handle photo load completion
    const handlePhotoLoad = (photoId: string) => {
        setLoadedPhotos(prev => new Set([...prev, photoId]));
    };

    // Handle media added to event
    const handleMediaAdded = async () => {
        console.log('✅ [GridPhotoView] Media added, refetching event data');

        // Refetch event data to get the updated photos from the backend
        try {
            setLoading(true);
            const updatedEventData = await api.getEventDetails(eventData?.event_id || '');
            setEventData(updatedEventData);
            console.log('✅ [GridPhotoView] Event data refreshed with new photos');
        } catch (err) {
            console.error('❌ [GridPhotoView] Failed to refetch event data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Get photos to show based on loading progress and sorting
    const getPhotosToShow = () => {
        if (!eventData) return [];

        const sortedPhotos = sortPhotos(eventData.photos, filter);
        const totalPhotos = sortedPhotos.length;
        const loadedCount = loadedPhotos.size;
        const maxToShow = Math.min(loadedCount + photosPerRow, totalPhotos);

        return sortedPhotos.slice(0, maxToShow);
    };

    // Calculate total member count
    const getTotalMemberCount = () => {
        if (!pocket || !eventData) return 0;
        return (pocket.pocket_members?.length || 0) + (eventData.additional_member_count || 0);
    };

    // Show loading state
    if (loading) {
        return (
            <div className="grid-photo-view-page">
                {/* Header */}
                <header className="grid-photo-header">
                    <div className="header-top">
                        <div className="back-button-section">
                            <button onClick={handleBackToEventView} className="back-button">
                                <span>←</span>
                            </button>
                            <h1 className="event-title">Loading...</h1>
                        </div>
                        <div className="header-actions">
                            <span className="photo-count">Loading...</span>
                            <button className="add-photos-button" disabled>
                                <span>+</span>
                            </button>
                        </div>
                    </div>
                </header>

                {/* Photos Grid with Skeletons */}
                <main className="grid-photo-content">
                    <div className="photos-grid">
                        {Array.from({ length: 3 }, (_, index) => (
                            <div key={index} className="photo-item photo-skeleton">
                                <div className="photo-skeleton-content"></div>
                            </div>
                        ))}
                    </div>
                </main>
            </div>
        );
    }

    // Show error state
    if (error || !eventData || !pocket) {
        return (
            <div className="grid-photo-view-page">
                {/* Header */}
                <header className="grid-photo-header">
                    <div className="header-top">
                        <div className="back-button-section">
                            <button onClick={handleBackToEventView} className="back-button">
                                <span>←</span>
                            </button>
                            <h1 className="event-title">Error</h1>
                        </div>
                        <div className="header-actions">
                            <span className="photo-count">0 photos</span>
                            <button className="add-photos-button" disabled>
                                <span>+</span>
                            </button>
                        </div>
                    </div>
                </header>

                {/* Error Content */}
                <main className="grid-photo-content">
                    <div className="error-state">
                        <h2>Error Loading Photos</h2>
                        <p>{error || 'Event not found'}</p>
                        <button onClick={handleBackToEventView} className="retry-button">
                            Back to Event
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    const totalMemberCount = getTotalMemberCount();

    return (
        <div className="grid-photo-view-page">
            {/* Header */}
            <header className="grid-photo-header">
                <div className="header-top">
                    <div className="back-button-section">
                        <button onClick={handleBackToEventView} className="back-button">
                            <span>←</span>
                        </button>
                        <h1 className="event-title">{eventData.title}</h1>
                    </div>
                    <div className="header-actions">
                        <div className="header-info">
                            <span className="photo-count">
                                📷 {eventData.photo_count} photos
                            </span>
                            <div className="event-members">
                                <span className="member-count">{totalMemberCount} members</span>
                                <div className="member-avatars">
                                    {/* Show pocket members first */}
                                    {pocket.pocket_members?.slice(0, 3).map((member) => (
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
                                    {eventData.additional_members?.slice(0, Math.max(0, 3 - (pocket.pocket_members?.length || 0))).map((member) => (
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
                        {eventData.current_user_add_permissions && (
                            <button
                                className="add-photos-button"
                                onClick={() => setShowAddMediaModal(true)}
                            >
                                <span>+</span>
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Controls */}
            <section className="controls-section">
                <div className="controls-right">
                    <div className="filter-dropdown">
                        <select value={filter} onChange={(e) => handleFilterChange(e.target.value)}>
                            <option value="newest-created">Newest Created</option>
                            <option value="oldest-created">Oldest Created</option>
                            <option value="newest-updated">Most Recently Updated</option>
                            <option value="oldest-updated">Least Recently Updated</option>
                            <option value="comment-high-low">Comment Count (High to Low)</option>
                            <option value="comment-low-high">Comment Count (Low to High)</option>
                        </select>
                    </div>
                </div>
            </section>

            {/* Photos Grid */}
            <main className="grid-photo-content">
                {eventData.photos.length === 0 ? (
                    <div className="empty-photos">
                        <div className="empty-icon">📷</div>
                        <h3>No photos in this event</h3>
                        <p>This event doesn't have any photos yet.</p>
                        {eventData.current_user_add_permissions && (
                            <button
                                className="add-photos-button-large"
                                onClick={() => setShowAddMediaModal(true)}
                            >
                                <span>+</span>
                                Add Your First Photo
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="photos-grid">
                        {getPhotosToShow().map((photo) => (
                            <div key={photo.id} className="photo-item" onClick={() => handlePhotoClick(photo)}>
                                <img
                                    src={getPhotoUrl(photo)}
                                    alt="Event photo"
                                    onLoad={() => handlePhotoLoad(photo.id)}
                                    onError={(e) => {
                                        e.currentTarget.src = DEFAULT_PHOTO_PLACEHOLDER;
                                        handlePhotoLoad(photo.id); // Mark as loaded even on error
                                    }}
                                />
                                <div className="photo-overlay">
                                    <div className="photo-actions">
                                        <button
                                            className={`favorite-button ${photo.is_favorite ? 'favorited' : ''}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleToggleFavorite(photo);
                                            }}
                                        >
                                            {photo.is_favorite ? '❤️' : '🤍'}
                                        </button>
                                        {photo.can_delete && (
                                            <button
                                                className="delete-button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeletePhoto(photo);
                                                }}
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </div>
                                    {photo.comment_count > 0 && (
                                        <div className="comment-count">
                                            💬 {photo.comment_count}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {/* Show remaining skeleton placeholders only if not all photos are loaded */}
                        {loadedPhotos.size < eventData.photos.length &&
                            Array.from({ length: Math.max(0, photosPerRow - (getPhotosToShow().length % photosPerRow)) }, (_, index) => (
                                <div key={`skeleton-${index}`} className="photo-item photo-skeleton">
                                    <div className="photo-skeleton-content"></div>
                                </div>
                            ))
                        }
                    </div>
                )}
            </main>

            {/* Photo Detail Modal */}
            <PhotoDetailsModal
                photo={selectedPhoto}
                isOpen={!!selectedPhoto}
                onClose={handleClosePhotoDetail}
                getPhotoUrl={getPhotoUrl}
            />

            {/* Add Media Modal */}
            <AddMediaModal
                isOpen={showAddMediaModal}
                onClose={() => setShowAddMediaModal(false)}
                onMediaAdded={handleMediaAdded}
                eventId={eventData?.event_id || ''}
                eventTitle={eventData.title}
            />
        </div>
    );
};

export default GridPhotoView; 
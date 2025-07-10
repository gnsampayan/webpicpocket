import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Photo } from '../types';
import AddMediaModal from './AddMediaModal';
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
        profile_picture_url: string;
    }>;
    current_user_added: boolean;
    current_user_add_permissions: boolean;
    photos: Photo[];
}

const GridPhotoView: React.FC = () => {
    const { pocketId, eventId } = useParams<{ pocketId: string; eventId: string }>();
    const navigate = useNavigate();

    const [eventData, setEventData] = useState<EventDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
    const [loadedPhotos, setLoadedPhotos] = useState<Set<string>>(new Set());
    const [photosPerRow] = useState(3);

    // Modal state
    const [showAddMediaModal, setShowAddMediaModal] = useState(false);

    // Default placeholder image as data URI for better reliability
    const DEFAULT_PHOTO_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjNjY3ZWVhIi8+CjxyZWN0IHg9IjQwIiB5PSI0MCIgd2lkdGg9IjEyMCIgaGVpZ2h0PSI3MCIgcng9IjgiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4yIi8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjY1IiByPSIxNSIgZmlsbD0iI2ZmZmZmZiIgZmlsbC1vcGFjaXR5PSIwLjYiLz4KPHBhdGggZD0iTTkwIDc1TDk1IDgwTDEwNSA3MEwxMTUgODBMMTIwIDc1IiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIgc3Ryb2tlLW9wYWNpdHk9IjAuNiIvPgo8dGV4dCB4PSIxMDAiIHk9IjEzMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmaWxsPSIjZmZmZmZmIiBmaWxsLW9wYWNpdHk9IjAuOCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Tm8gUGhvdG9zPC90ZXh0Pgo8L3N2Zz4K';

    useEffect(() => {
        const fetchEventDetails = async () => {
            if (!eventId) {
                setError('No event ID provided');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                console.log('🔍 [GridPhotoView] Fetching event details for event ID:', eventId);

                const response = await api.getEventDetails(eventId);
                console.log('✅ [GridPhotoView] Event details fetched successfully:', response);

                setEventData(response);
            } catch (err) {
                console.error('❌ [GridPhotoView] Failed to fetch event details:', err);
                setError(err instanceof Error ? err.message : 'Failed to load event details');
            } finally {
                setLoading(false);
            }
        };

        fetchEventDetails();
    }, [eventId]);

    // Handle back to event view
    const handleBackToEventView = () => {
        if (pocketId) {
            navigate(`/pockets/${pocketId}`);
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
            if (photo.is_favorite) {
                await api.unfavoritePhoto(photo.id);
            } else {
                await api.favoritePhoto(photo.id);
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
            const updatedEventData = await api.getEventDetails(eventId || '');
            setEventData(updatedEventData);
            console.log('✅ [GridPhotoView] Event data refreshed with new photos');
        } catch (err) {
            console.error('❌ [GridPhotoView] Failed to refetch event data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Get photos to show based on loading progress
    const getPhotosToShow = () => {
        if (!eventData) return [];

        const totalPhotos = eventData.photos.length;
        const loadedCount = loadedPhotos.size;
        const maxToShow = Math.min(loadedCount + photosPerRow, totalPhotos);

        return eventData.photos.slice(0, maxToShow);
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
    if (error || !eventData) {
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
                        <span className="photo-count">{eventData.photo_count} photos</span>
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
            {selectedPhoto && (
                <div className="photo-detail-modal">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>Photo Details</h2>
                            <button onClick={handleClosePhotoDetail} className="close-button">
                                ✕
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="photo-detail-image">
                                <img
                                    src={getPhotoUrl(selectedPhoto)}
                                    alt="Event photo"
                                    onError={(e) => {
                                        e.currentTarget.src = DEFAULT_PHOTO_PLACEHOLDER;
                                    }}
                                />
                            </div>
                            <div className="photo-detail-info">
                                <p className="photo-date">
                                    Added {new Date(selectedPhoto.created_at).toLocaleDateString()}
                                </p>
                                <p className="photo-type">
                                    Type: {selectedPhoto.media_type}
                                </p>
                                {selectedPhoto.comment_count > 0 && (
                                    <p className="photo-comments">
                                        Comments: {selectedPhoto.comment_count}
                                    </p>
                                )}
                                {selectedPhoto.locks_at && (
                                    <p className="photo-locks">
                                        Locks at: {new Date(selectedPhoto.locks_at).toLocaleDateString()}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Media Modal */}
            <AddMediaModal
                isOpen={showAddMediaModal}
                onClose={() => setShowAddMediaModal(false)}
                onMediaAdded={handleMediaAdded}
                eventId={eventId || ''}
            />
        </div>
    );
};

export default GridPhotoView; 
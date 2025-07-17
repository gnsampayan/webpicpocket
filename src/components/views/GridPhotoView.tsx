import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Photo, PocketMember, ContactUser } from '../../types';
import AddMediaModal from '../modals/AddMediaModal';
import { usePocketAndEventFromUrl, useEventPhotos, useFavoriteMutation, useDeletePhotoMutation } from '../../hooks/usePhotos';
import { getInitialSortFilter, saveSortFilter, sortPhotos } from '../../utils/sorting';
import './GridPhotoView.css';

const GridPhotoView: React.FC = () => {
    const { pocketTitle, eventTitle } = useParams<{ pocketTitle: string; eventTitle: string }>();
    const navigate = useNavigate();

    const [loadedPhotos, setLoadedPhotos] = useState<Set<string>>(new Set());
    const [photosPerRow] = useState(3);
    const [filter, setFilter] = useState(getInitialSortFilter);

    // React Query hooks - using shared cached data
    const { pocket, event, isLoading: isLoadingPocketEvent, error: pocketEventError } = usePocketAndEventFromUrl(pocketTitle, eventTitle);
    const { data: eventData, isLoading: isLoadingEventPhotos, error: eventPhotosError } = useEventPhotos(event?.id);
    const favoriteMutation = useFavoriteMutation();
    const deletePhotoMutation = useDeletePhotoMutation();

    // Combined loading and error states
    const isLoading = isLoadingPocketEvent || isLoadingEventPhotos;
    const error = pocketEventError || eventPhotosError;

    // Wrapper function to update state and save to localStorage
    const handleFilterChange = (filterValue: string) => {
        setFilter(filterValue);
        saveSortFilter(filterValue);
    };

    // Modal state
    const [showAddMediaModal, setShowAddMediaModal] = useState(false);

    // Default placeholder images as data URI for better reliability
    const DEFAULT_PHOTO_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjNjY3ZWVhIi8+CjxyZWN0IHg9IjQwIiB5PSI0MCIgd2lkdGg9IjEyMCIgaGVpZ2h0PSI3MCIgcng9IjgiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4yIi8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjY1IiByPSIxNSIgZmlsbD0iI2ZmZmZmZiIgZmlsbC1vcGFjaXR5PSIwLjYiLz4KPHBhdGggZD0iTTkwIDc1TDk1IDgwTDEwNSA3MEwxMTUgODBMMTIwIDc1IiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIgc3Ryb2tlLW9wYWNpdHk9IjAuNiIvPgo8dGV4dCB4PSIxMDAiIHk9IjEzMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmaWxsPSIjZmZmZmZmIiBmaWxsLW9wYWNpdHk9IjAuOCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Tm8gUGhvdG9zPC90ZXh0Pgo8L3N2Zz4K';
    const DEFAULT_PROFILE_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjUiIGN5PSIyNSIgcj0iMjUiIGZpbGw9IiM2NjdlZWEiLz4KPGNpcmNsZSBjeD0iMjUiIGN5PSIyMCIgcj0iOCIgZmlsbD0iI2ZmZmZmZiIgZmlsbC1vcGFjaXR5PSIwLjgiLz4KPHBhdGggZD0iTTEwIDQwQzEwIDM1IDE1IDMwIDI1IDMwQzM1IDMwIDQwIDM1IDQwIDQwIiBmaWxsPSIjZmZmZmZmIiBmaWxsLW9wYWNpdHk9IjAuOCIvPgo8L3N2Zz4K';

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
        // Navigate to the new photo details route
        if (pocketTitle && eventTitle) {
            const shortId = photo.id.slice(-6);
            navigate(`/pockets/${pocketTitle}/${eventTitle}/photo/${shortId}`);
        }
    };

    // Handle photo favorite toggle
    const handleToggleFavorite = async (photo: Photo) => {
        try {
            console.log('🔄 [GridPhotoView] Toggling favorite for photo:', photo.id, 'Current state:', photo.is_favorite);

            await favoriteMutation.mutateAsync({
                photoId: photo.id,
                isFavorite: photo.is_favorite
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

        // Show confirmation dialog
        const confirmed = window.confirm('Are you sure you want to delete this photo? This action cannot be undone.');
        if (!confirmed) {
            return;
        }

        try {
            console.log('🔄 [GridPhotoView] Deleting photo:', photo.id);

            await deletePhotoMutation.mutateAsync(photo.id);
            console.log('✅ Photo deleted successfully');
        } catch (err) {
            console.error('❌ [GridPhotoView] Failed to delete photo:', err);

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

    // Handle photo load completion
    const handlePhotoLoad = (photoId: string) => {
        setLoadedPhotos(prev => new Set([...prev, photoId]));
    };

    // Handle media added to event
    const handleMediaAdded = async () => {
        console.log('✅ [GridPhotoView] Media added, refetching event data');
        // React Query mutation will automatically invalidate cache
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
    if (isLoading) {
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
                        <p>{typeof error === 'string' ? error : error?.message || 'Event not found'}</p>
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
                                    {eventData.additional_members?.slice(0, Math.max(0, 3 - (pocket.pocket_members?.length || 0))).map((member: any) => (
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

            {/* Controls - Only show when viewing grid */}
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

            {/* Main Content - Only show grid */}
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
                                            disabled={favoriteMutation.isPending}
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
                                                disabled={deletePhotoMutation.isPending}
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
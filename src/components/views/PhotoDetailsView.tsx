import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Photo } from '../../types/api';
import CommentsSection from '../ui/CommentsSection';
import { usePhotoByShortId, useFavoriteMutation, useComments } from '../../hooks/usePhotos';
import { getCurrentSortFilter, sortPhotos } from '../../utils/sorting';
import './PhotoDetailsView.css';

const DEFAULT_PHOTO_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjNjY3ZWVhIi8+CjxyZWN0IHg9IjQwIiB5PSI0MCIgd2lkdGg9IjEyMCIgaGVpZ2h0PSI3MCIgcng9IjgiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4yIi8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjY1IiByPSIxNSIgZmlsbD0iI2ZmZmZmZiIgZmlsbC1vcGFjaXR5PSIwLjYiLz4KPHBhdGggZD0iTTkwIDc1TDk1IDgwTDEwNSA3MEwxMTUgODBMMTIwIDc1IiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIgc3Ryb2tlLW9wYWNpdHk9IjAuNiIvPgo8dGV4dCB4PSIxMDAiIHk9IjEzMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmaWxsPSIjZmZmZmZmIiBmaWxsLW9wYWNpdHk9IjAuOCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Tm8gUGhvdG9zPC90ZXh0Pgo8L3N2Zz4K';

const PhotoDetailsView: React.FC = () => {
    const { pocketTitle, eventTitle, photoShortId } = useParams<{ pocketTitle: string; eventTitle: string; photoShortId: string }>();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'comments' | 'info'>('comments');

    // React Query hooks
    const {
        data: photoData,
        isLoading,
        error
    } = usePhotoByShortId(pocketTitle, eventTitle, photoShortId);

    const favoriteMutation = useFavoriteMutation();

    // Get comments data for the current photo
    const {
        data: comments = []
    } = useComments(photoData?.photo?.id);

    // Get current sort filter and sorted photos for navigation
    const currentSortFilter = getCurrentSortFilter();
    const sortedPhotos = photoData?.allPhotos ? sortPhotos(photoData.allPhotos, currentSortFilter) : [];
    const currentPhotoIndex = sortedPhotos.findIndex(photo => photo.id === photoData?.photo?.id);

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const isPhotoLocked = () => {
        if (!photoData?.photo?.locks_at) return false;
        const lockDate = new Date(photoData.photo.locks_at);
        const now = new Date();
        return now > lockDate;
    };

    const handleBack = () => {
        // Go back to the grid view
        if (pocketTitle && eventTitle) {
            navigate(`/pockets/${pocketTitle}/${eventTitle}`);
        } else {
            navigate(-1);
        }
    };

    const handleToggleFavorite = async (photo: Photo) => {
        try {
            console.log('🔄 [PhotoDetailsView] Toggling favorite for photo:', photo.id, 'Current state:', photo.is_favorite);

            await favoriteMutation.mutateAsync({
                photoId: photo.id,
                isFavorite: photo.is_favorite
            });

            console.log('✅ Photo favorite status updated');
        } catch (err) {
            console.error('❌ [PhotoDetailsView] Failed to toggle favorite:', err);

            // Show user-friendly error message
            if (err instanceof Error) {
                if (err.message.includes('502')) {
                    console.error('❌ [PhotoDetailsView] Server is temporarily unavailable. Please try again later.');
                } else if (err.message.includes('Network')) {
                    console.error('❌ [PhotoDetailsView] Network error. Please check your connection.');
                } else {
                    console.error('❌ [PhotoDetailsView] Unexpected error:', err.message);
                }
            }
        }
    };

    const getPhotoUrl = (photo: Photo): string => {
        let rawUrl: string | undefined;
        if (typeof photo.photo_url === 'string') {
            rawUrl = photo.photo_url;
        } else if (typeof photo.photo_url === 'object') {
            rawUrl = photo.photo_url?.url_med ?? photo.photo_url?.url_small;
        }
        if (!rawUrl) return DEFAULT_PHOTO_PLACEHOLDER;
        if (rawUrl.startsWith('http')) return rawUrl;
        return `https://${rawUrl}`;
    };

    const handlePrevious = () => {
        if (currentPhotoIndex > 0) {
            const prevPhoto = sortedPhotos[currentPhotoIndex - 1];
            const shortId = prevPhoto.id.slice(-6);
            navigate(`/pockets/${pocketTitle}/${eventTitle}/photo/${shortId}`);
        }
    };

    const handleNext = () => {
        if (currentPhotoIndex < sortedPhotos.length - 1) {
            const nextPhoto = sortedPhotos[currentPhotoIndex + 1];
            const shortId = nextPhoto.id.slice(-6);
            navigate(`/pockets/${pocketTitle}/${eventTitle}/photo/${shortId}`);
        }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowLeft') {
            handlePrevious();
        } else if (e.key === 'ArrowRight') {
            handleNext();
        } else if (e.key === 'Escape') {
            handleBack();
        }
    };

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [currentPhotoIndex, sortedPhotos]);

    if (isLoading) {
        return (
            <div className="photo-detail-view">
                <div className="photo-detail-content">
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <div className="loading-text">Loading photo...</div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !photoData?.photo) {
        return (
            <div className="photo-detail-view">
                <div className="photo-detail-content">
                    <div className="error-message">{typeof error === 'string' ? error : error?.message || 'Photo not found'}</div>
                    <button onClick={handleBack} className="retry-button">Back</button>
                </div>
            </div>
        );
    }

    const { photo } = photoData;

    return (
        <div className="photo-detail-view">
            <header className="grid-photo-header">
                <div className="header-top">
                    <div className="back-button-section">
                        <button onClick={handleBack} className="back-button"><span>←</span></button>
                        <h1 className="event-title">Photo Details</h1>
                    </div>
                    <div className="photo-navigation">
                        <span className="photo-counter">
                            {currentPhotoIndex + 1} of {sortedPhotos.length}
                        </span>
                    </div>
                </div>
            </header>
            <div className="photo-detail-content">
                <div className="photo-detail-image-section">
                    <button
                        className="nav-button prev-button"
                        onClick={handlePrevious}
                        disabled={currentPhotoIndex === 0}
                        title="Previous photo (←)"
                    >
                        ‹
                    </button>
                    <div className="photo-detail-image">
                        <img
                            src={getPhotoUrl(photo)}
                            alt="Event photo"
                            onError={(e) => {
                                e.currentTarget.src = DEFAULT_PHOTO_PLACEHOLDER;
                            }}
                        />
                        {/* Favorite button positioned at top left of photo */}
                        <button
                            className={`photo-favorite-button ${photo.is_favorite ? 'favorited' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleToggleFavorite(photo);
                            }}
                            title={photo.is_favorite ? "Remove from favorites" : "Add to favorites"}
                            disabled={favoriteMutation.isPending}
                        >
                            {photo.is_favorite ? '❤️' : '🤍'}
                        </button>
                    </div>
                    <button
                        className="nav-button next-button"
                        onClick={handleNext}
                        disabled={currentPhotoIndex === sortedPhotos.length - 1}
                        title="Next photo (→)"
                    >
                        ›
                    </button>
                </div>
                <div className="photo-detail-sidebar">
                    {photo.can_delete && !isPhotoLocked() && (
                        <div className="photo-actions-header">
                            <div className="action-buttons">
                                {/* Delete button could be implemented here if needed */}
                            </div>
                        </div>
                    )}
                    <div className="tabs-container">
                        <div className="tabs-header">
                            <button
                                className={`tab-button ${activeTab === 'comments' ? 'active' : ''}`}
                                onClick={() => setActiveTab('comments')}
                            >
                                Comments ({comments.length})
                            </button>
                            <button
                                className={`tab-button ${activeTab === 'info' ? 'active' : ''}`}
                                onClick={() => setActiveTab('info')}
                            >
                                Photo Info
                            </button>
                        </div>
                        <div className="tab-content">
                            {activeTab === 'comments' && (
                                <div className="comments-tab">
                                    <CommentsSection
                                        photoId={photo.id}
                                    />
                                </div>
                            )}
                            {activeTab === 'info' && (
                                <div className="info-tab">
                                    <div className="photo-detail-info">
                                        <div className="info-row">
                                            <span className="info-label">Added:</span>
                                            <span className="info-value">{formatDate(photo.created_at)}</span>
                                        </div>
                                        <div className="info-row">
                                            <span className="info-label">Type:</span>
                                            <span className="info-value">{photo.media_type}</span>
                                        </div>
                                        {comments.length > 0 && (
                                            <div className="info-row">
                                                <span className="info-label">Comments:</span>
                                                <span className="info-value">{comments.length}</span>
                                            </div>
                                        )}
                                        {photo.locks_at && (
                                            <div className="info-row">
                                                <span className="info-label">Locks at:</span>
                                                <span className="info-value">{formatDate(photo.locks_at)}</span>
                                            </div>
                                        )}
                                        {isPhotoLocked() && (
                                            <div className="info-row locked-notice">
                                                <span className="info-label">Status:</span>
                                                <span className="info-value locked">🔒 Locked</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PhotoDetailsView; 
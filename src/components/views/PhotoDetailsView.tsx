import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import type { Photo } from '../../types/api';
import CommentsSection from '../ui/CommentsSection';
import { usePhotoByShortId, useFavoriteMutation, useComments, usePhotoDetails, useDeletePhotoMutation } from '../../hooks/usePhotos';
import { getCurrentSortFilter, sortPhotos } from '../../utils/sorting';
import { getFlashDescription } from '../../utils/metadata';
import './PhotoDetailsView.css';

const DEFAULT_PHOTO_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjNjY3ZWVhIi8+CjxyZWN0IHg9IjQwIiB5PSI0MCIgd2lkdGg9IjEyMCIgaGVpZ2h0PSI3MCIgcng9IjgiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4yIi8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjY1IiByPSIxNSIgZmlsbD0iI2ZmZmZmZiIgZmlsbC1vcGFjaXR5PSIwLjYiLz4KPHBhdGggZD0iTTkwIDc1TDk1IDgwTDEwNSA3MEwxMTUgODBMMTIwIDc1IiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIgc3Ryb2tlLW9wYWNpdHk9IjAuNiIvPgo8dGV4dCB4PSIxMDAiIHk9IjEzMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmaWxsPSIjZmZmZmZmIiBmaWxsLW9wYWNpdHk9IjAuOCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Tm8gUGhvdG9zPC90ZXh0Pgo8L3N2Zz4K';

const PhotoDetailsView: React.FC = () => {
    const { pocketTitle, eventTitle, photoShortId } = useParams<{ pocketTitle: string; eventTitle: string; photoShortId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState<'comments' | 'info'>('comments');

    // React Query hooks
    const {
        data: photoData,
        isLoading,
        error
    } = usePhotoByShortId(pocketTitle, eventTitle, photoShortId);

    const favoriteMutation = useFavoriteMutation();
    const deletePhotoMutation = useDeletePhotoMutation();

    // Get comments data for the current photo
    const {
        data: comments = []
    } = useComments(photoData?.photo?.id);

    // Get detailed photo metadata
    const {
        data: photoDetails,
        isLoading: isLoadingPhotoDetails,
        error: photoDetailsError
    } = usePhotoDetails(photoData?.photo?.id);

    // Debug logging for metadata
    React.useEffect(() => {
        if (photoDetails) {
            console.log('📸 [PhotoDetailsView] Photo details loaded:', photoDetails);
            console.log('📸 [PhotoDetailsView] Photo metadata:', photoDetails.photo_metadata);
            console.log('📸 [PhotoDetailsView] Metadata valid?', photoDetails.photo_metadata?.Valid);
            if (photoDetails.photo_metadata?.Valid) {
                console.log('📸 [PhotoDetailsView] Raw metadata message:', photoDetails.photo_metadata.RawMessage);
            }
        }
        if (photoDetailsError) {
            console.error('❌ [PhotoDetailsView] Error loading photo details:', photoDetailsError);
        }
    }, [photoDetails, photoDetailsError]);

    // Parse metadata from API response
    const getMetadata = () => {
        if (!photoDetails?.photo_metadata?.Valid) {
            return null;
        }

        try {
            // If RawMessage contains JSON string, parse it
            if (photoDetails.photo_metadata.RawMessage) {
                if (typeof photoDetails.photo_metadata.RawMessage === 'string') {
                    return JSON.parse(photoDetails.photo_metadata.RawMessage);
                } else {
                    return photoDetails.photo_metadata.RawMessage;
                }
            }
            return null;
        } catch (error) {
            console.error('❌ [PhotoDetailsView] Failed to parse metadata:', error);
            return null;
        }
    };

    const metadata = getMetadata();

    // Get current sort filter and sorted photos for navigation
    const currentSortFilter = getCurrentSortFilter();
    const sortedPhotos = photoData?.allPhotos ? sortPhotos(photoData.allPhotos, currentSortFilter) : [];
    const currentPhotoIndex = sortedPhotos.findIndex(photo => photo.id === photoData?.photo?.id);

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const formatCameraSettings = (metadata: any): string => {
        const parts: string[] = [];
        if (metadata.settings?.fNumber) {
            parts.push(`f/${metadata.settings.fNumber}`);
        }
        if (metadata.settings?.exposureTime) {
            const exposureTime = metadata.settings.exposureTime;
            if (exposureTime < 1) {
                parts.push(`1/${Math.round(1 / exposureTime)}s`);
            } else {
                parts.push(`${exposureTime}s`);
            }
        }
        if (metadata.settings?.iso) {
            parts.push(`ISO ${metadata.settings.iso}`);
        }
        if (metadata.settings?.focalLength) {
            parts.push(`${metadata.settings.focalLength}mm`);
        }
        return parts.join(' • ');
    };

    const isPhotoLocked = () => {
        if (!photoData?.photo?.locks_at) return false;
        const lockDate = new Date(photoData.photo.locks_at);
        const now = new Date();
        return now > lockDate;
    };

    const handleBack = () => {
        // Go back to the previous page if we know where we came from
        if (location.state?.from === 'eventView' || location.state?.from === 'gridPhotoView') {
            navigate(-1);
        } else {
            // Fallback: go to eventView
            if (pocketTitle && eventTitle) {
                navigate(`/pockets/${pocketTitle}/${eventTitle}`);
            } else {
                navigate(-1);
            }
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
            console.log('🔄 [PhotoDetailsView] Deleting photo:', photo.id);

            await deletePhotoMutation.mutateAsync(photo.id);

            console.log('✅ Photo deleted successfully');

            // Navigate back to the grid view
            handleBack();
        } catch (err) {
            console.error('❌ [PhotoDetailsView] Failed to delete photo:', err);

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

    // Auto-scroll thumbnail carousel to keep active thumbnail visible
    useEffect(() => {
        if (sortedPhotos.length > 1 && currentPhotoIndex >= 0) {
            // Small delay to ensure DOM has updated
            const timeoutId = setTimeout(() => {
                const thumbnailContainer = document.querySelector('.thumbnail-container') as HTMLElement;
                const activeThumbnail = document.querySelector('.thumbnail-item.active') as HTMLElement;

                if (thumbnailContainer && activeThumbnail) {
                    const containerRect = thumbnailContainer.getBoundingClientRect();
                    const thumbnailRect = activeThumbnail.getBoundingClientRect();
                    const containerWidth = containerRect.width;
                    const thumbnailWidth = thumbnailRect.width;

                    // Calculate the center position of the container
                    const containerCenter = containerRect.left + containerWidth / 2;
                    const thumbnailCenter = thumbnailRect.left + thumbnailWidth / 2;

                    // Check if active thumbnail is outside the visible area
                    const isOutsideLeft = thumbnailRect.left < containerRect.left;
                    const isOutsideRight = thumbnailRect.right > containerRect.right;

                    if (isOutsideLeft) {
                        // Scroll to show the active thumbnail at the left edge with some padding
                        thumbnailContainer.scrollLeft -= (containerRect.left - thumbnailRect.left) + 20;
                    } else if (isOutsideRight) {
                        // Scroll to show the active thumbnail at the right edge with some padding
                        thumbnailContainer.scrollLeft += (thumbnailRect.right - containerRect.right) + 20;
                    } else {
                        // If thumbnail is visible, try to center it if there's enough space
                        const scrollOffset = thumbnailCenter - containerCenter;
                        if (Math.abs(scrollOffset) > thumbnailWidth / 2) {
                            thumbnailContainer.scrollLeft += scrollOffset;
                        }
                    }
                }
            }, 100); // Small delay to ensure DOM updates

            return () => clearTimeout(timeoutId);
        }
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
                <header className="grid-photo-header">
                    <div className="header-top">
                        <div className="back-button-section">
                            <button onClick={handleBack} className="back-button">
                                <span>←</span>
                            </button>
                            <h1 className="event-title">Photo Not Found</h1>
                        </div>
                    </div>
                </header>
                <div className="photo-detail-content">
                    <div className="photo-not-found-container">
                        <div className="photo-not-found-content">
                            <div className="photo-not-found-icon">📷</div>
                            <h3>Photo Not Found</h3>
                            <p>
                                {typeof error === 'string'
                                    ? error
                                    : error?.message || 'This photo may still be loading from the server, or it may have been moved or deleted.'
                                }
                            </p>
                            <div className="photo-not-found-details">
                                <div className="detail-item">
                                    <span className="detail-icon">⏳</span>
                                    <span className="detail-text">The photo might still be loading from the backend</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-icon">❌</span>
                                    <span className="detail-text">The photo may have been deleted or moved</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-icon">🔗</span>
                                    <span className="detail-text">The link might be incorrect or expired</span>
                                </div>
                            </div>
                            <div className="photo-not-found-actions">
                                <button onClick={handleBack} className="back-to-event-button">
                                    <div className="button-content">
                                        <div className="button-icon">🏠</div>
                                        <div className="button-text">
                                            <span className="button-title">Back to Event</span>
                                            <span className="button-subtitle">Return to photo gallery</span>
                                        </div>
                                    </div>
                                    <div className="button-arrow">→</div>
                                </button>
                            </div>
                        </div>
                    </div>
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

                        {/* Delete button positioned underneath favorite button */}
                        {photo.can_delete && (
                            <button
                                className="photo-delete-button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeletePhoto(photo);
                                }}
                                title="Delete photo"
                                disabled={deletePhotoMutation.isPending}
                            >
                                🗑️
                            </button>
                        )}
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

                {/* Thumbnail Carousel */}
                {sortedPhotos.length > 1 && (
                    <div className="photo-thumbnail-carousel">
                        <div
                            className="thumbnail-container"
                            onWheel={(e) => {
                                e.preventDefault();
                                const container = e.currentTarget;
                                container.scrollLeft += e.deltaY;
                            }}
                        >
                            {sortedPhotos.map((photoItem, index) => (
                                <div
                                    key={photoItem.id}
                                    className={`thumbnail-item ${index === currentPhotoIndex ? 'active' : ''}`}
                                    onClick={() => {
                                        const shortId = photoItem.id.slice(-6);
                                        navigate(`/pockets/${pocketTitle}/${eventTitle}/photo/${shortId}`);
                                    }}
                                >
                                    <img
                                        src={getPhotoUrl(photoItem)}
                                        alt={`Photo ${index + 1}`}
                                        onError={(e) => {
                                            e.currentTarget.src = DEFAULT_PHOTO_PLACEHOLDER;
                                        }}
                                    />
                                    {photoItem.is_favorite && (
                                        <div className="thumbnail-favorite-indicator">❤️</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="photo-detail-sidebar">
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
                                        {/* Loading state for photo details */}
                                        {isLoadingPhotoDetails && (
                                            <div className="info-section">
                                                <div className="loading-metadata">
                                                    <div className="loading-spinner-small"></div>
                                                    <span>Loading photo details...</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Photo Details Section */}
                                        <div className="info-section">
                                            <h4 className="info-section-title">Photo Details</h4>

                                            {/* Date Taken (from EXIF) */}
                                            {metadata?.dateTimeOriginal && (
                                                <div className="info-row">
                                                    <span className="info-label">�� Date Taken:</span>
                                                    <span className="info-value">{formatDate(metadata.dateTimeOriginal)}</span>
                                                </div>
                                            )}

                                            <div className="info-row">
                                                <span className="info-label">📤 Added:</span>
                                                <span className="info-value">{formatDate(photo.created_at)}</span>
                                            </div>

                                            {/* Photo Author */}
                                            {photoDetails?.photo_author && (
                                                <div className="info-row">
                                                    <span className="info-label">👤 Author:</span>
                                                    <span className="info-value">
                                                        {photoDetails.photo_author.first_name} {photoDetails.photo_author.last_name}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="info-row">
                                                <span className="info-label">📁 Type:</span>
                                                <span className="info-value">{photo.media_type}</span>
                                            </div>

                                            {/* File Size */}
                                            {metadata?.fileSize && (
                                                <div className="info-row">
                                                    <span className="info-label">💾 File Size:</span>
                                                    <span className="info-value">{formatFileSize(metadata.fileSize)}</span>
                                                </div>
                                            )}

                                            {/* Dimensions */}
                                            {metadata?.dimensions && (
                                                <div className="info-row">
                                                    <span className="info-label">📐 Dimensions:</span>
                                                    <span className="info-value">
                                                        {metadata.dimensions.width} × {metadata.dimensions.height}
                                                    </span>
                                                </div>
                                            )}

                                            {/* MIME Type */}
                                            {metadata?.mimeType && (
                                                <div className="info-row">
                                                    <span className="info-label">🏷️ Format:</span>
                                                    <span className="info-value">{metadata.mimeType}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Camera Information Section */}
                                        {metadata?.camera && (
                                            <div className="info-section">
                                                <h4 className="info-section-title">Camera Information</h4>

                                                {metadata.camera.make && (
                                                    <div className="info-row">
                                                        <span className="info-label">📷 Camera:</span>
                                                        <span className="info-value">
                                                            {metadata.camera.make} {metadata.camera.model}
                                                        </span>
                                                    </div>
                                                )}

                                                {metadata.camera.lens && (
                                                    <div className="info-row">
                                                        <span className="info-label">🔍 Lens:</span>
                                                        <span className="info-value">{metadata.camera.lens}</span>
                                                    </div>
                                                )}

                                                {/* Camera Settings */}
                                                {metadata.settings && formatCameraSettings(metadata) && (
                                                    <div className="info-row">
                                                        <span className="info-label">⚙️ Settings:</span>
                                                        <span className="info-value">{formatCameraSettings(metadata)}</span>
                                                    </div>
                                                )}

                                                {/* Flash */}
                                                {(metadata.rawExif?.flashRaw !== undefined || metadata.settings?.flash !== undefined) && (
                                                    <div className="info-row">
                                                        <span className="info-label">⚡ Flash:</span>
                                                        <span className="info-value">
                                                            {metadata.rawExif?.flashRaw !== undefined
                                                                ? getFlashDescription(metadata.rawExif.flashRaw)
                                                                : metadata.settings?.flash ? 'Flash fired' : 'Flash did not fire'
                                                            }
                                                        </span>
                                                    </div>
                                                )}

                                                {/* White Balance */}
                                                {metadata.rawExif?.whiteBalance && (
                                                    <div className="info-row">
                                                        <span className="info-label">🌡️ White Balance:</span>
                                                        <span className="info-value">{metadata.rawExif.whiteBalance}</span>
                                                    </div>
                                                )}

                                                {/* Orientation */}
                                                {metadata.rawExif?.orientation && (
                                                    <div className="info-row">
                                                        <span className="info-label">🔄 Orientation:</span>
                                                        <span className="info-value">{metadata.rawExif.orientation}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Location Section */}
                                        {metadata?.location && (
                                            <div className="info-section">
                                                <h4 className="info-section-title">Location</h4>
                                                <div className="info-row">
                                                    <span className="info-label">📍 GPS:</span>
                                                    <span className="info-value">
                                                        {metadata.location.latitude.toFixed(6)}, {metadata.location.longitude.toFixed(6)}
                                                        {metadata.location.altitude && ` (${Math.round(metadata.location.altitude)}m)`}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Show basic info when photo details not loaded yet */}
                                        {!photoDetails && !isLoadingPhotoDetails && (
                                            <div className="info-section">
                                                <h4 className="info-section-title">File Information</h4>
                                                <div className="info-row">
                                                    <span className="info-label">ℹ️ Status:</span>
                                                    <span className="info-value">Photo details not loaded</span>
                                                </div>
                                                <div className="info-row">
                                                    <span className="info-label">📁 Type:</span>
                                                    <span className="info-value">{photo.media_type}</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Fallback basic info if no metadata available */}
                                        {!photoDetails?.photo_metadata?.Valid && !isLoadingPhotoDetails && photoDetails && (
                                            <div className="info-section">
                                                <h4 className="info-section-title">File Information</h4>
                                                <div className="info-row">
                                                    <span className="info-label">ℹ️ Status:</span>
                                                    <span className="info-value">
                                                        {photoDetails.photo_metadata === null ? 'No metadata stored' : 'Metadata not available'}
                                                    </span>
                                                </div>
                                                <div className="info-row">
                                                    <span className="info-label">📁 Type:</span>
                                                    <span className="info-value">{photo.media_type}</span>
                                                </div>
                                                <div className="info-note">
                                                    This photo was uploaded without EXIF metadata, or the metadata could not be extracted during upload.
                                                </div>
                                            </div>
                                        )}

                                        {/* System Information Section */}
                                        <div className="info-section">
                                            <h4 className="info-section-title">System Information</h4>

                                            {comments.length > 0 && (
                                                <div className="info-row">
                                                    <span className="info-label">💬 Comments:</span>
                                                    <span className="info-value">{comments.length}</span>
                                                </div>
                                            )}

                                            {photo.locks_at && (
                                                <div className="info-row">
                                                    <span className="info-label">🔒 Locks at:</span>
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
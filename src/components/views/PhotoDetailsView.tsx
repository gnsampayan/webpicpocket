import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Photo, PhotoCommentView } from '../../types/api';
import { api } from '../../services/api';
import CommentsSection from '../ui/CommentsSection';
import './PhotoDetailsView.css';

const DEFAULT_PHOTO_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiB2aWV3Qm94PSIwIDAgMjAwIDE1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxNTAiIGZpbGw9IiM2NjdlZWEiLz4KPHJlY3QgeD0iNDAiIHk9IjQwIiB3aWR0aD0iMTIwIiBoZWlnaHQ9IjcwIiByeD0iOCIgZmlsbD0iI2ZmZmZmZiIgZmlsbC1vcGFjaXR5PSIwLjIiLz4KPGNpcmNsZSBjeD0iMTAwIiBjeT0iNjUiIHI9IjE1IiBmaWxsPSIjZmZmZmZmIiBmaWxsLW9wYWNpdHk9IjAuNiIvPgo8cGF0aCBkPSJNOTAgNzVMOTUgODBMMTA1IDcwTDExNSA4MEwxMjAgNzUiIHN0cm9rZT0iI2ZmZmZmZiIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIiBzdHJva2Utb3BhY2l0eT0iMC42Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTMwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC44IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5ObyBQaG90b3M8L3RleHQ+Cjwvc3ZnPgo=';

const PhotoDetailsView: React.FC = () => {
    const { pocketTitle, eventTitle, photoShortId } = useParams<{ pocketTitle: string; eventTitle: string; photoShortId: string }>();
    const navigate = useNavigate();
    const [photo, setPhoto] = useState<Photo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [commentCount, setCommentCount] = useState(0);
    const [activeTab, setActiveTab] = useState<'comments' | 'info'>('comments');

    useEffect(() => {
        const fetchPhoto = async () => {
            if (!pocketTitle || !eventTitle || !photoShortId) {
                setError('Missing URL parameters');
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                setError(null);
                // Parse pocket and event IDs from URL
                const decodedPocketTitle = decodeURIComponent(pocketTitle);
                const pocketLastDashIndex = decodedPocketTitle.lastIndexOf('-');
                const pocketIdSuffix = pocketLastDashIndex !== -1 ? decodedPocketTitle.substring(pocketLastDashIndex + 1) : '';
                const decodedEventTitle = decodeURIComponent(eventTitle);
                const eventLastDashIndex = decodedEventTitle.lastIndexOf('-');
                const eventIdSuffix = eventLastDashIndex !== -1 ? decodedEventTitle.substring(eventLastDashIndex + 1) : '';
                // Fetch pockets to get the pocket ID
                const pocketsData = await api.getPockets();
                const currentPocket = pocketsData.find(p => p.pocket_id.endsWith(pocketIdSuffix));
                if (!currentPocket) throw new Error('Pocket not found');
                // Fetch events for this pocket to get the event ID
                const eventsData = await api.getEvents(currentPocket.pocket_id);
                const currentEvent = eventsData.find(e => e.id.endsWith(eventIdSuffix));
                if (!currentEvent) throw new Error('Event not found');
                // Fetch event details to get all photos
                const eventResponse = await api.getEventDetails(currentEvent.id);
                // Find the photo with the matching short ID
                const foundPhoto = eventResponse.photos.find((p: Photo) => p.id.slice(-6) === photoShortId);
                if (!foundPhoto) throw new Error('Photo not found');
                setPhoto(foundPhoto);
                setCommentCount(foundPhoto.comment_count);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load photo');
            } finally {
                setLoading(false);
            }
        };
        fetchPhoto();
    }, [pocketTitle, eventTitle, photoShortId]);

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

    const handleCommentsLoaded = (comments: PhotoCommentView[]) => {
        setCommentCount(comments.length);
    };

    const isPhotoLocked = () => {
        if (!photo?.locks_at) return false;
        const lockDate = new Date(photo.locks_at);
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

    if (loading) {
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
    if (error || !photo) {
        return <div className="photo-detail-view"><div className="photo-detail-content"><div className="error-message">{error || 'Photo not found'}</div><button onClick={handleBack} className="retry-button">Back</button></div></div>;
    }

    return (
        <div className="photo-detail-view">
            <header className="grid-photo-header">
                <div className="header-top">
                    <div className="back-button-section">
                        <button onClick={handleBack} className="back-button"><span>←</span></button>
                        <h1 className="event-title">Photo Details</h1>
                    </div>
                </div>
            </header>
            <div className="photo-detail-content">
                <div className="photo-detail-image-section">
                    <div className="photo-detail-image">
                        <img
                            src={getPhotoUrl(photo)}
                            alt="Event photo"
                            onError={(e) => {
                                e.currentTarget.src = DEFAULT_PHOTO_PLACEHOLDER;
                            }}
                        />
                    </div>
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
                                Comments ({commentCount})
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
                                        onCommentsLoaded={handleCommentsLoaded}
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
                                        {commentCount > 0 && (
                                            <div className="info-row">
                                                <span className="info-label">Comments:</span>
                                                <span className="info-value">{commentCount}</span>
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
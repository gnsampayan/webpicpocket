import React, { useState } from 'react';
import type { Photo, PhotoCommentView } from '../../types/api';
import CommentsSection from '../ui/CommentsSection';
import './PhotoDetailsView.css';

interface PhotoDetailsViewProps {
    photo: Photo;
    getPhotoUrl: (photo: Photo) => string;
    onDeletePhoto?: (photo: Photo) => void;
}

const PhotoDetailsView: React.FC<PhotoDetailsViewProps> = ({
    photo,
    getPhotoUrl,
    onDeletePhoto
}) => {
    const [activeTab, setActiveTab] = useState<'comments' | 'info'>('comments');
    const [commentCount, setCommentCount] = useState(photo.comment_count);

    const DEFAULT_PHOTO_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiB2aWV3Qm94PSIwIDAgMjAwIDE1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxNTAiIGZpbGw9IiM2NjdlZWEiLz4KPHJlY3QgeD0iNDAiIHk9IjQwIiB3aWR0aD0iMTIwIiBoZWlnaHQ9IjcwIiByeD0iOCIgZmlsbD0iI2ZmZmZmZiIgZmlsbC1vcGFjaXR5PSIwLjIiLz4KPGNpcmNsZSBjeD0iMTAwIiBjeT0iNjUiIHI9IjE1IiBmaWxsPSIjZmZmZmZmIiBmaWxsLW9wYWNpdHk9IjAuNiIvPgo8cGF0aCBkPSJNOTAgNzVMOTUgODBMMTA1IDcwTDExNSA4MEwxMjAgNzUiIHN0cm9rZT0iI2ZmZmZmZiIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIiBzdHJva2Utb3BhY2l0eT0iMC42Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTMwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC44IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5ObyBQaG90b3M8L3RleHQ+Cjwvc3ZnPgo=';

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

    // Single callback to handle comment count updates based on actual comments data
    const handleCommentsLoaded = (comments: PhotoCommentView[]) => {
        // Always use the actual comments length from the API
        setCommentCount(comments.length);
        console.log('Comments loaded, count updated:', comments.length);
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onDeletePhoto) {
            onDeletePhoto(photo);
        }
    };

    // Check if photo is locked (past locks_at date)
    const isPhotoLocked = () => {
        if (!photo.locks_at) return false;
        const lockDate = new Date(photo.locks_at);
        const now = new Date();
        return now > lockDate;
    };

    return (
        <div className="photo-detail-view">
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
                    {/* Delete button outside tabs */}
                    {photo.can_delete && !isPhotoLocked() && (
                        <div className="photo-actions-header">
                            <div className="action-buttons">
                                <button
                                    className="delete-button"
                                    onClick={handleDeleteClick}
                                    title="Delete photo"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Tabs */}
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
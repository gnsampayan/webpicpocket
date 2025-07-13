import React from 'react';
import { createPortal } from 'react-dom';
import type { PreviewPhoto } from '../../types/api';
import CommentsSection from '../ui/CommentsSection';
import './PhotoDetailsModal.css';

interface PhotoDetailsModalProps {
    photo: PreviewPhoto | null;
    isOpen: boolean;
    onClose: () => void;
    getPhotoUrl: (photo: PreviewPhoto) => string;
    onToggleFavorite?: (photo: PreviewPhoto) => void;
    onDeletePhoto?: (photo: PreviewPhoto) => void;
}

const PhotoDetailsModal: React.FC<PhotoDetailsModalProps> = ({
    photo,
    isOpen,
    onClose,
    getPhotoUrl,
    onToggleFavorite,
    onDeletePhoto
}) => {
    if (!isOpen || !photo) return null;

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

    const handleModalOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleCommentAdded = () => {
        // You can add logic here to refresh the photo data if needed
        console.log('Comment added to photo:', photo.id);
    };

    const handleFavoriteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onToggleFavorite) {
            onToggleFavorite(photo);
        }
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onDeletePhoto) {
            onDeletePhoto(photo);
            onClose(); // Close modal after deletion
        }
    };

    // Check if photo is locked (past locks_at date)
    const isPhotoLocked = () => {
        if (!photo.locks_at) return false;
        const lockDate = new Date(photo.locks_at);
        const now = new Date();
        return now > lockDate;
    };

    const modalContent = (
        <div className="photo-detail-modal-overlay" onClick={handleModalOverlayClick}>
            <div className="photo-detail-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Photo Details</h2>
                    <button onClick={onClose} className="close-button">
                        ✕
                    </button>
                </div>

                <div className="modal-body">
                    <div className="photo-detail-image">
                        <img
                            src={getPhotoUrl(photo)}
                            alt="Event photo"
                            onError={(e) => {
                                e.currentTarget.src = DEFAULT_PHOTO_PLACEHOLDER;
                            }}
                        />
                    </div>

                    <div className="photo-detail-info">
                        <div className="info-header">
                            <h3>Photo Information</h3>
                            <div className="photo-actions">
                                {/* Single favorite toggle button */}
                                <button
                                    className={`favorite-button ${photo.is_favorite ? 'favorited' : ''}`}
                                    onClick={handleFavoriteClick}
                                    title={photo.is_favorite ? "Remove from favorites" : "Add to favorites"}
                                >
                                    {photo.is_favorite ? '❤️' : '🤍'}
                                </button>

                                {/* Delete button - only show if can delete and not locked */}
                                {photo.can_delete && !isPhotoLocked() && (
                                    <button
                                        className="delete-button"
                                        onClick={handleDeleteClick}
                                        title="Delete photo"
                                    >
                                        🗑️
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="info-row">
                            <span className="info-label">Added:</span>
                            <span className="info-value">{formatDate(photo.created_at)}</span>
                        </div>

                        <div className="info-row">
                            <span className="info-label">Type:</span>
                            <span className="info-value">{photo.media_type}</span>
                        </div>

                        {photo.comment_count > 0 && (
                            <div className="info-row">
                                <span className="info-label">Comments:</span>
                                <span className="info-value">{photo.comment_count}</span>
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

                {/* Comments Section */}
                <CommentsSection
                    photoId={photo.id}
                    onCommentAdded={handleCommentAdded}
                />
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default PhotoDetailsModal; 
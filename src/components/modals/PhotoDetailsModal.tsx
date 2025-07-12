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
}

const PhotoDetailsModal: React.FC<PhotoDetailsModalProps> = ({
    photo,
    isOpen,
    onClose,
    getPhotoUrl
}) => {
    if (!isOpen || !photo) return null;

    const DEFAULT_PHOTO_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjNjY3ZWVhIi8+CjxyZWN0IHg9IjQwIiB5PSI0MCIgd2lkdGg9IjEyMCIgaGVpZ2h0PSI3MCIgcng9IjgiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4yIi8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjY1IiByPSIxNSIgZmlsbD0iI2ZmZmZmZiIgZmlsbC1vcGFjaXR5PSIwLjYiLz4KPHBhdGggZD0iTTkwIDc1TDk1IDgwTDEwNSA3MEwxMTUgODBMMTIwIDc1IiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIgc3Ryb2tlLW9wYWNpdHk9IjAuNiIvPgo8dGV4dCB4PSIxMDAiIHk9IjEzMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmaWxsPSIjZmZmZmZmIiBmaWxsLW9wYWNpdHk9IjAuOCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Tm8gUGhvdG9zPC90ZXh0Pgo8L3N2Zz4K';

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
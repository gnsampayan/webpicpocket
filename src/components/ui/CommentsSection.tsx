import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { PhotoCommentView, PocketMember } from '../../types/api';
import './CommentsSection.css';

interface CommentsSectionProps {
    photoId: string;
    onCommentsLoaded?: (comments: PhotoCommentView[]) => void;
}

const CommentsSection: React.FC<CommentsSectionProps> = ({
    photoId,
    onCommentsLoaded
}) => {
    const [comments, setComments] = useState<PhotoCommentView[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const [editing, setEditing] = useState(false);
    const DEFAULT_PROFILE_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjUiIGN5PSIyNSIgcj0iMjUiIGZpbGw9IiM2NjdlZWEiLz4KPGNpcmNsZSBjeD0iMjUiIGN5PSIyMCIgcj0iOCIgZmlsbD0iI2ZmZmZmZiIgZmlsbC1vcGFjaXR5PSIwLjgiLz4KPHBhdGggZD0iTTEwIDQwQzEwIDM1IDE1IDMwIDI1IDMwQzM1IDMwIDQwIDM1IDQwIDQwIiBmaWxsPSIjZmZmZmZmIiBmaWxsLW9wYWNpdHk9IjAuOCIvPgo8L3N2Zz4K';

    // Fetch comments when component mounts
    useEffect(() => {
        fetchComments();
    }, [photoId]);

    const fetchComments = async () => {
        try {
            setLoading(true);
            setError(null);
            console.log('🔄 [CommentsSection] Fetching comments for photo:', photoId);
            const comments = await api.getPhotoComments(photoId);
            console.log('✅ [CommentsSection] Comments fetched successfully:', comments);
            setComments(comments || []);

            // Notify parent component about loaded comments
            onCommentsLoaded?.(comments || []);
        } catch (err) {
            console.error('❌ [CommentsSection] Failed to fetch comments:', err);
            setError('Failed to load comments');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        try {
            setSubmitting(true);
            setError(null);

            await api.addComment(photoId, { text: newComment.trim() });

            // Clear the input
            setNewComment('');

            // Refresh comments and notify parent with updated count
            await fetchComments();
        } catch (err) {
            console.error('❌ [CommentsSection] Failed to add comment:', err);
            setError('Failed to add comment');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditComment = async (commentId: string) => {
        if (!editText.trim()) return;

        try {
            setEditing(true);
            setError(null);

            await api.editComment(commentId, { text: editText.trim() });

            // Clear edit state
            setEditingCommentId(null);
            setEditText('');

            // Refresh comments and notify parent with updated count
            await fetchComments();
        } catch (err) {
            console.error('❌ [CommentsSection] Failed to edit comment:', err);
            setError('Failed to edit comment');
        } finally {
            setEditing(false);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        try {
            setError(null);

            await api.deleteComment(commentId);

            // Refresh comments and notify parent with updated count
            await fetchComments();
        } catch (err) {
            console.error('❌ [CommentsSection] Failed to delete comment:', err);
            setError('Failed to delete comment');
        }
    };

    const startEditing = (comment: PhotoCommentView) => {
        setEditingCommentId(comment.id);
        setEditText(comment.content || '');
    };

    const cancelEditing = () => {
        setEditingCommentId(null);
        setEditText('');
    };

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

        if (diffInHours < 1) {
            return 'Just now';
        } else if (diffInHours < 24) {
            return `${Math.floor(diffInHours)}h ago`;
        } else if (diffInHours < 168) { // 7 days
            return `${Math.floor(diffInHours / 24)}d ago`;
        } else {
            return date.toLocaleDateString();
        }
    };

    const getProfilePictureUrl = (member: PocketMember): string => {

        if (member.profile_picture_default) {
            return DEFAULT_PROFILE_PLACEHOLDER;
        }
        return member.profile_picture?.url_small || member.profile_picture?.url_medium || DEFAULT_PROFILE_PLACEHOLDER;
    };

    return (
        <div className="comments-section">
            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {/* Comments List */}
            <div className="comments-list">
                {loading ? (
                    <div className="loading-comments">
                        <div className="loading-spinner"></div>
                        <span>Loading comments...</span>
                    </div>
                ) : comments.length === 0 ? (
                    <div className="no-comments">
                        <span>No comments yet. Be the first to comment!</span>
                    </div>
                ) : (
                    comments.map((comment) => (
                        <div key={comment.id} className="comment-item">
                            <div className="comment-avatar">
                                <img
                                    src={getProfilePictureUrl(comment.author)}
                                    alt={comment.author.first_name}
                                    onError={(e) => {
                                        e.currentTarget.src = DEFAULT_PROFILE_PLACEHOLDER;
                                    }}
                                />
                            </div>
                            <div className="comment-content">
                                <div className="comment-header">
                                    <span className="comment-author">
                                        {comment.author.first_name} {comment.author.last_name}
                                    </span>
                                    <span className="comment-date">
                                        {formatDate(comment.created_at)}
                                    </span>
                                </div>
                                {editingCommentId === comment.id ? (
                                    <div className="comment-edit-form">
                                        <input
                                            type="text"
                                            value={editText}
                                            onChange={(e) => setEditText(e.target.value)}
                                            className="edit-comment-input"
                                            placeholder="Edit comment..."
                                        />
                                        <div className="edit-actions">
                                            <button
                                                onClick={() => handleEditComment(comment.id)}
                                                disabled={editing || !editText.trim()}
                                                className="save-edit-button"
                                            >
                                                {editing ? 'Saving...' : 'Save'}
                                            </button>
                                            <button
                                                onClick={cancelEditing}
                                                disabled={editing}
                                                className="cancel-edit-button"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <p className="comment-text">
                                            {comment.content}
                                        </p>
                                        <div className="comment-actions">
                                            <button
                                                onClick={() => startEditing(comment)}
                                                className="edit-comment-button"
                                                title="Edit comment"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => handleDeleteComment(comment.id)}
                                                className="delete-comment-button"
                                                title="Delete comment"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add Comment Form */}
            <form onSubmit={handleSubmitComment} className="add-comment-form">
                <div className="comment-input-container">
                    <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        disabled={submitting}
                        className="comment-input"
                    />
                    <button
                        type="submit"
                        disabled={submitting || !newComment.trim()}
                        className="submit-comment-button"
                    >
                        {submitting ? 'Posting...' : 'Post'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CommentsSection; 
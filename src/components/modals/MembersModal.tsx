import React from 'react';
import { useNavigate } from 'react-router-dom';
import './MembersModal.css';

interface Member {
    id: string;
    first_name: string;
    last_name: string;
    username: string;
    profile_picture_default: boolean;
    profile_picture?: {
        url_small?: string;
        url_medium?: string;
        url_large?: string;
        [key: string]: any;
    };
}

interface MembersModalProps {
    isOpen: boolean;
    onClose: () => void;
    members: Member[];
    title: string; // e.g., "Pocket Members" or "Event Members"
}

const MembersModal: React.FC<MembersModalProps> = ({ isOpen, onClose, members, title }) => {
    const navigate = useNavigate();

    if (!isOpen) return null;

    const getProfilePictureUrl = (member: Member) => {
        if (member.profile_picture_default || !member.profile_picture) {
            return null;
        }
        const rawUrl = member.profile_picture.url_medium ||
            member.profile_picture.url_small ||
            member.profile_picture.url_large;

        if (!rawUrl) {
            return null;
        }

        // URLs from backend are already complete URLs (S3 signed URLs), 
        // so only add https:// if they don't already have a protocol
        if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
            return rawUrl;
        }

        // Add https:// prefix for URLs that don't have it (fallback)
        return `https://${rawUrl}`;
    };

    const handleMemberClick = (member: Member) => {
        navigate(`/profile/${member.id}`);
        onClose(); // Close modal when navigating
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="members-modal-overlay" onClick={handleOverlayClick}>
            <div className="members-modal-content">
                <div className="members-modal-header">
                    <h3>{title}</h3>
                    <button className="members-modal-close" onClick={onClose}>
                        ✕
                    </button>
                </div>
                <div className="members-modal-body">
                    <div className="members-grid">
                        {members.map((member) => {
                            const profilePictureUrl = getProfilePictureUrl(member);

                            return (
                                <div
                                    key={member.id}
                                    className="member-card"
                                    onClick={() => handleMemberClick(member)}
                                >
                                    <div className="member-avatar-container">
                                        {profilePictureUrl ? (
                                            <img
                                                src={profilePictureUrl}
                                                alt={`${member.first_name} ${member.last_name}`}
                                                className="member-avatar-image"
                                                onError={(e) => {
                                                    // Hide image and show fallback
                                                    e.currentTarget.style.display = 'none';
                                                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                                    if (fallback) fallback.style.display = 'flex';
                                                }}
                                            />
                                        ) : null}
                                        <div
                                            className="member-avatar-fallback"
                                            style={{ display: profilePictureUrl ? 'none' : 'flex' }}
                                        >
                                            {member.first_name?.charAt(0)?.toUpperCase() || '?'}
                                            {member.last_name?.charAt(0)?.toUpperCase() || ''}
                                        </div>
                                    </div>
                                    <div className="member-info">
                                        <h4 className="member-name">
                                            {member.first_name} {member.last_name}
                                        </h4>
                                        <p className="member-username">@{member.username}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {members.length === 0 && (
                        <div className="no-members">
                            <div className="no-members-icon">👥</div>
                            <p>No members to display</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MembersModal; 
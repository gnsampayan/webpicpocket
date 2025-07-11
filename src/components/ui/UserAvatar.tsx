import React, { useState, useEffect } from 'react';
import { getUserData } from '../../utils/storage';
import type { UserInfo } from '../../types/api';
import './UserAvatar.css';

interface UserAvatarProps {
    size?: 'small' | 'medium' | 'large';
    className?: string;
    showName?: boolean;
    userInfo?: UserInfo | null; // Allow passing user info directly
}

const UserAvatar: React.FC<UserAvatarProps> = ({
    size = 'medium',
    className = '',
    showName = false,
    userInfo: propUserInfo
}) => {
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Default placeholder image as data URI for better reliability
    // SVG with explicit width/height (100x100) to prevent oval rendering
    const DEFAULT_PROFILE_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjNjY3ZWVhIi8+CjxjaXJjbGUgY3g9IjUwIiBjeT0iNDAiIHI9IjE2IiBmaWxsPSIjZmZmZmZmIiBmaWxsLW9wYWNpdHk9IjAuOCIvPgo8cGF0aCBkPSJNMjAgODBDMjAgNzAgMzAgNjAgNTAgNjBDNzAgNjAgODAgNzAgODAgODAiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC44Ii8+Cjwvc3ZnPgo=';

    useEffect(() => {
        // If userInfo is provided as prop, use it directly
        if (propUserInfo) {
            setUserInfo(propUserInfo);
            setLoading(false);
            return;
        }

        // Otherwise, load from storage
        const loadUserData = async () => {
            try {
                setLoading(true);
                setError(null);

                const userData = await getUserData();

                if (!userData) {
                    throw new Error('No user data found');
                }

                setUserInfo(userData as UserInfo);
            } catch (err) {
                console.error('❌ [UserAvatar] Failed to load user data:', err);
                // Don't set error here since ProtectedRoute will handle the redirect
                // Just log the error for debugging
            } finally {
                setLoading(false);
            }
        };

        loadUserData();
    }, [propUserInfo]);

    const getProfilePictureUrl = (): string => {
        if (!userInfo) {
            return DEFAULT_PROFILE_PLACEHOLDER;
        }

        // If user has default profile picture, use placeholder
        if (userInfo.profile_picture_default) {
            return DEFAULT_PROFILE_PLACEHOLDER;
        }

        // Use the appropriate size URL based on the size prop
        const profilePicture = userInfo.profile_picture;
        if (!profilePicture) {
            return DEFAULT_PROFILE_PLACEHOLDER;
        }

        // Get the appropriate URL based on size
        let rawUrl: string | undefined;
        switch (size) {
            case 'small':
                rawUrl = profilePicture.url_small || profilePicture.url_medium || profilePicture.url_large;
                break;
            case 'large':
                rawUrl = profilePicture.url_large || profilePicture.url_medium || profilePicture.url_small;
                break;
            case 'medium':
            default:
                rawUrl = profilePicture.url_medium || profilePicture.url_small || profilePicture.url_large;
                break;
        }

        if (!rawUrl) {
            return DEFAULT_PROFILE_PLACEHOLDER;
        }

        // URLs from backend don't have protocol prefix, so add https:// if needed
        if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
            return rawUrl;
        }

        // Add https:// prefix for URLs that don't have it
        return `https://${rawUrl}`;
    };

    const getDisplayName = (): string => {
        if (!userInfo) {
            return 'User';
        }

        const firstName = userInfo.first_name || '';
        const lastName = userInfo.last_name || '';

        if (firstName && lastName) {
            return `${firstName} ${lastName}`;
        } else if (firstName) {
            return firstName;
        } else if (lastName) {
            return lastName;
        } else {
            return userInfo.username || 'User';
        }
    };

    if (loading) {
        return (
            <div className={`user-avatar user-avatar--${size} user-avatar--loading ${className}`}>
                <div className="user-avatar__skeleton"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`user-avatar user-avatar--${size} user-avatar--error ${className}`}>
                <img
                    src={DEFAULT_PROFILE_PLACEHOLDER}
                    alt="User"
                    className="user-avatar__image"
                />
            </div>
        );
    }

    return (
        <div className={`user-avatar user-avatar--${size} ${className}`}>
            <div className="user-avatar__image-wrapper">
                <img
                    src={getProfilePictureUrl()}
                    alt={getDisplayName()}
                    className="user-avatar__image"
                    onError={(e) => {
                        // Fallback to placeholder if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.src = DEFAULT_PROFILE_PLACEHOLDER;
                    }}
                />
            </div>
            {showName && (
                <span className="user-avatar__name">{getDisplayName()}</span>
            )}
        </div>
    );
};

export default UserAvatar; 
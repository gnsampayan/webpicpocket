import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ProfileView.css';
import NavBar from '../ui/NavBar';
import { api } from '../../services/api';
import * as ApiTypes from '../../types/api';

interface ProfileUser extends ApiTypes.UserProfile {
    profile_picture_url: string;
}

const ProfileView: React.FC = () => {
    const { username } = useParams<{ username: string }>();
    const navigate = useNavigate();

    const [profile, setProfile] = useState<ProfileUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Default placeholder image as data URI for better reliability
    const DEFAULT_PROFILE_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjUiIGN5PSIyNSIgcj0iMjUiIGZpbGw9IiM2NjdlZWEiLz4KPGNpcmNsZSBjeD0iMjUiIGN5PSIyMCIgcj0iOCIgZmlsbD0iI2ZmZmZmZiIgZmlsbC1vcGFjaXR5PSIwLjgiLz4KPHBhdGggZD0iTTEwIDQwQzEwIDM1IDE1IDMwIDI1IDMwQzM1IDMwIDQwIDM1IDQwIDQwIiBmaWxsPSIjZmZmZmZmIiBmaWxsLW9wYWNpdHk9IjAuOCIvPgo8L3N2Zz4K';

    // Fetch profile data when component mounts or username changes
    useEffect(() => {
        const fetchProfile = async () => {
            if (!username) {
                setError('No username provided');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                console.log('🔍 [ProfileView] Looking for user in contacts:', username);

                // Get all contacts (including requests)
                const contactsResponse = await api.getContacts();
                const allContacts = [
                    ...(contactsResponse.contacts || []),
                    ...(contactsResponse.contact_requests_received || []),
                    ...(contactsResponse.contact_requests_sent || [])
                ];

                console.log('🔍 [ProfileView] All contacts:', allContacts.map(c => c.username));

                // Find exact username match (case-insensitive)
                const userProfile = allContacts.find(user =>
                    user.username.toLowerCase() === username.toLowerCase()
                );

                if (!userProfile) {
                    console.error('❌ [ProfileView] User not found in contacts');
                    console.error('❌ [ProfileView] Searched for:', username);
                    console.error('❌ [ProfileView] Available contacts:', allContacts.map(u => u.username));
                    throw new Error(`User "${username}" not found in your contacts`);
                }

                console.log('✅ [ProfileView] Found user in contacts:', userProfile.username);

                // Transform the user data to match ProfileUser interface
                const profileData: ProfileUser = {
                    ...userProfile,
                    profile_picture_url: userProfile.profile_picture?.url_large ||
                        userProfile.profile_picture?.url_medium ||
                        userProfile.profile_picture?.url_small || ''
                };

                setProfile(profileData);
                console.log('✅ [ProfileView] Profile loaded successfully:', profileData);
            } catch (err) {
                console.error('❌ [ProfileView] Error fetching profile:', err);
                setError(err instanceof Error ? err.message : 'Failed to load profile');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [username]);

    const getProfilePictureUrl = (profile: ProfileUser): string => {
        if (profile.profile_picture_url) {
            return profile.profile_picture_url;
        }

        if (profile.profile_picture?.url_large) {
            return profile.profile_picture.url_large;
        }

        if (profile.profile_picture?.url_medium) {
            return profile.profile_picture.url_medium;
        }

        if (profile.profile_picture?.url_small) {
            return profile.profile_picture.url_small;
        }

        return DEFAULT_PROFILE_PLACEHOLDER;
    };

    const handleBackToContacts = () => {
        navigate('/contacts');
    };

    // Show loading state
    if (loading) {
        return (
            <div className="profile-view-page">
                <NavBar />
                <main className="main-content">
                    <div className="loading-state">
                        <div className="loading-spinner"></div>
                        <p>Loading profile...</p>
                    </div>
                </main>
            </div>
        );
    }

    // Show error state
    if (error || !profile) {
        return (
            <div className="profile-view-page">
                <NavBar />
                <main className="main-content">
                    <div className="error-state">
                        <h2>Error Loading Profile</h2>
                        <p>{error || 'Profile not found'}</p>
                        <button onClick={handleBackToContacts} className="retry-button">
                            Back to Contacts
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="profile-view-page">
            <NavBar />
            <main className="main-content">
                <div className="profile-view">
                    <div className="profile-header">
                        <button
                            className="back-button"
                            onClick={handleBackToContacts}
                        >
                            ←
                        </button>
                    </div>

                    <div className="profile-content">
                        <div className="profile-avatar-section">
                            <div className="profile-avatar">
                                <img
                                    src={getProfilePictureUrl(profile)}
                                    alt={`${profile.first_name} ${profile.last_name}`}
                                    onError={(e) => {
                                        e.currentTarget.src = DEFAULT_PROFILE_PLACEHOLDER;
                                    }}
                                />
                            </div>
                            <div className="profile-info">
                                <h1>{profile.first_name} {profile.last_name}</h1>
                                <p className="profile-username">@{profile.username}</p>
                            </div>
                        </div>

                        <div className="profile-actions">
                            <button className="action-button share">
                                <span>📤</span>
                                Share Profile
                            </button>
                            <button className="action-button message">
                                <span>💬</span>
                                Send Message
                            </button>
                            <button className="action-button block">
                                <span>🚫</span>
                                Block User
                            </button>
                        </div>

                        <div className="profile-details">
                            <div className="detail-section">
                                <h3>Contact Information</h3>
                                <div className="detail-item">
                                    <span className="detail-label">Username</span>
                                    <span className="detail-value">@{profile.username}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Full Name</span>
                                    <span className="detail-value">{profile.first_name} {profile.last_name}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Status</span>
                                    <span className="detail-value">Active</span>
                                </div>
                            </div>

                            <div className="detail-section">
                                <h3>Shared Content</h3>
                                <div className="shared-content">
                                    <div className="content-item">
                                        <span className="content-icon">📸</span>
                                        <span className="content-text">No shared photos</span>
                                    </div>
                                    <div className="content-item">
                                        <span className="content-icon">📁</span>
                                        <span className="content-text">No shared pockets</span>
                                    </div>
                                    <div className="content-item">
                                        <span className="content-icon">📅</span>
                                        <span className="content-text">No shared events</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ProfileView;

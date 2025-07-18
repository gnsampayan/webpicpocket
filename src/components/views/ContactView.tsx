import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ContactView.css';
import NavBar from '../ui/NavBar';
import { useContacts, getContactAvatar } from '../../hooks/useContacts';
import * as ApiTypes from '../../types/api';

interface ProfileUser extends ApiTypes.UserProfile {
    profile_picture_url: string;
}

const ContactView: React.FC = () => {
    const { username } = useParams<{ username: string }>();
    const navigate = useNavigate();

    const [profile, setProfile] = useState<ProfileUser | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showProfileModal, setShowProfileModal] = useState(false);

    // Use React Query hook to get contacts data
    const { data: contactsData, isLoading } = useContacts();

    // Process contacts data when it changes
    useEffect(() => {
        if (!username) {
            setError('No username provided');
            return;
        }

        if (!contactsData) {
            return; // Still loading
        }

        try {
            console.log('🔍 [ProfileView] Looking for user in contacts:', username);

            // Get all contacts (including requests)
            const allContacts = [
                ...(contactsData.contacts || []),
                ...(contactsData.contact_requests_received || []),
                ...(contactsData.contact_requests_sent || [])
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
            setError(null);
            console.log('✅ [ProfileView] Profile loaded successfully:', profileData);
        } catch (err) {
            console.error('❌ [ProfileView] Error processing profile:', err);
            setError(err instanceof Error ? err.message : 'Failed to load profile');
            setProfile(null);
        }
    }, [username, contactsData]);

    const getProfilePictureUrl = (profile: ProfileUser): string => {
        return getContactAvatar(profile as ApiTypes.ContactUser);
    };

    const getFullSizeProfilePictureUrl = (profile: ProfileUser): string => {
        return getContactAvatar(profile as ApiTypes.ContactUser, 'large');
    };

    const handleBackToContacts = () => {
        navigate('/contacts');
    };

    // Show loading state
    if (isLoading) {
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
                                    onClick={() => setShowProfileModal(true)}
                                    style={{ cursor: 'pointer' }}
                                    onError={(e) => {
                                        e.currentTarget.src = getContactAvatar(profile as ApiTypes.ContactUser);
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

            {/* Profile Picture Modal */}
            {showProfileModal && profile && (
                <div className="profile-modal-overlay" onClick={() => setShowProfileModal(false)}>
                    <div className="profile-modal-content" onClick={(e) => e.stopPropagation()}>
                        <button
                            className="profile-modal-close"
                            onClick={() => setShowProfileModal(false)}
                        >
                            ✕
                        </button>
                        {profile.profile_picture_default ? (
                            <div className="profile-modal-empty-state">
                                <div className="empty-state-icon">👤</div>
                                <h3>No Profile Picture</h3>
                                <p>{profile.first_name} {profile.last_name} hasn't uploaded a profile picture yet.</p>
                            </div>
                        ) : (
                            <img
                                src={getFullSizeProfilePictureUrl(profile)}
                                alt={`${profile.first_name} ${profile.last_name}`}
                                className="profile-modal-image"
                                onError={(e) => {
                                    e.currentTarget.src = getContactAvatar(profile as ApiTypes.ContactUser);
                                }}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContactView;

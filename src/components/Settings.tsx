import React, { useState, useEffect } from 'react';
import NavBar from './NavBar';
import UserAvatar from './UserAvatar';
import { api } from '../services/api';
import { getUserData, setStorageItem, getCurrentUserStorageKeys } from '../utils/storage';
import { useEmailVerification } from '../context/EmailVerificationContext';
import type { UserInfo } from '../types/api';
import './Settings.css';

const Settings: React.FC = () => {
    const [activeTab, setActiveTab] = useState('profile');
    const [notifications, setNotifications] = useState({
        email: true,
        push: true,
        sms: false
    });
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const { showEmailVerification, setEmailVerifiedCallback } = useEmailVerification();
    const [profileForm, setProfileForm] = useState({
        first_name: '',
        last_name: '',
        email: '',
        old_password: '',
        new_password: ''
    });

    // Load user data on component mount
    useEffect(() => {
        const loadUserData = async () => {
            try {
                setLoading(true);
                setError(null);
                const userData = await getUserData();

                if (!userData) {
                    throw new Error('No user data found');
                }

                setUserInfo(userData as UserInfo);
                setProfileForm({
                    first_name: userData.first_name || '',
                    last_name: userData.last_name || '',
                    email: '', // We'll need to get email from a separate API call
                    old_password: '',
                    new_password: ''
                });
            } catch (err) {
                console.error('❌ [Settings] Failed to load user data:', err);
                // Don't set error here since ProtectedRoute will handle the redirect
                // Just log the error for debugging
            } finally {
                setLoading(false);
            }
        };

        loadUserData();
    }, []);



    // Handle file upload for profile picture
    const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);
            setError(null);

            console.log('🔍 [Settings] Starting profile picture upload:', {
                fileName: file.name,
                fileSize: `${(file.size / (1024 * 1024)).toFixed(2)}MB`,
                fileType: file.type
            });

            // Use the existing uploadProfilePicture function
            const updatedUserInfo = await api.uploadProfilePicture(file);
            console.log('✅ [Settings] Profile picture uploaded successfully:', updatedUserInfo);

            // Update the user info with the new data
            setUserInfo(updatedUserInfo);

            // Update localStorage to keep it in sync
            const userKeys = await getCurrentUserStorageKeys();
            await setStorageItem(userKeys.USER_DATA, JSON.stringify(updatedUserInfo));

            console.log('✅ Profile picture updated successfully');
        } catch (err) {
            console.error('❌ [Settings] Failed to upload profile picture:', err);
            setError(err instanceof Error ? err.message : 'Failed to upload profile picture');
        } finally {
            setUploading(false);
        }
    };

    // Handle profile picture deletion
    const handleDeleteProfilePicture = async () => {
        try {
            setDeleting(true);
            setError(null);

            await api.deleteProfilePicture();

            // Update the user info to reflect the deletion
            if (userInfo) {
                const updatedUserInfo = {
                    ...userInfo,
                    profile_picture_default: true,
                    profile_picture: {}
                };
                setUserInfo(updatedUserInfo);

                // Update localStorage to keep it in sync
                const userKeys = await getCurrentUserStorageKeys();
                await setStorageItem(userKeys.USER_DATA, JSON.stringify(updatedUserInfo));
            }

            console.log('✅ Profile picture deleted successfully');
        } catch (err) {
            console.error('❌ [Settings] Failed to delete profile picture:', err);
            setError(err instanceof Error ? err.message : 'Failed to delete profile picture');
        } finally {
            setDeleting(false);
        }
    };

    // Handle profile form submission
    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setError(null);

            const updateData: any = {};
            if (profileForm.first_name) updateData.first_name = profileForm.first_name;
            if (profileForm.last_name) updateData.last_name = profileForm.last_name;
            if (profileForm.email) updateData.email = profileForm.email;
            if (profileForm.old_password && profileForm.new_password) {
                updateData.old_password = profileForm.old_password;
                updateData.new_password = profileForm.new_password;
            }

            await api.updateProfile(updateData);

            // Refresh user data
            const userData = await getUserData();
            if (userData) {
                setUserInfo(userData as UserInfo);
            }

            console.log('✅ Profile updated successfully');
        } catch (err) {
            console.error('❌ [Settings] Failed to update profile:', err);
            setError(err instanceof Error ? err.message : 'Failed to update profile');
        }
    };

    if (loading) {
        return (
            <div className="settings-page">
                <NavBar />
                <main className="main-content">
                    <div className="loading-state">
                        <div className="loading-spinner"></div>
                        <p>Loading settings...</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="settings-page">
            <NavBar />

            {/* Main Content */}
            <main className="main-content">
                {/* Header */}
                <header className="settings-header">
                    <div className="header-left">
                        <h1>Settings</h1>
                        <p>Manage your account preferences and security</p>
                    </div>
                    <div className="user-menu">
                        <UserAvatar size="medium" userInfo={userInfo} />
                    </div>
                </header>

                {/* Error Display */}
                {error && (
                    <div className="error-message">
                        <span>❌ {error}</span>
                        <button onClick={() => setError(null)}>✕</button>
                    </div>
                )}

                {/* Settings Content */}
                <div className="settings-container">
                    {/* Settings Navigation */}
                    <nav className="settings-nav">
                        <button
                            className={`settings-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
                            onClick={() => setActiveTab('profile')}
                        >
                            <span className="nav-icon">👤</span>
                            Profile
                        </button>
                        <button
                            className={`settings-nav-item ${activeTab === 'security' ? 'active' : ''}`}
                            onClick={() => setActiveTab('security')}
                        >
                            <span className="nav-icon">🔒</span>
                            Security
                        </button>
                        <button
                            className={`settings-nav-item ${activeTab === 'notifications' ? 'active' : ''}`}
                            onClick={() => setActiveTab('notifications')}
                        >
                            <span className="nav-icon">🔔</span>
                            Notifications
                        </button>
                        <button
                            className={`settings-nav-item ${activeTab === 'privacy' ? 'active' : ''}`}
                            onClick={() => setActiveTab('privacy')}
                        >
                            <span className="nav-icon">🛡️</span>
                            Privacy
                        </button>
                        <button
                            className={`settings-nav-item ${activeTab === 'billing' ? 'active' : ''}`}
                            onClick={() => setActiveTab('billing')}
                        >
                            <span className="nav-icon">💳</span>
                            Billing
                        </button>
                    </nav>

                    {/* Settings Content */}
                    <div className="settings-content">
                        {activeTab === 'profile' && (
                            <div className="settings-section">
                                <h2>Profile Settings</h2>
                                <div className="profile-form">
                                    <div className="avatar-section">
                                        <UserAvatar size="large" userInfo={userInfo} />
                                        <div className="avatar-actions">
                                            <label className="change-avatar-btn">
                                                {uploading ? 'Uploading...' : 'Change Photo'}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleProfilePictureUpload}
                                                    style={{ display: 'none' }}
                                                    disabled={uploading}
                                                />
                                            </label>
                                            {userInfo && !userInfo.profile_picture_default && (
                                                <button
                                                    className="delete-avatar-btn"
                                                    onClick={handleDeleteProfilePicture}
                                                    disabled={deleting}
                                                >
                                                    {deleting ? 'Deleting...' : 'Delete Photo'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <form onSubmit={handleProfileSubmit}>
                                        <div className="form-group">
                                            <label>First Name</label>
                                            <input
                                                type="text"
                                                value={profileForm.first_name}
                                                onChange={(e) => setProfileForm(prev => ({ ...prev, first_name: e.target.value }))}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Last Name</label>
                                            <input
                                                type="text"
                                                value={profileForm.last_name}
                                                onChange={(e) => setProfileForm(prev => ({ ...prev, last_name: e.target.value }))}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Email</label>
                                            <input
                                                type="email"
                                                value={profileForm.email}
                                                onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                                                placeholder="Enter new email"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Current Password</label>
                                            <input
                                                type="password"
                                                value={profileForm.old_password}
                                                onChange={(e) => setProfileForm(prev => ({ ...prev, old_password: e.target.value }))}
                                                placeholder="Enter current password"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>New Password</label>
                                            <input
                                                type="password"
                                                value={profileForm.new_password}
                                                onChange={(e) => setProfileForm(prev => ({ ...prev, new_password: e.target.value }))}
                                                placeholder="Enter new password"
                                            />
                                        </div>
                                        <button type="submit" className="save-button">Save Changes</button>
                                    </form>
                                </div>
                            </div>
                        )}

                        {activeTab === 'security' && (
                            <div className="settings-section">
                                <h2>Security Settings</h2>
                                <div className="security-options">
                                    <div className="security-item">
                                        <div className="security-info">
                                            <h3>Change Password</h3>
                                            <p>Update your account password</p>
                                        </div>
                                        <button className="security-button">Change</button>
                                    </div>
                                    <div className="security-item">
                                        <div className="security-info">
                                            <h3>Two-Factor Authentication</h3>
                                            <p>Add an extra layer of security</p>
                                        </div>
                                        <button className="security-button">Enable</button>
                                    </div>
                                    <div className="security-item">
                                        <div className="security-info">
                                            <h3>Login Sessions</h3>
                                            <p>Manage active sessions</p>
                                        </div>
                                        <button className="security-button">View</button>
                                    </div>
                                    <div className="security-item">
                                        <div className="security-info">
                                            <h3>Email Verification</h3>
                                            <p>Verify your email address</p>
                                        </div>
                                        <button
                                            className="security-button"
                                            onClick={() => {
                                                setEmailVerifiedCallback(() => () => {
                                                    window.location.reload();
                                                });
                                                showEmailVerification();
                                            }}
                                        >
                                            Verify
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'notifications' && (
                            <div className="settings-section">
                                <h2>Notification Preferences</h2>
                                <div className="notification-options">
                                    <div className="notification-item">
                                        <div className="notification-info">
                                            <h3>Email Notifications</h3>
                                            <p>Receive updates via email</p>
                                        </div>
                                        <label className="toggle-switch">
                                            <input
                                                type="checkbox"
                                                checked={notifications.email}
                                                onChange={(e) => setNotifications(prev => ({ ...prev, email: e.target.checked }))}
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                    <div className="notification-item">
                                        <div className="notification-info">
                                            <h3>Push Notifications</h3>
                                            <p>Receive push notifications on mobile</p>
                                        </div>
                                        <label className="toggle-switch">
                                            <input
                                                type="checkbox"
                                                checked={notifications.push}
                                                onChange={(e) => setNotifications(prev => ({ ...prev, push: e.target.checked }))}
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                    <div className="notification-item">
                                        <div className="notification-info">
                                            <h3>SMS Notifications</h3>
                                            <p>Receive updates via SMS</p>
                                        </div>
                                        <label className="toggle-switch">
                                            <input
                                                type="checkbox"
                                                checked={notifications.sms}
                                                onChange={(e) => setNotifications(prev => ({ ...prev, sms: e.target.checked }))}
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'privacy' && (
                            <div className="settings-section">
                                <h2>Privacy Settings</h2>
                                <div className="privacy-options">
                                    <div className="privacy-item">
                                        <div className="privacy-info">
                                            <h3>Profile Visibility</h3>
                                            <p>Control who can see your profile</p>
                                        </div>
                                        <select className="privacy-select">
                                            <option>Public</option>
                                            <option>Friends Only</option>
                                            <option>Private</option>
                                        </select>
                                    </div>
                                    <div className="privacy-item">
                                        <div className="privacy-info">
                                            <h3>Photo Sharing</h3>
                                            <p>Default privacy for new photos</p>
                                        </div>
                                        <select className="privacy-select">
                                            <option>Public</option>
                                            <option>Friends Only</option>
                                            <option>Private</option>
                                        </select>
                                    </div>
                                    <div className="privacy-item">
                                        <div className="privacy-info">
                                            <h3>Location Sharing</h3>
                                            <p>Share location with photos</p>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'billing' && (
                            <div className="settings-section">
                                <h2>Billing & Subscription</h2>
                                <div className="billing-info">
                                    <div className="plan-card">
                                        <h3>Current Plan</h3>
                                        <div className="plan-details">
                                            <h4>Pro Plan</h4>
                                            <p>$9.99/month</p>
                                            <ul>
                                                <li>Unlimited storage</li>
                                                <li>Advanced sharing</li>
                                                <li>Priority support</li>
                                            </ul>
                                        </div>
                                        <button className="upgrade-button">Upgrade Plan</button>
                                    </div>
                                    <div className="billing-actions">
                                        <button className="billing-button">View Billing History</button>
                                        <button className="billing-button">Update Payment Method</button>
                                        <button className="billing-button danger">Cancel Subscription</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Settings; 
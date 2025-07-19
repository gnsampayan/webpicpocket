import React, { useState, useEffect } from 'react';
import NavBar from '../ui/NavBar';
import UserAvatar from '../ui/UserAvatar';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../services/api';
import { getUserData, setStorageItem, getCurrentUserStorageKeys } from '../../utils/storage';
import { useEmailVerification } from '../../context/EmailVerificationContext';
import type { UserInfo } from '../../types/api';
import './Settings.css';

const Settings: React.FC = () => {
    const [activeTab, setActiveTab] = useState('profile');
    const { theme, setTheme } = useTheme();
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
    const [showProfileModal, setShowProfileModal] = useState(false);
    const { showEmailVerification, setEmailVerifiedCallback } = useEmailVerification();
    const [profileForm, setProfileForm] = useState({
        first_name: '',
        last_name: ''
    });

    const [passwordForm, setPasswordForm] = useState({
        new_password: '',
        confirm_new_password: ''
    });

    const [emailForm, setEmailForm] = useState({
        new_email: '',
        confirm_new_email: ''
    });

    // Collapsible state
    const [isPasswordExpanded, setIsPasswordExpanded] = useState(false);
    const [isEmailExpanded, setIsEmailExpanded] = useState(false);

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
                    last_name: userData.last_name || ''
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

    // Handle password change submission
    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setError(null);

            // Validate password confirmation
            if (passwordForm.new_password !== passwordForm.confirm_new_password) {
                setError('New passwords do not match');
                return;
            }

            await api.updateProfile({
                new_password: passwordForm.new_password
            });

            // Clear password form
            setPasswordForm({
                new_password: '',
                confirm_new_password: ''
            });

            console.log('✅ Password updated successfully');
        } catch (err) {
            console.error('❌ [Settings] Failed to update password:', err);
            setError(err instanceof Error ? err.message : 'Failed to update password');
        }
    };

    // Handle email change submission
    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setError(null);

            // Validate email confirmation
            if (emailForm.new_email !== emailForm.confirm_new_email) {
                setError('New emails do not match');
                return;
            }

            await api.updateProfile({
                email: emailForm.new_email
            });

            // Clear email form
            setEmailForm({
                new_email: '',
                confirm_new_email: ''
            });

            console.log('✅ Email updated successfully');
        } catch (err) {
            console.error('❌ [Settings] Failed to update email:', err);
            setError(err instanceof Error ? err.message : 'Failed to update email');
        }
    };

    // Handle profile picture modal
    const handleAvatarClick = () => {
        setShowProfileModal(true);
    };

    const handleCloseModal = () => {
        setShowProfileModal(false);
    };

    // Get profile picture URL from user info
    const getProfilePictureUrl = () => {
        if (!userInfo?.profile_picture || userInfo.profile_picture_default) {
            return null;
        }

        // Use the best available URL from user data
        return userInfo.profile_picture.url_large ||
            userInfo.profile_picture.url_medium ||
            userInfo.profile_picture.url_small;
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
                        <UserAvatar size="medium" userInfo={userInfo} clickable={true} />
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
                            className={`settings-nav-item ${activeTab === 'appearance' ? 'active' : ''}`}
                            onClick={() => setActiveTab('appearance')}
                        >
                            <span className="nav-icon">🎨</span>
                            Appearance
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
                                        <div
                                            className="clickable-avatar-wrapper"
                                            onClick={handleAvatarClick}
                                            style={{ cursor: 'pointer' }}
                                            title="Click to view enlarged profile picture"
                                        >
                                            <UserAvatar
                                                size="large"
                                                userInfo={userInfo}
                                            />
                                        </div>
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
                                        <button type="submit" className="save-button">Save Changes</button>
                                    </form>
                                </div>
                            </div>
                        )}

                        {activeTab === 'security' && (
                            <div className="settings-section">
                                <h2>Security Settings</h2>

                                {/* Change Password Section */}
                                <div className="security-form-section">
                                    <div className="security-form-header" onClick={() => setIsPasswordExpanded(!isPasswordExpanded)}>
                                        <h3>Change Password</h3>
                                        <button className="expand-toggle">
                                            {isPasswordExpanded ? '−' : '+'}
                                        </button>
                                    </div>
                                    {isPasswordExpanded && (
                                        <form onSubmit={handlePasswordSubmit} className="security-form">
                                            <div className="form-group">
                                                <label>New Password</label>
                                                <input
                                                    type="password"
                                                    value={passwordForm.new_password}
                                                    onChange={(e) => setPasswordForm(prev => ({ ...prev, new_password: e.target.value }))}
                                                    placeholder="Enter new password"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Confirm New Password</label>
                                                <input
                                                    type="password"
                                                    value={passwordForm.confirm_new_password}
                                                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm_new_password: e.target.value }))}
                                                    placeholder="Confirm new password"
                                                />
                                            </div>
                                            <button type="submit" className="save-button">Update Password</button>
                                        </form>
                                    )}
                                </div>

                                {/* Change Email Section */}
                                <div className="security-form-section">
                                    <div className="security-form-header" onClick={() => setIsEmailExpanded(!isEmailExpanded)}>
                                        <h3>Change Email</h3>
                                        <button className="expand-toggle">
                                            {isEmailExpanded ? '−' : '+'}
                                        </button>
                                    </div>
                                    {isEmailExpanded && (
                                        <form onSubmit={handleEmailSubmit} className="security-form">
                                            <div className="form-group">
                                                <label>New Email</label>
                                                <input
                                                    type="email"
                                                    value={emailForm.new_email}
                                                    onChange={(e) => setEmailForm(prev => ({ ...prev, new_email: e.target.value }))}
                                                    placeholder="Enter new email"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Confirm New Email</label>
                                                <input
                                                    type="email"
                                                    value={emailForm.confirm_new_email}
                                                    onChange={(e) => setEmailForm(prev => ({ ...prev, confirm_new_email: e.target.value }))}
                                                    placeholder="Confirm new email"
                                                />
                                            </div>
                                            <button type="submit" className="save-button">Update Email</button>
                                        </form>
                                    )}
                                </div>

                                {/* Other Security Options */}
                                <div className="security-options">
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
                                        {userInfo?.verified ? (
                                            <div className="verified-indicator">
                                                <span className="verified-icon">✓</span>
                                                <span>Verified</span>
                                            </div>
                                        ) : (
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
                                        )}
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

                        {activeTab === 'appearance' && (
                            <div className="settings-section">
                                <h2>Appearance & Theme</h2>
                                <div className="appearance-options">
                                    <div className="appearance-item">
                                        <div className="appearance-info">
                                            <h3>Theme</h3>
                                            <p>Choose between light and dark mode, or let the system decide</p>
                                        </div>
                                        <div className="theme-controls">
                                            <div className="theme-selector">
                                                <div className="theme-options">
                                                    <label className="theme-option">
                                                        <input
                                                            type="radio"
                                                            name="theme"
                                                            value="light"
                                                            checked={theme === 'light'}
                                                            onChange={() => setTheme('light')}
                                                        />
                                                        <span className="theme-option-content">
                                                            <span className="theme-preview light-preview">☀️</span>
                                                            <span className="theme-label">Light</span>
                                                        </span>
                                                    </label>
                                                    <label className="theme-option">
                                                        <input
                                                            type="radio"
                                                            name="theme"
                                                            value="dark"
                                                            checked={theme === 'dark'}
                                                            onChange={() => setTheme('dark')}
                                                        />
                                                        <span className="theme-option-content">
                                                            <span className="theme-preview dark-preview">🌙</span>
                                                            <span className="theme-label">Dark</span>
                                                        </span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="appearance-note">
                                        <p><strong>Note:</strong> Your theme preference is automatically saved and will be remembered across sessions. The dark mode toggle is also available in the sidebar for quick access.</p>
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

            {/* Profile Picture Modal */}
            {showProfileModal && userInfo && (
                <div className="profile-modal-overlay" onClick={handleCloseModal}>
                    <div className="profile-modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="profile-modal-close" onClick={handleCloseModal}>
                            ×
                        </button>
                        {userInfo.profile_picture_default || !getProfilePictureUrl() ? (
                            <div className="profile-modal-empty-state">
                                <div className="empty-state-icon">👤</div>
                                <h3>No Profile Picture</h3>
                                <p>You are using the default profile picture.</p>
                            </div>
                        ) : (
                            <img
                                src={`https://${getProfilePictureUrl()}`}
                                alt={`${userInfo.first_name} ${userInfo.last_name}`}
                                className="profile-modal-image"
                                onError={(e) => {
                                    // If the image fails to load in modal, show empty state
                                    const modal = e.currentTarget.parentElement;
                                    if (modal) {
                                        modal.innerHTML = `
                                            <button class="profile-modal-close">×</button>
                                            <div class="profile-modal-empty-state">
                                                <div class="empty-state-icon">👤</div>
                                                <h3>Image Not Available</h3>
                                                <p>Failed to load profile picture.</p>
                                            </div>
                                        `;
                                        const closeBtn = modal.querySelector('.profile-modal-close');
                                        if (closeBtn) {
                                            closeBtn.addEventListener('click', handleCloseModal);
                                        }
                                    }
                                }}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings; 
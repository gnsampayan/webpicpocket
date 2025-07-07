import React, { useState } from 'react';
import NavBar from './NavBar';
import './Settings.css';

const Settings: React.FC = () => {
    const [activeTab, setActiveTab] = useState('profile');
    const [notifications, setNotifications] = useState({
        email: true,
        push: true,
        sms: false
    });

    const userProfile = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        avatar: 'https://picsum.photos/100/100?random=1',
        phone: '+1 (555) 123-4567',
        location: 'San Francisco, CA'
    };

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
                        <img src="https://picsum.photos/40/40?random=1" alt="User" className="user-avatar" />
                    </div>
                </header>

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
                                        <img src={userProfile.avatar} alt="Profile" className="profile-avatar" />
                                        <button className="change-avatar-btn">Change Photo</button>
                                    </div>
                                    <div className="form-group">
                                        <label>Full Name</label>
                                        <input type="text" defaultValue={userProfile.name} />
                                    </div>
                                    <div className="form-group">
                                        <label>Email</label>
                                        <input type="email" defaultValue={userProfile.email} />
                                    </div>
                                    <div className="form-group">
                                        <label>Phone</label>
                                        <input type="tel" defaultValue={userProfile.phone} />
                                    </div>
                                    <div className="form-group">
                                        <label>Location</label>
                                        <input type="text" defaultValue={userProfile.location} />
                                    </div>
                                    <button className="save-button">Save Changes</button>
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
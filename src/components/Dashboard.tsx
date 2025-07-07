import React, { useState } from 'react';
import NavBar from './NavBar';
import './Dashboard.css';

const Dashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState('overview');

    const stats = [
        { label: 'Total Photos', value: '1,247', change: '+12%', icon: '📸' },
        { label: 'Shared Albums', value: '23', change: '+5%', icon: '📁' },
        { label: 'Storage Used', value: '2.4 GB', change: '+8%', icon: '💾' },
        { label: 'Active Contacts', value: '156', change: '+3%', icon: '👥' }
    ];

    const recentActivity = [
        { type: 'upload', message: 'Uploaded 5 photos to "Vacation 2024"', time: '2 hours ago', icon: '📤' },
        { type: 'share', message: 'Shared album with Sarah Johnson', time: '4 hours ago', icon: '📤' },
        { type: 'download', message: 'Downloaded 12 photos from "Family Reunion"', time: '1 day ago', icon: '📥' },
        { type: 'comment', message: 'Added comment to photo in "Birthday Party"', time: '2 days ago', icon: '💬' }
    ];

    const recentPhotos = Array.from({ length: 12 }, (_, i) => ({
        id: i + 1,
        url: `https://picsum.photos/300/300?random=${i + 1}`,
        title: `Photo ${i + 1}`,
        date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
    }));

    return (
        <div className="dashboard">
            <NavBar />

            {/* Main Content */}
            <main className="main-content">
                {/* Header */}
                <header className="dashboard-header">
                    <div className="header-left">
                        <h1>Dashboard</h1>
                        <p>Welcome back! Here's what's happening with your photos.</p>
                    </div>
                    <div className="header-right">
                        <button className="upload-button">
                            <span>📤</span>
                            Upload Photos
                        </button>
                        <div className="user-menu">
                            <img src="https://picsum.photos/40/40?random=1" alt="User" className="user-avatar" />
                        </div>
                    </div>
                </header>

                {/* Stats Grid */}
                <section className="stats-section">
                    <div className="stats-grid">
                        {stats.map((stat, index) => (
                            <div key={index} className="stat-card">
                                <div className="stat-icon">{stat.icon}</div>
                                <div className="stat-content">
                                    <h3 className="stat-value">{stat.value}</h3>
                                    <p className="stat-label">{stat.label}</p>
                                    <span className="stat-change positive">{stat.change}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Content Tabs */}
                <section className="content-section">
                    <div className="tab-navigation">
                        <button
                            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
                            onClick={() => setActiveTab('overview')}
                        >
                            Overview
                        </button>
                        <button
                            className={`tab-button ${activeTab === 'recent' ? 'active' : ''}`}
                            onClick={() => setActiveTab('recent')}
                        >
                            Recent Activity
                        </button>
                        <button
                            className={`tab-button ${activeTab === 'photos' ? 'active' : ''}`}
                            onClick={() => setActiveTab('photos')}
                        >
                            Recent Photos
                        </button>
                    </div>

                    <div className="tab-content">
                        {activeTab === 'overview' && (
                            <div className="overview-content">
                                <div className="overview-grid">
                                    <div className="overview-card">
                                        <h3>Quick Actions</h3>
                                        <div className="quick-actions">
                                            <button className="quick-action">
                                                <span>📤</span>
                                                Upload Photos
                                            </button>
                                            <button className="quick-action">
                                                <span>📁</span>
                                                Create Album
                                            </button>
                                            <button className="quick-action">
                                                <span>👥</span>
                                                Share with Friends
                                            </button>
                                            <button className="quick-action">
                                                <span>🔍</span>
                                                Search Photos
                                            </button>
                                        </div>
                                    </div>
                                    <div className="overview-card">
                                        <h3>Storage Overview</h3>
                                        <div className="storage-info">
                                            <div className="storage-bar">
                                                <div className="storage-fill" style={{ width: '65%' }}></div>
                                            </div>
                                            <p>2.4 GB of 5 GB used</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'recent' && (
                            <div className="recent-content">
                                <div className="activity-list">
                                    {recentActivity.map((activity, index) => (
                                        <div key={index} className="activity-item">
                                            <div className="activity-icon">{activity.icon}</div>
                                            <div className="activity-content">
                                                <p className="activity-message">{activity.message}</p>
                                                <span className="activity-time">{activity.time}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'photos' && (
                            <div className="photos-content">
                                <div className="photos-grid">
                                    {recentPhotos.map((photo) => (
                                        <div key={photo.id} className="photo-card">
                                            <img src={photo.url} alt={photo.title} className="photo-thumbnail" />
                                            <div className="photo-info">
                                                <h4>{photo.title}</h4>
                                                <p>{photo.date}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
};

export default Dashboard; 
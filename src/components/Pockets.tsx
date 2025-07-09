import React, { useState, useEffect } from 'react';
import './Pockets.css';
import NavBar from './NavBar';
import { api } from '../services/api';
import { type Pocket } from '../types';

const Pockets: React.FC = () => {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [filter, setFilter] = useState('all');
    const [pockets, setPockets] = useState<Pocket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Default placeholder image as data URI for better reliability
    const DEFAULT_COVER_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjNjY3ZWVhIi8+CjxyZWN0IHg9IjQwIiB5PSI0MCIgd2lkdGg9IjEyMCIgaGVpZ2h0PSI3MCIgcng9IjgiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4yIi8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjY1IiByPSIxNSIgZmlsbD0iI2ZmZmZmZiIgZmlsbC1vcGFjaXR5PSIwLjYiLz4KPHBhdGggZD0iTTkwIDc1TDk1IDgwTDEwNSA3MEwxMTUgODBMMTIwIDc1IiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIgc3Ryb2tlLW9wYWNpdHk9IjAuNiIvPgo8dGV4dCB4PSIxMDAiIHk9IjEzMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmaWxsPSIjZmZmZmZmIiBmaWxsLW9wYWNpdHk9IjAuOCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Tm8gQ292ZXIgUGhvdG88L3RleHQ+Cjwvc3ZnPgo=';

    // Fetch pockets from API
    useEffect(() => {
        const fetchPockets = async () => {
            try {
                setLoading(true);
                setError(null);
                const pocketsData = await api.getPockets();
                setPockets(pocketsData);
            } catch (err) {
                console.error('Error fetching pockets:', err);
                setError(err instanceof Error ? err.message : 'Failed to load pockets');
            } finally {
                setLoading(false);
            }
        };

        fetchPockets();
    }, []);

    // Helper function to get the best available cover photo URL
    const getCoverPhotoUrl = (pocket: Pocket): string => {
        // Prioritize medium size first
        if (pocket.cover_photo?.url_medium) {
            return pocket.cover_photo.url_medium;
        }

        // Fall back to large size
        if (pocket.cover_photo?.url_large) {
            return pocket.cover_photo.url_large;
        }

        // Fall back to small size
        if (pocket.cover_photo?.url_small) {
            return pocket.cover_photo.url_small;
        }

        // Default placeholder - using a data URI for better reliability
        return DEFAULT_COVER_PLACEHOLDER;
    };

    // Mock photos for now (since we don't have a photos API endpoint yet)
    const photos = Array.from({ length: 24 }, (_, i) => ({
        id: i + 1,
        url: `https://picsum.photos/400/400?random=${i + 1}`,
        title: `Photo ${i + 1}`,
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        size: Math.floor(Math.random() * 5000) + 1000 + ' KB',
        album: pockets[Math.floor(Math.random() * pockets.length)]?.pocket_title || 'Unknown Album'
    }));

    if (loading) {
        return (
            <div className="media-page">
                <NavBar />
                <main className="main-content">
                    <div className="loading-state">
                        <div className="loading-spinner"></div>
                        <p>Loading pockets...</p>
                    </div>
                </main>
            </div>
        );
    }

    if (error) {
        return (
            <div className="media-page">
                <NavBar />
                <main className="main-content">
                    <div className="error-state">
                        <h2>Error Loading Pockets</h2>
                        <p>{error}</p>
                        <button onClick={() => window.location.reload()} className="retry-button">
                            Try Again
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="media-page">
            <NavBar />

            {/* Main Content */}
            <main className="main-content">
                {/* Header */}
                <header className="media-header">
                    <div className="header-left">
                        <h1>Pockets</h1>
                        <p>Manage and organize your photos, videos, pockets, events, and members</p>
                    </div>
                    <div className="header-right">
                        <button className="upload-button">
                            <span>📤</span>
                            Upload Media
                        </button>
                        <div className="user-menu">
                            <img src="https://picsum.photos/40/40?random=1" alt="User" className="user-avatar" />
                        </div>
                    </div>
                </header>

                {/* Controls */}
                <section className="controls-section">
                    <div className="controls-left">
                        <div className="view-toggle">
                            <button
                                className={`view-button ${viewMode === 'grid' ? 'active' : ''}`}
                                onClick={() => setViewMode('grid')}
                            >
                                <span>⊞</span>
                            </button>
                            <button
                                className={`view-button ${viewMode === 'list' ? 'active' : ''}`}
                                onClick={() => setViewMode('list')}
                            >
                                <span>☰</span>
                            </button>
                        </div>
                        <div className="filter-dropdown">
                            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                                <option value="all">All Media</option>
                                <option value="photos">Photos Only</option>
                                <option value="videos">Videos Only</option>
                                <option value="recent">Recent</option>
                            </select>
                        </div>
                    </div>
                    <div className="controls-right">
                        <div className="search-box">
                            <input type="text" placeholder="Search media..." />
                            <span>🔍</span>
                        </div>
                    </div>
                </section>

                {/* Pockets Section */}
                <section className="albums-section">
                    <h2>Your Pockets ({pockets.length})</h2>
                    {pockets.length === 0 ? (
                        <div className="empty-state">
                            <p>No pockets found. Create your first pocket to get started!</p>
                            <button className="create-pocket-button">
                                <span>➕</span>
                                Create Pocket
                            </button>
                        </div>
                    ) : (
                        <div className="albums-grid">
                            {pockets.map((pocket) => (
                                <div key={pocket.pocket_id} className="album-card">
                                    <img
                                        src={getCoverPhotoUrl(pocket)}
                                        alt={pocket.pocket_title}
                                        className="album-cover"
                                        onError={(e) => {
                                            // Fallback if the cover photo fails to load
                                            e.currentTarget.src = DEFAULT_COVER_PLACEHOLDER;
                                        }}
                                    />
                                    <div className="album-info">
                                        <h3>{pocket.pocket_title}</h3>
                                        <p>{pocket.pocket_members.length} members</p>
                                        <p className="pocket-date">
                                            Created: {new Date(pocket.pocket_created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Media Grid */}
                <section className="media-section">
                    <h2>All Media</h2>
                    <div className={`media-grid ${viewMode}`}>
                        {photos.map((photo) => (
                            <div key={photo.id} className="media-item">
                                <div className="media-thumbnail">
                                    <img src={photo.url} alt={photo.title} />
                                    <div className="media-overlay">
                                        <button className="media-action">👁️</button>
                                        <button className="media-action">📤</button>
                                        <button className="media-action">🗑️</button>
                                    </div>
                                </div>
                                <div className="media-info">
                                    <h4>{photo.title}</h4>
                                    <p>{photo.date}</p>
                                    <p className="media-size">{photo.size}</p>
                                    <span className="media-album">{photo.album}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
};

export default Pockets; 
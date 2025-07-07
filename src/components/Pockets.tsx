import React, { useState } from 'react';
import './Pockets.css';
import NavBar from './NavBar';

const Pockets: React.FC = () => {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [filter, setFilter] = useState('all');

    const photos = Array.from({ length: 24 }, (_, i) => ({
        id: i + 1,
        url: `https://picsum.photos/400/400?random=${i + 1}`,
        title: `Photo ${i + 1}`,
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        size: Math.floor(Math.random() * 5000) + 1000 + ' KB',
        album: ['Vacation 2024', 'Family Reunion', 'Birthday Party', 'Work Event'][Math.floor(Math.random() * 4)]
    }));

    const albums = [
        { name: 'Vacation 2024', count: 45, cover: 'https://picsum.photos/200/200?random=1' },
        { name: 'Family Reunion', count: 23, cover: 'https://picsum.photos/200/200?random=2' },
        { name: 'Birthday Party', count: 67, cover: 'https://picsum.photos/200/200?random=3' },
        { name: 'Work Event', count: 12, cover: 'https://picsum.photos/200/200?random=4' }
    ];

    return (
        <div className="media-page">
            <NavBar />

            {/* Main Content */}
            <main className="main-content">
                {/* Header */}
                <header className="media-header">
                    <div className="header-left">
                        <h1>Media Library</h1>
                        <p>Manage and organize your photos and videos</p>
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

                {/* Albums Section */}
                <section className="albums-section">
                    <h2>Albums</h2>
                    <div className="albums-grid">
                        {albums.map((album, index) => (
                            <div key={index} className="album-card">
                                <img src={album.cover} alt={album.name} className="album-cover" />
                                <div className="album-info">
                                    <h3>{album.name}</h3>
                                    <p>{album.count} items</p>
                                </div>
                            </div>
                        ))}
                    </div>
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
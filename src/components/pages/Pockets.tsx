import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Pockets.css';
import NavBar from '../ui/NavBar';
import UserAvatar from '../ui/UserAvatar';
import CreatePocketModal from '../modals/CreatePocketModal';
import AddPocketPhotosModal from '../modals/AddPocketPhotosModal';
import AddPocketMembersModal from '../modals/AddPocketMembersModal';
import EditPocketModal from '../modals/EditPocketModal';
import { api } from '../../services/api';
import { useEmailVerification } from '../../context/EmailVerificationContext';
import { type Pocket } from '../../types';

const Pockets: React.FC = () => {
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [filter, setFilter] = useState('newest-updated'); // Changed default to newest-updated
    const [pockets, setPockets] = useState<Pocket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [openOptionsMenu, setOpenOptionsMenu] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAddPhotosModal, setShowAddPhotosModal] = useState(false);
    const [showAddMembersModal, setShowAddMembersModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedPocketForPhotos, setSelectedPocketForPhotos] = useState<Pocket | null>(null);
    const [selectedPocketForMembers, setSelectedPocketForMembers] = useState<Pocket | null>(null);
    const [selectedPocketForEdit, setSelectedPocketForEdit] = useState<Pocket | null>(null);
    const { showEmailVerification, setEmailVerifiedCallback } = useEmailVerification();

    // Default placeholder image as data URI for better reliability
    const DEFAULT_COVER_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjNjY3ZWVhIi8+CjxyZWN0IHg9IjQwIiB5PSI0MCIgd2lkdGg9IjEyMCIgaGVpZ2h0PSI3MCIgcng9IjgiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4yIi8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjY1IiByPSIxNSIgZmlsbD0iI2ZmZmZmZiIgZmlsbC1vcGFjaXR5PSIwLjYiLz4KPHBhdGggZD0iTTkwIDc1TDk1IDgwTDEwNSA3MEwxMTUgODBMMTIwIDc1IiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIgc3Ryb2tlLW9wYWNpdHk9IjAuNiIvPgo8dGV4dCB4PSIxMDAiIHk9IjEzMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmaWxsPSIjZmZmZmZmIiBmaWxsLW9wYWNpdHk9IjAuOCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Tm8gQ292ZXIgUGhvdG88L3RleHQ+Cjwvc3ZnPgo=';

    // Helper function to sort pockets based on filter
    const sortPockets = (pocketsToSort: Pocket[], sortFilter: string): Pocket[] => {
        const sorted = [...pocketsToSort];

        switch (sortFilter) {
            case 'newest-updated':
                return sorted.sort((a, b) => new Date(b.pocket_updated_at).getTime() - new Date(a.pocket_updated_at).getTime());
            case 'oldest-updated':
                return sorted.sort((a, b) => new Date(a.pocket_updated_at).getTime() - new Date(b.pocket_updated_at).getTime());
            case 'newest-activity':
                return sorted.sort((a, b) => new Date(b.pocket_last_activity_at).getTime() - new Date(a.pocket_last_activity_at).getTime());
            case 'oldest-activity':
                return sorted.sort((a, b) => new Date(a.pocket_last_activity_at).getTime() - new Date(b.pocket_last_activity_at).getTime());
            case 'newest-created':
                return sorted.sort((a, b) => new Date(b.pocket_created_at).getTime() - new Date(a.pocket_created_at).getTime());
            case 'oldest-created':
                return sorted.sort((a, b) => new Date(a.pocket_created_at).getTime() - new Date(b.pocket_created_at).getTime());
            case 'a-z':
                return sorted.sort((a, b) => a.pocket_title.localeCompare(b.pocket_title));
            case 'z-a':
                return sorted.sort((a, b) => b.pocket_title.localeCompare(a.pocket_title));
            case 'member-high-low':
                return sorted.sort((a, b) => b.pocket_members.length - a.pocket_members.length);
            case 'member-low-high':
                return sorted.sort((a, b) => a.pocket_members.length - b.pocket_members.length);
            default:
                return sorted;
        }
    };

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

    // Helper function to get the best available cover photo URL - similar to React Native implementation
    const getCoverPhotoUrl = (pocket: Pocket): string => {
        // Use the cover_photo_url object from the API response
        // Prioritize large for best quality, then medium, then small
        const rawUrl = pocket.cover_photo_url?.url_large ??
            pocket.cover_photo_url?.url_med ??
            pocket.cover_photo_url?.url_small;

        if (!rawUrl) {
            return DEFAULT_COVER_PLACEHOLDER;
        }

        // URLs are already perfect S3 signed URLs - no decoding needed!
        // If it's already HTTP, return as-is
        if (rawUrl.startsWith("http")) {
            return rawUrl;
        }

        // If it doesn't start with http, add https:// (fallback)
        return `https://${rawUrl}`;
    };

    // Helper function to format date for display
    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

        if (diffInHours < 24) {
            if (diffInHours < 1) {
                const diffInMinutes = Math.floor(diffInHours * 60);
                return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
            }
            return `${Math.floor(diffInHours)} hour${Math.floor(diffInHours) !== 1 ? 's' : ''} ago`;
        } else if (diffInHours < 168) { // 7 days
            const diffInDays = Math.floor(diffInHours / 24);
            return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString();
        }
    };

    // Handle pocket selection
    const handlePocketClick = (pocket: Pocket) => {
        navigate(`/pockets/${pocket.pocket_id}`);
    };

    // Handle options menu toggle
    const handleOptionsClick = (e: React.MouseEvent, pocketId: string) => {
        e.stopPropagation();
        setOpenOptionsMenu(openOptionsMenu === pocketId ? null : pocketId);
    };

    // Handle option selection
    const handleOptionSelect = (option: string, pocket: Pocket) => {
        setOpenOptionsMenu(null);

        switch (option) {
            case 'add-photos':
                setSelectedPocketForPhotos(pocket);
                setShowAddPhotosModal(true);
                break;
            case 'add-people':
                setSelectedPocketForMembers(pocket);
                setShowAddMembersModal(true);
                break;
            case 'share':
                // TODO: Implement share functionality
                console.log('Share functionality not implemented yet');
                break;
            case 'edit':
                setSelectedPocketForEdit(pocket);
                setShowEditModal(true);
                break;
            case 'leave':
                // TODO: Implement leave functionality
                console.log('Leave functionality not implemented yet');
                break;
            default:
                console.log(`Unknown option: ${option}`);
        }
    };

    // Close options menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => {
            setOpenOptionsMenu(null);
        };

        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, []);

    // Handle pocket creation
    const handlePocketCreated = (newPocket: Pocket) => {
        setPockets(prev => [newPocket, ...prev]);
    };

    // Handle media added to pocket
    const handleMediaAdded = () => {
        // Refetch pockets data to show updated photo counts without clearing console
        const fetchPockets = async () => {
            try {
                setLoading(true);
                setError(null);
                const pocketsData = await api.getPockets();
                setPockets(pocketsData);
                console.log('✅ Pockets data refreshed after adding media');
            } catch (err) {
                console.error('Error refreshing pockets after adding media:', err);
                setError(err instanceof Error ? err.message : 'Failed to refresh pockets');
            } finally {
                setLoading(false);
            }
        };

        fetchPockets();
    };

    // Handle members added to pocket
    const handleMembersAdded = () => {
        // Refetch pockets data to show updated member counts without clearing console
        const fetchPockets = async () => {
            try {
                setLoading(true);
                setError(null);
                const pocketsData = await api.getPockets();
                setPockets(pocketsData);
                console.log('✅ Pockets data refreshed after adding members');
            } catch (err) {
                console.error('Error refreshing pockets after adding members:', err);
                setError(err instanceof Error ? err.message : 'Failed to refresh pockets');
            } finally {
                setLoading(false);
            }
        };

        fetchPockets();
    };

    // Handle pocket updated
    const handlePocketUpdated = () => {
        // Refetch pockets data to show updated information
        const fetchPockets = async () => {
            try {
                setLoading(true);
                setError(null);
                const pocketsData = await api.getPockets();
                setPockets(pocketsData);
                console.log('✅ Pockets data refreshed after updating pocket');
            } catch (err) {
                console.error('Error refreshing pockets after update:', err);
                setError(err instanceof Error ? err.message : 'Failed to refresh pockets');
            } finally {
                setLoading(false);
            }
        };

        fetchPockets();
    };

    // Get sorted pockets based on current filter
    const sortedPockets = sortPockets(pockets, filter);

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
                        {error.includes('verify your email') && (
                            <button
                                className="verify-email-button"
                                onClick={() => {
                                    setEmailVerifiedCallback(() => () => {
                                        window.location.reload();
                                    });
                                    showEmailVerification();
                                }}
                            >
                                Verify Email
                            </button>
                        )}
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
                        <button
                            className="upload-button"
                            onClick={() => setShowCreateModal(true)}
                        >
                            <span>+</span>
                            Create Pocket
                        </button>
                        <div className="user-menu">
                            <UserAvatar size="medium" />
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
                                <option value="newest-updated">Most Recently Updated</option>
                                <option value="oldest-updated">Least Recently Updated</option>
                                <option value="newest-activity">Most Recent Activity</option>
                                <option value="oldest-activity">Least Recent Activity</option>
                                <option value="newest-created">Newest Created</option>
                                <option value="oldest-created">Oldest Created</option>
                                <option value="a-z">A-Z</option>
                                <option value="z-a">Z-A</option>
                                <option value="member-high-low">Member Count (High to Low)</option>
                                <option value="member-low-high">Member Count (Low to High)</option>
                            </select>
                        </div>
                    </div>
                    <div className="controls-right">
                        <div className="search-box">
                            <input type="text" placeholder="Search pockets..." />
                            <span>🔍</span>
                        </div>
                    </div>
                </section>

                {/* Pockets Section */}
                <section className="albums-section">
                    <h2>Your Pockets ({sortedPockets.length})</h2>
                    {sortedPockets.length === 0 ? (
                        <div className="empty-state">
                            <p>No pockets found. Create your first pocket to get started!</p>
                            <button
                                className="create-pocket-button"
                                onClick={() => setShowCreateModal(true)}
                            >
                                <span>➕</span>
                                Create Pocket
                            </button>
                        </div>
                    ) : (
                        <div className="albums-grid">
                            {sortedPockets.map((pocket) => (
                                <div
                                    key={pocket.pocket_id}
                                    className="album-card"
                                    onClick={() => handlePocketClick(pocket)}
                                    style={{ cursor: 'pointer' }}
                                >
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
                                        <div className="pocket-dates">
                                            <p className="pocket-updated">
                                                Updated: {formatDate(pocket.pocket_updated_at)}
                                            </p>
                                            <p className="pocket-activity">
                                                Last Activity: {formatDate(pocket.pocket_last_activity_at)}
                                            </p>
                                            <p className="pocket-created">
                                                Created: {formatDate(pocket.pocket_created_at)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Options Button */}
                                    <button
                                        className="pocket-options-button"
                                        onClick={(e) => handleOptionsClick(e, pocket.pocket_id)}
                                    >
                                        ⋯
                                    </button>

                                    {/* Options Menu */}
                                    {openOptionsMenu === pocket.pocket_id && (
                                        <div className="pocket-options-menu">
                                            <div className="options-menu-item" onClick={(e) => {
                                                e.stopPropagation();
                                                handleOptionSelect('add-photos', pocket)
                                            }}>
                                                <span className="option-icon">📸</span>
                                                Add Photos
                                            </div>
                                            <div className="options-menu-item" onClick={(e) => {
                                                e.stopPropagation();
                                                handleOptionSelect('add-people', pocket)
                                            }}>
                                                <span className="option-icon">👥</span>
                                                Add People
                                            </div>
                                            <div className="options-menu-item" onClick={(e) => {
                                                e.stopPropagation();
                                                handleOptionSelect('share', pocket)
                                            }}>
                                                <span className="option-icon">📤</span>
                                                Share
                                            </div>
                                            <div className="options-menu-item" onClick={(e) => {
                                                e.stopPropagation();
                                                handleOptionSelect('edit', pocket)
                                            }}>
                                                <span className="option-icon">✏️</span>
                                                Edit
                                            </div>
                                            <div className="options-menu-item" onClick={(e) => {
                                                e.stopPropagation();
                                                handleOptionSelect('leave', pocket)
                                            }}>
                                                <span className="option-icon">🚪</span>
                                                Leave Pocket
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>

            {/* Create Pocket Modal */}
            <CreatePocketModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onPocketCreated={handlePocketCreated}
            />

            {/* Add Pocket Photos Modal */}
            {selectedPocketForPhotos && (
                <AddPocketPhotosModal
                    isOpen={showAddPhotosModal}
                    onClose={() => {
                        setShowAddPhotosModal(false);
                        setSelectedPocketForPhotos(null);
                    }}
                    onMediaAdded={handleMediaAdded}
                    pocketId={selectedPocketForPhotos.pocket_id}
                    pocketTitle={selectedPocketForPhotos.pocket_title}
                />
            )}

            {/* Add Pocket Members Modal */}
            {selectedPocketForMembers && (
                <AddPocketMembersModal
                    isOpen={showAddMembersModal}
                    onClose={() => {
                        setShowAddMembersModal(false);
                        setSelectedPocketForMembers(null);
                    }}
                    onMembersAdded={handleMembersAdded}
                    pocketId={selectedPocketForMembers.pocket_id}
                    pocketTitle={selectedPocketForMembers.pocket_title}
                    existingMembers={selectedPocketForMembers.pocket_members.map(member => member.id)}
                />
            )}

            {/* Edit Pocket Modal */}
            {selectedPocketForEdit && (
                <EditPocketModal
                    isOpen={showEditModal}
                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedPocketForEdit(null);
                    }}
                    onPocketUpdated={handlePocketUpdated}
                    pocket={selectedPocketForEdit}
                />
            )}
        </div>
    );
};

export default Pockets; 
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Pockets.css';
import NavBar from '../ui/NavBar';
import UserAvatar from '../ui/UserAvatar';
import CreatePocketModal from '../modals/CreatePocketModal';
import AddPocketPhotosModal from '../modals/AddPocketPhotosModal';
import AddPocketMembersModal from '../modals/AddPocketMembersModal';
import EditPocketModal from '../modals/EditPocketModal';
import MembersModal from '../modals/MembersModal';
import { usePockets } from '../../hooks/usePhotos';
import { useEmailVerification } from '../../context/EmailVerificationContext';
import { type Pocket, type PocketMember } from '../../types';

const Pockets: React.FC = () => {
    const navigate = useNavigate();

    // Load initial state from localStorage
    const getInitialViewMode = (): 'grid' | 'list' => {
        const saved = localStorage.getItem('pockets-view-mode');
        return (saved === 'list' || saved === 'grid') ? saved : 'grid';
    };

    const getInitialFilter = (): string => {
        const saved = localStorage.getItem('pockets-sort-filter');
        return saved || 'newest-updated';
    };

    const [viewMode, setViewMode] = useState<'grid' | 'list'>(getInitialViewMode);
    const [filter, setFilter] = useState(getInitialFilter);
    const [searchQuery, setSearchQuery] = useState('');
    const [openOptionsMenu, setOpenOptionsMenu] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAddPhotosModal, setShowAddPhotosModal] = useState(false);
    const [showAddMembersModal, setShowAddMembersModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedPocketForPhotos, setSelectedPocketForPhotos] = useState<Pocket | null>(null);
    const [selectedPocketForMembers, setSelectedPocketForMembers] = useState<Pocket | null>(null);
    const [selectedPocketForEdit, setSelectedPocketForEdit] = useState<Pocket | null>(null);
    const [showMembersModal, setShowMembersModal] = useState(false);
    const [selectedPocketForMembersView, setSelectedPocketForMembersView] = useState<Pocket | null>(null);
    const { showEmailVerification, setEmailVerifiedCallback } = useEmailVerification();

    // React Query hooks
    const { data: pocketsData, isLoading, error } = usePockets();

    const pockets = pocketsData || [];

    // Functions to save state to localStorage
    const saveViewMode = (mode: 'grid' | 'list') => {
        localStorage.setItem('pockets-view-mode', mode);
    };

    const saveFilter = (filterValue: string) => {
        localStorage.setItem('pockets-sort-filter', filterValue);
    };

    // Wrapper functions to update state and save to localStorage
    const handleViewModeChange = (mode: 'grid' | 'list') => {
        setViewMode(mode);
        saveViewMode(mode);
    };

    const handleFilterChange = (filterValue: string) => {
        setFilter(filterValue);
        saveFilter(filterValue);
    };

    // Default placeholder images as data URI for better reliability
    const DEFAULT_COVER_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjNjY3ZWVhIi8+CjxyZWN0IHg9IjQwIiB5PSI0MCIgd2lkdGg9IjEyMCIgaGVpZ2h0PSI3MCIgcng9IjgiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4yIi8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjY1IiByPSIxNSIgZmlsbD0iI2ZmZmZmZiIgZmlsbC1vcGFjaXR5PSIwLjYiLz4KPHBhdGggZD0iTTkwIDc1TDk1IDgwTDEwNSA3MEwxMTUgODBMMTIwIDc1IiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIgc3Ryb2tlLW9wYWNpdHk9IjAuNiIvPgo8dGV4dCB4PSIxMDAiIHk9IjEzMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmaWxsPSIjZmZmZmZmIiBmaWxsLW9wYWNpdHk9IjAuOCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Tm8gQ292ZXIgUGhvdG88L3RleHQ+Cjwvc3ZnPgo=';
    const DEFAULT_PROFILE_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjUiIGN5PSIyNSIgcj0iMjUiIGZpbGw9IiM2NjdlZWEiLz4KPGNpcmNsZSBjeD0iMjUiIGN5PSIyMCIgcj0iOCIgZmlsbD0iI2ZmZmZmZiIgZmlsbC1vcGFjaXR5PSIwLjgiLz4KPHBhdGggZD0iTTEwIDQwQzEwIDM1IDE1IDMwIDI1IDMwQzM1IDMwIDQwIDM1IDQwIDQwIiBmaWxsPSIjZmZmZmZmIiBmaWxsLW9wYWNpdHk9IjAuOCIvPgo8L3N2Zz4K';

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

    // React Query handles data fetching automatically

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

    // Helper function to get profile picture URL - similar to EventView implementation
    const getProfilePictureUrl = (member: PocketMember): string => {
        let rawUrl: string | undefined;

        // Handle different profile picture formats from API
        if (member.profile_picture_default) {
            // User has default profile picture, use placeholder
            return DEFAULT_PROFILE_PLACEHOLDER;
        } else if (member.profile_picture) {
            // Prioritize small for avatars, then medium, then large
            rawUrl = member.profile_picture?.url_small ?? member.profile_picture?.url_medium ?? member.profile_picture?.url_large;
        }

        if (!rawUrl) {
            return DEFAULT_PROFILE_PLACEHOLDER;
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
        const pocketIdSuffix = pocket.pocket_id.slice(-6); // Last 6 characters of pocket ID
        const truncatedTitle = pocket.pocket_title.length > 50 ? pocket.pocket_title.substring(0, 50) + '...' : pocket.pocket_title;
        navigate(`/pockets/${encodeURIComponent(truncatedTitle)}-${pocketIdSuffix}`);
    };

    // Handle viewing all members
    const handleViewAllMembers = (pocket: Pocket) => {
        setSelectedPocketForMembersView(pocket);
        setShowMembersModal(true);
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

    // Filter pockets based on search query
    const filteredPockets = pockets.filter(pocket => {
        if (!searchQuery.trim()) return true;

        const query = searchQuery.toLowerCase().trim();
        return (
            pocket.pocket_title.toLowerCase().includes(query) ||
            pocket.pocket_members.some(member =>
                member.first_name.toLowerCase().includes(query) ||
                member.last_name.toLowerCase().includes(query) ||
                member.username.toLowerCase().includes(query)
            )
        );
    });

    // Get sorted pockets based on current filter
    const sortedPockets = sortPockets(filteredPockets, filter);

    if (isLoading) {
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
        const errorMessage = typeof error === 'string' ? error : error?.message || 'Failed to load pockets';
        return (
            <div className="media-page">
                <NavBar />
                <main className="main-content">
                    <div className="error-state">
                        <h2>Error Loading Pockets</h2>
                        <p>{errorMessage}</p>
                        {errorMessage.includes('verify your email') && (
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
                            <UserAvatar size="medium" clickable={true} />
                        </div>
                    </div>
                </header>

                {/* Controls */}
                <section className="controls-section">
                    <div className="controls-left">
                        <div className="search-box">
                            <input
                                type="text"
                                placeholder="Search pockets..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <span className="search-icon">🔍</span>
                            {searchQuery.trim() && (
                                <button
                                    className="clear-search-button"
                                    onClick={() => setSearchQuery('')}
                                    type="button"
                                    aria-label="Clear search"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="controls-right">
                        <div className="view-toggle">
                            <button
                                className={`view-button ${viewMode === 'grid' ? 'active' : ''}`}
                                onClick={() => handleViewModeChange('grid')}
                            >
                                <span>⊞</span>
                            </button>
                            <button
                                className={`view-button ${viewMode === 'list' ? 'active' : ''}`}
                                onClick={() => handleViewModeChange('list')}
                            >
                                <span>☰</span>
                            </button>
                        </div>
                        <div className="filter-dropdown">
                            <select value={filter} onChange={(e) => handleFilterChange(e.target.value)}>
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
                </section>

                {/* Pockets Section */}
                <section className="albums-section">
                    <h2>
                        {searchQuery.trim() ? (
                            <>
                                Search Results
                                <span className="search-results-info">
                                    {sortedPockets.length} pocket{sortedPockets.length !== 1 ? 's' : ''} found for "{searchQuery}"
                                </span>
                            </>
                        ) : (
                            `Your Pockets (${sortedPockets.length})`
                        )}
                    </h2>
                    {sortedPockets.length === 0 ? (
                        <div className="empty-state">
                            {searchQuery.trim() ? (
                                <>
                                    <div className="empty-state-icon search-icon">
                                        <div className="search-glass">
                                            <div className="magnifying-glass">
                                                <div className="glass-circle"></div>
                                                <div className="glass-handle"></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="empty-state-content">
                                        <h3>No pockets found</h3>
                                        <p>No pockets match "{searchQuery}". Try a different search term or check your spelling.</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="empty-state-content">
                                        <h3>Start your first pocket</h3>
                                        <p>Pockets help you organize and share your memories with friends and family. Create your first pocket to get started!</p>
                                    </div>
                                    <div
                                        className="empty-state-cta"
                                        onClick={() => setShowCreateModal(true)}
                                    >
                                        <div className="cta-content">
                                            <div className="cta-icon">✨</div>
                                            <div className="cta-text">
                                                <span className="cta-title">Create Your First Pocket</span>
                                                <span className="cta-subtitle">Click here to get started</span>
                                            </div>
                                        </div>
                                        <div className="cta-arrow">→</div>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className={`pockets-container ${viewMode === 'list' ? 'pockets-list' : 'albums-grid'}`}>
                            {sortedPockets.map((pocket, index) => (
                                <div
                                    key={pocket.pocket_id}
                                    className={`pocket-card ${viewMode === 'list' ? 'pocket-list-item' : 'album-card'}`}
                                    onClick={() => handlePocketClick(pocket)}
                                    style={{
                                        cursor: 'pointer',
                                        zIndex: viewMode === 'list' ? sortedPockets.length - index : 1
                                    }}
                                >
                                    <img
                                        src={getCoverPhotoUrl(pocket)}
                                        alt={pocket.pocket_title}
                                        className={viewMode === 'list' ? 'pocket-list-cover' : 'album-cover'}
                                        onError={(e) => {
                                            // Fallback if the cover photo fails to load
                                            e.currentTarget.src = DEFAULT_COVER_PLACEHOLDER;
                                        }}
                                    />
                                    <div className={viewMode === 'list' ? 'pocket-list-info' : 'album-info'}>
                                        <h3>{pocket.pocket_title}</h3>
                                        {viewMode === 'list' && (
                                            <>
                                                <p className="member-count">{pocket.pocket_members.length} members</p>
                                                <div className="pocket-list-dates">
                                                    <span className="pocket-updated">
                                                        Updated: {formatDate(pocket.pocket_updated_at)}
                                                    </span>
                                                    <span className="pocket-activity">
                                                        Last Activity: {formatDate(pocket.pocket_last_activity_at)}
                                                    </span>
                                                    <span className="pocket-created">
                                                        Created: {formatDate(pocket.pocket_created_at)}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                        {viewMode === 'grid' && (
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
                                        )}
                                    </div>

                                    {/* Member Avatars Section */}
                                    <div className="pocket-members">
                                        {viewMode === 'grid' && (
                                            <span className="member-count">{pocket.pocket_members.length} members</span>
                                        )}
                                        <div className="member-avatars">
                                            {/* Show up to 3 member avatars */}
                                            {pocket.pocket_members?.slice(0, 3).map((member) => (
                                                <div
                                                    key={member.id}
                                                    className="member-avatar member-avatar--clickable"
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // Prevent pocket card click
                                                        navigate(`/profile/${member.id}`);
                                                    }}
                                                    title={`${member.first_name} ${member.last_name}`}
                                                >
                                                    <img
                                                        src={getProfilePictureUrl(member)}
                                                        alt={member.first_name}
                                                        onError={(e) => {
                                                            e.currentTarget.src = DEFAULT_PROFILE_PLACEHOLDER;
                                                        }}
                                                    />
                                                </div>
                                            ))}
                                            {/* Show "+X" if more than 3 members */}
                                            {pocket.pocket_members.length > 3 && (
                                                <span
                                                    className="more-members more-members--clickable"
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // Prevent pocket card click
                                                        handleViewAllMembers(pocket);
                                                    }}
                                                    title={`View all ${pocket.pocket_members.length} members`}
                                                >
                                                    +{pocket.pocket_members.length - 3}
                                                </span>
                                            )}
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
            />

            {/* Add Pocket Photos Modal */}
            {selectedPocketForPhotos && (
                <AddPocketPhotosModal
                    isOpen={showAddPhotosModal}
                    onClose={() => {
                        setShowAddPhotosModal(false);
                        setSelectedPocketForPhotos(null);
                    }}
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
                    pocket={selectedPocketForEdit}
                />
            )}

            {/* Members Modal */}
            {selectedPocketForMembersView && (
                <MembersModal
                    isOpen={showMembersModal}
                    onClose={() => {
                        setShowMembersModal(false);
                        setSelectedPocketForMembersView(null);
                    }}
                    title={`${selectedPocketForMembersView.pocket_title} Members`}
                    members={selectedPocketForMembersView.pocket_members}
                />
            )}
        </div>
    );
};

export default Pockets; 
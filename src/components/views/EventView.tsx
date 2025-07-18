import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './EventView.css';
import NavBar from '../ui/NavBar';
import UserAvatar from '../ui/UserAvatar';
import CreateEventModal from '../modals/CreateEventModal';
import AddMediaModal from '../modals/AddMediaModal';
import AddEventMembersModal from '../modals/AddEventMembersModal';
import EditEventModal from '../modals/EditEventModal';

import { usePocketFromUrl, useEvents, usePockets } from '../../hooks/usePhotos';
import { type Pocket, type Event, type PreviewPhoto, type PocketMember, type ContactUser } from '../../types';

const EventView: React.FC = () => {
    const { pocketTitle } = useParams<{ pocketTitle: string }>();
    const navigate = useNavigate();

    // Load initial state from localStorage
    const getInitialViewMode = (): 'grid' | 'list' => {
        const saved = localStorage.getItem('events-view-mode');
        return (saved === 'list' || saved === 'grid') ? saved : 'grid';
    };

    const getInitialFilter = (): string => {
        const saved = localStorage.getItem('events-sort-filter');
        return saved || 'newest-updated';
    };

    const getInitialHideInherited = (): boolean => {
        const saved = localStorage.getItem('events-hide-inherited');
        return saved === 'true';
    };

    const [viewMode, setViewMode] = useState<'grid' | 'list'>(getInitialViewMode);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState(getInitialFilter);
    const [hideInherited, setHideInherited] = useState(getInitialHideInherited);
    const [openOptionsMenu, setOpenOptionsMenu] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAddMediaModal, setShowAddMediaModal] = useState(false);
    const [selectedEventForPhotos, setSelectedEventForPhotos] = useState<Event | null>(null);
    const [showAddMembersModal, setShowAddMembersModal] = useState(false);
    const [selectedEventForMembers, setSelectedEventForMembers] = useState<Event | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedEventForEdit, setSelectedEventForEdit] = useState<Event | null>(null);

    // Functions to save state to localStorage
    const saveViewMode = (mode: 'grid' | 'list') => {
        localStorage.setItem('events-view-mode', mode);
    };

    const saveFilter = (filterValue: string) => {
        localStorage.setItem('events-sort-filter', filterValue);
    };

    const saveHideInherited = (hideValue: boolean) => {
        localStorage.setItem('events-hide-inherited', hideValue.toString());
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

    const handleHideInheritedChange = (hideValue: boolean) => {
        setHideInherited(hideValue);
        saveHideInherited(hideValue);
    };

    // React Query hooks
    const { pocket, isLoading: isLoadingPocket, error: pocketError } = usePocketFromUrl(pocketTitle);
    const { data: eventsData, isLoading: isLoadingEvents, error: eventsError } = useEvents(pocket?.pocket_id);
    const { data: allPockets } = usePockets(); // For finding source pockets

    // Combined loading and error states
    const isLoading = isLoadingPocket || isLoadingEvents;
    const error = pocketError || eventsError;
    const events = eventsData || [];

    // Helper function to find source pocket by ID
    const getSourcePocket = (sourcePocketId: string): Pocket | undefined => {
        return allPockets?.find(p => p.pocket_id === sourcePocketId);
    };

    // Default placeholder images as data URI for better reliability
    const DEFAULT_EVENT_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjNjY3ZWVhIi8+CjxyZWN0IHg9IjQwIiB5PSI0MCIgd2lkdGg9IjEyMCIgaGVpZ2h0PSI3MCIgcng9IjgiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4yIi8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjY1IiByPSIxNSIgZmlsbD0iI2ZmZmZmZiIgZmlsbC1vcGFjaXR5PSIwLjYiLz4KPHBhdGggZD0iTTkwIDc1TDk1IDgwTDEwNSA3MEwxMTUgODBMMTIwIDc1IiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIgc3Ryb2tlLW9wYWNpdHk9IjAuNiIvPgo8dGV4dCB4PSIxMDAiIHk9IjEzMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmaWxsPSIjZmZmZmZmIiBmaWxsLW9wYWNpdHk9IjAuOCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Tm8gUGhvdG9zPC90ZXh0Pgo8L3N2Zz4K';
    const DEFAULT_PROFILE_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjUiIGN5PSIyNSIgcj0iMjUiIGZpbGw9IiM2NjdlZWEiLz4KPGNpcmNsZSBjeD0iMjUiIGN5PSIyMCIgcj0iOCIgZmlsbD0iI2ZmZmZmZiIgZmlsbC1vcGFjaXR5PSIwLjgiLz4KPHBhdGggZD0iTTEwIDQwQzEwIDM1IDE1IDMwIDI1IDMwQzM1IDMwIDQwIDM1IDQwIDQwIiBmaWxsPSIjZmZmZmZmIiBmaWxsLW9wYWNpdHk9IjAuOCIvPgo8L3N2Zz4K';

    // Helper function to sort events based on filter - similar to Pockets.tsx
    const sortEvents = (eventsToSort: Event[], sortFilter: string): Event[] => {
        const sorted = [...eventsToSort];

        switch (sortFilter) {
            case 'newest-updated':
                return sorted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
            case 'oldest-updated':
                return sorted.sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
            case 'newest-created':
                return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            case 'oldest-created':
                return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            case 'a-z':
                return sorted.sort((a, b) => a.title.localeCompare(b.title));
            case 'z-a':
                return sorted.sort((a, b) => b.title.localeCompare(a.title));
            case 'photo-high-low':
                return sorted.sort((a, b) => b.photo_count - a.photo_count);
            case 'photo-low-high':
                return sorted.sort((a, b) => a.photo_count - b.photo_count);
            case 'member-high-low':
                return sorted.sort((a, b) => (b.additional_member_count || 0) - (a.additional_member_count || 0));
            case 'member-low-high':
                return sorted.sort((a, b) => (a.additional_member_count || 0) - (b.additional_member_count || 0));
            default:
                return sorted;
        }
    };

    // React Query handles data fetching automatically

    // Debug: Log events data when component mounts or events change
    useEffect(() => {
        console.log('EventView received events:', events);
    }, [events]);

    // Filter events based on search query and inherited status
    const filteredEvents = events.filter(event => {
        // Search filter
        if (searchTerm.trim()) {
            const query = searchTerm.toLowerCase().trim();
            const matchesSearch = (
                event.title.toLowerCase().includes(query) ||
                event.additional_members?.some(member =>
                    member.first_name.toLowerCase().includes(query) ||
                    member.last_name.toLowerCase().includes(query) ||
                    member.username.toLowerCase().includes(query)
                )
            );
            if (!matchesSearch) return false;
        }

        // Inherited filter
        if (hideInherited && event.inherited) {
            return false;
        }

        return true;
    });

    // Get sorted events based on current filter
    const filteredAndSortedEvents = sortEvents(filteredEvents, filter);

    // Handle back to pockets view
    const handleBackToPockets = () => {
        navigate('/pockets');
    };

    // Helper function to get photo URL with better fallback logic - similar to React Native implementation
    const getPhotoUrl = (photo: PreviewPhoto): string => {
        let rawUrl: string | undefined;

        // Handle different photo_url formats from API (like React Native does)
        if (typeof photo.photo_url === "string") {
            // Direct string URL (PreviewPhoto format)
            rawUrl = photo.photo_url;
        } else if (typeof photo.photo_url === "object") {
            // Object with url properties (other formats)
            // Prioritize medium for best quality, then small as fallback
            rawUrl = photo.photo_url?.url_med ?? photo.photo_url?.url_small;
        }

        if (!rawUrl) {
            return DEFAULT_EVENT_PLACEHOLDER;
        }

        // URLs are already perfect S3 signed URLs - no decoding needed!
        // If it's already HTTP, return as-is
        if (rawUrl.startsWith("http")) {
            return rawUrl;
        }

        // If it doesn't start with http, add https:// (fallback)
        return `https://${rawUrl}`;
    };

    // Helper function to format date (handles UTC/Zulu time conversion)
    const formatDate = (dateString: string): string => {
        const utcDate = new Date(dateString);
        const formatted = utcDate.toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric'
        });
        return formatted;
    };

    // Helper function to format date range (handles UTC/Zulu time conversion)
    const formatDateRange = (startDate?: string, endDate?: string): string | null => {
        if (!startDate && !endDate) return null;

        const formatDateOnly = (dateString: string): string => {
            // Parse the UTC/Zulu time string and convert to local timezone
            const utcDate = new Date(dateString);

            return utcDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        };

        if (startDate && endDate) {
            const start = formatDateOnly(startDate);
            const end = formatDateOnly(endDate);
            if (start === end) {
                return start;
            }
            return `${start} - ${end}`;
        } else if (startDate) {
            const formatted = formatDateOnly(startDate);
            return formatted;
        } else if (endDate) {
            const formatted = formatDateOnly(endDate);
            return `Until ${formatted}`;
        }

        return null;
    };

    // Helper function to get profile picture URL - similar to React Native implementation
    const getProfilePictureUrl = (member: PocketMember | ContactUser): string => {
        let rawUrl: string | undefined;

        // Handle different profile picture formats from API
        if ('profile_picture_default' in member && member.profile_picture_default) {
            // User has default profile picture, use placeholder
            return DEFAULT_PROFILE_PLACEHOLDER;
        } else if ('profile_picture' in member && member.profile_picture) {
            // Both PocketMember and ContactUser now use profile_picture object
            if (typeof member.profile_picture === "string") {
                rawUrl = member.profile_picture;
            } else if (typeof member.profile_picture === "object") {
                // Prioritize small for avatars, then medium, then large
                rawUrl = member.profile_picture?.url_small ?? member.profile_picture?.url_medium ?? member.profile_picture?.url_large;
            }
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

    // Helper function to get pocket cover photo URL - similar to Pockets.tsx implementation
    const getPocketCoverUrl = (pocket: Pocket): string => {
        // Use the cover_photo_url object from the API response
        // Prioritize large for best quality, then medium, then small
        const rawUrl = pocket.cover_photo_url?.url_large ??
            pocket.cover_photo_url?.url_med ??
            pocket.cover_photo_url?.url_small;

        if (!rawUrl) {
            return DEFAULT_EVENT_PLACEHOLDER;
        }

        // URLs are already perfect S3 signed URLs - no decoding needed!
        // If it's already HTTP, return as-is
        if (rawUrl.startsWith("http")) {
            return rawUrl;
        }

        // If it doesn't start with http, add https:// (fallback)
        return `https://${rawUrl}`;
    };

    // Handle open grid photo view
    const handleOpenGridPhotoView = (event: Event) => {
        const pocketIdSuffix = pocket?.pocket_id.slice(-6) || '';
        const eventIdSuffix = event.id.slice(-6);
        const truncatedPocketTitle = pocket?.pocket_title && pocket.pocket_title.length > 50 ? pocket.pocket_title.substring(0, 50) + '...' : pocket?.pocket_title || '';
        const truncatedEventTitle = event.title.length > 50 ? event.title.substring(0, 50) + '...' : event.title;
        navigate(`/pockets/${encodeURIComponent(truncatedPocketTitle)}-${pocketIdSuffix}/${encodeURIComponent(truncatedEventTitle)}-${eventIdSuffix}`);
    };

    // Handle options menu toggle
    const handleOptionsClick = (e: React.MouseEvent, eventId: string) => {
        e.stopPropagation();
        setOpenOptionsMenu(openOptionsMenu === eventId ? null : eventId);
    };

    // Handle option selection
    const handleOptionSelect = (option: string, event: Event) => {
        setOpenOptionsMenu(null);

        switch (option) {
            case 'add-photos':
                setSelectedEventForPhotos(event);
                setShowAddMediaModal(true);
                break;
            case 'add-people':
                setSelectedEventForMembers(event);
                setShowAddMembersModal(true);
                break;
            case 'share':
                // TODO: Implement share functionality
                console.log('Share functionality not implemented yet');
                break;
            case 'edit':
                setSelectedEventForEdit(event);
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





    // Render event card with photo previews
    const renderEventCard = (event: Event, index?: number) => {
        // Get up to 5 photos for preview (1 large + 4 small)
        const previewPhotos = event.preview_photos?.slice(0, 5) || [];
        const totalPhotoCount = event.photo_count || 0;
        const totalMemberCount = (pocket?.pocket_members?.length || 0) + (event.additional_member_count || 0);

        return (
            <div key={event.id} className={`event-card ${viewMode === 'list' ? 'event-list-item' : ''}`}
                onClick={() => {
                    handleOpenGridPhotoView(event);
                }}
                style={{
                    cursor: 'pointer',
                    zIndex: viewMode === 'list' && index !== undefined ? filteredAndSortedEvents.length - index : 1
                }}>
                {/* Event Header */}
                <div className="event-header">
                    <div className="event-title-section">
                        <h3
                            className="event-title clickable-title"
                        >
                            {event.title}
                        </h3>
                    </div>
                    <div className="event-meta">
                        <span className="event-date">{totalPhotoCount} photos</span>
                        {formatDateRange(event.date_range_start, event.date_range_end) && (
                            <span className="event-date-range">{formatDateRange(event.date_range_start, event.date_range_end)}</span>
                        )}
                        <span className="event-updated">Updated {formatDate(event.updated_at)}</span>
                        <button
                            className="event-options-button"
                            onClick={(e) => handleOptionsClick(e, event.id)}
                        >
                            <span>⋯</span>
                        </button>
                    </div>
                </div>

                {/* Event Photo Preview */}
                <div className="event-photos-preview">
                    {previewPhotos.length > 0 ? (
                        viewMode === 'list' ? (
                            // List view: single row of photos
                            <div className="photo-row">
                                {previewPhotos.slice(0, 5).map((photo, index) => (
                                    <div key={index} className="row-photo">
                                        <img
                                            src={getPhotoUrl(photo)}
                                            alt="Event photo"
                                            onError={(e) => {
                                                e.currentTarget.src = DEFAULT_EVENT_PLACEHOLDER;
                                            }}
                                        />
                                        {/* Show "more" overlay on last photo if there are additional photos */}
                                        {index === 4 && totalPhotoCount > 5 && (
                                            <div className="more-photos-overlay">
                                                <span>+{totalPhotoCount - 5}</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            // Grid view: existing layout
                            <div className="photo-grid">
                                {/* Large photo on the left */}
                                {previewPhotos[0] && (
                                    <div className="large-photo">
                                        <img
                                            src={getPhotoUrl(previewPhotos[0])}
                                            alt="Event photo"
                                            onError={(e) => {
                                                e.currentTarget.src = DEFAULT_EVENT_PLACEHOLDER;
                                            }}
                                        />
                                    </div>
                                )}

                                {/* 2x2 grid on the right */}
                                <div className="small-photos-grid">
                                    <div className="top-row">
                                        {previewPhotos[1] && (
                                            <div className="small-photo">
                                                <img
                                                    src={getPhotoUrl(previewPhotos[1])}
                                                    alt="Event photo"
                                                    onError={(e) => {
                                                        e.currentTarget.src = DEFAULT_EVENT_PLACEHOLDER;
                                                    }}
                                                />
                                            </div>
                                        )}
                                        {previewPhotos[2] && (
                                            <div className="small-photo">
                                                <img
                                                    src={getPhotoUrl(previewPhotos[2])}
                                                    alt="Event photo"
                                                    onError={(e) => {
                                                        e.currentTarget.src = DEFAULT_EVENT_PLACEHOLDER;
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <div className="bottom-row">
                                        {previewPhotos[3] && (
                                            <div className="small-photo">
                                                <img
                                                    src={getPhotoUrl(previewPhotos[3])}
                                                    alt="Event photo"
                                                    onError={(e) => {
                                                        e.currentTarget.src = DEFAULT_EVENT_PLACEHOLDER;
                                                    }}
                                                />
                                            </div>
                                        )}
                                        {previewPhotos[4] && (
                                            <div className="small-photo">
                                                <img
                                                    src={getPhotoUrl(previewPhotos[4])}
                                                    alt="Event photo"
                                                    onError={(e) => {
                                                        e.currentTarget.src = DEFAULT_EVENT_PLACEHOLDER;
                                                    }}
                                                />
                                                {/* Show "more" overlay if there are additional photos */}
                                                {totalPhotoCount > 5 && (
                                                    <div
                                                        className="more-photos-overlay"
                                                    >
                                                        <span>+{totalPhotoCount - 5}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    ) : (
                        <div className="empty-event-photos">
                            <div className="empty-photos-placeholder">
                                <div className="placeholder-icon">📷</div>
                                <p>No photos yet</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Event Footer */}
                <div className="event-footer">
                    <div className="event-members">
                        <span className="member-count">{totalMemberCount} members</span>
                        <div className="member-avatars">
                            {/* Show pocket members first */}
                            {pocket?.pocket_members?.slice(0, 3).map((member) => (
                                <div key={member.id} className="member-avatar">
                                    <img
                                        src={getProfilePictureUrl(member)}
                                        alt={member.first_name}
                                        onError={(e) => {
                                            e.currentTarget.src = DEFAULT_PROFILE_PLACEHOLDER;
                                        }}
                                    />
                                </div>
                            ))}
                            {/* Show additional members if any */}
                            {event.additional_members?.slice(0, Math.max(0, 3 - (pocket?.pocket_members?.length || 0))).map((member) => (
                                <div key={member.id} className="member-avatar">
                                    <img
                                        src={getProfilePictureUrl(member)}
                                        alt={member.first_name}
                                        onError={(e) => {
                                            e.currentTarget.src = DEFAULT_PROFILE_PLACEHOLDER;
                                        }}
                                    />
                                </div>
                            ))}
                            {totalMemberCount > 3 && (
                                <span className="more-members">+{totalMemberCount - 3}</span>
                            )}
                        </div>
                    </div>

                    {/* Show source pocket if event is inherited */}
                    {event.inherited && event.source_pocket_id && (
                        <div className="event-source-pocket">
                            <span className="source-label">Inherited from:</span>
                            <span className="source-pocket-name">
                                {getSourcePocket(event.source_pocket_id)?.pocket_title || 'Unknown Pocket'}
                            </span>
                        </div>
                    )}
                </div>

                {/* Options Menu */}
                {openOptionsMenu === event.id && (
                    <div className="event-options-menu">
                        <div className="options-menu-item" onClick={(e) => {
                            e.stopPropagation();
                            handleOptionSelect('add-photos', event)
                        }}>
                            <span className="option-icon">📸</span>
                            Add Photos
                        </div>
                        <div className="options-menu-item" onClick={(e) => {
                            e.stopPropagation();
                            handleOptionSelect('add-people', event)
                        }}>
                            <span className="option-icon">👥</span>
                            Add People
                        </div>
                        <div className="options-menu-item" onClick={(e) => {
                            e.stopPropagation();
                            handleOptionSelect('share', event)
                        }}>
                            <span className="option-icon">📤</span>
                            Share
                        </div>
                        <div className="options-menu-item" onClick={(e) => {
                            e.stopPropagation();
                            handleOptionSelect('edit', event)
                        }}>
                            <span className="option-icon">✏️</span>
                            Edit
                        </div>
                        <div className="options-menu-item" onClick={(e) => {
                            e.stopPropagation();
                            handleOptionSelect('leave', event)
                        }}>
                            <span className="option-icon">🚪</span>
                            Leave Event
                        </div>
                    </div>
                )}
            </div>
        );
    };



    // Show loading state
    if (isLoading) {
        return (
            <div className="event-view-page">
                <NavBar />
                <main className="main-content">
                    <div className="loading-state">
                        <div className="loading-spinner"></div>
                        <p>Loading events...</p>
                    </div>
                </main>
            </div>
        );
    }

    // Show error state
    if (error || !pocket) {
        return (
            <div className="event-view-page">
                <NavBar />
                <main className="main-content">
                    <div className="error-state">
                        <h2>Error Loading Events</h2>
                        <p>{typeof error === 'string' ? error : error?.message || 'Pocket not found'}</p>
                        <button onClick={handleBackToPockets} className="retry-button">
                            Back to Pockets
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="event-view-page">
            <NavBar />
            <main className="main-content">
                {/* Header */}
                <header className="event-view-header">
                    <div className="header-left">
                        <div className="back-button-section">
                            <button onClick={handleBackToPockets} className="back-button">
                                <span>←</span>
                            </button>
                            <div className="pocket-info">
                                <div className="pocket-cover-avatar">
                                    <img
                                        src={getPocketCoverUrl(pocket)}
                                        alt={pocket.pocket_title}
                                        onError={(e) => {
                                            e.currentTarget.src = DEFAULT_EVENT_PLACEHOLDER;
                                        }}
                                    />
                                </div>
                                <h1 className="pocket-title">{pocket.pocket_title}</h1>
                            </div>
                        </div>
                        <p>Events and photos in this pocket</p>
                    </div>
                    <div className="header-right">
                        <button
                            className="upload-button"
                            onClick={() => setShowCreateModal(true)}
                        >
                            <span>+</span>
                            Create Event
                        </button>
                        <div className="user-menu">
                            <UserAvatar size="medium" />
                        </div>
                    </div>
                </header>

                {/* Controls */}
                <section className="controls-section">
                    <div className="controls-left">
                        <div className="search-box">
                            <input
                                type="text"
                                placeholder="Search events..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <span className="search-icon">🔍</span>
                            {searchTerm.trim() && (
                                <button
                                    className="clear-search-button"
                                    onClick={() => setSearchTerm('')}
                                    type="button"
                                    aria-label="Clear search"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="controls-right">
                        <div className="inherited-toggle">
                            <label className="toggle-label">
                                <input
                                    type="checkbox"
                                    checked={hideInherited}
                                    onChange={(e) => handleHideInheritedChange(e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                                <span className="toggle-text">Hide Inherited</span>
                            </label>
                        </div>
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
                                <option value="newest-created">Newest Created</option>
                                <option value="oldest-created">Oldest Created</option>
                                <option value="a-z">A-Z</option>
                                <option value="z-a">Z-A</option>
                                <option value="photo-high-low">Photo Count (High to Low)</option>
                                <option value="photo-low-high">Photo Count (Low to High)</option>
                                <option value="member-high-low">Member Count (High to Low)</option>
                                <option value="member-low-high">Member Count (Low to High)</option>
                            </select>
                        </div>
                    </div>
                </section>

                {/* Events List */}
                <section className="events-section">
                    <h2>
                        {searchTerm.trim() ? (
                            <>
                                Search Results
                                <span className="search-results-info">
                                    {filteredAndSortedEvents.length} event{filteredAndSortedEvents.length !== 1 ? 's' : ''} found for "{searchTerm}"
                                    {hideInherited ? ' (inherited events hidden)' : ''}
                                </span>
                            </>
                        ) : (
                            <>
                                Events ({filteredAndSortedEvents.length})
                                {hideInherited && (
                                    <span className="filter-info"> - inherited events hidden</span>
                                )}
                            </>
                        )}
                    </h2>
                    {events.length === 0 ? (
                        <div className="empty-events">
                            <div className="empty-icon">📅</div>
                            <h3>No events in this pocket</h3>
                            <p>This pocket doesn't have any events yet. Create your first event to start sharing photos!</p>
                            <button className="create-event-button-large" onClick={() => setShowCreateModal(true)}>
                                <span>+</span>
                                Create Your First Event
                            </button>
                        </div>
                    ) : filteredAndSortedEvents.length === 0 ? (
                        <div className="empty-events">
                            <div className="empty-icon">🔍</div>
                            <h3>No events found</h3>
                            <p>No events match "{searchTerm}"</p>
                        </div>
                    ) : (
                        <div className={`events-list ${viewMode === 'list' ? 'events-list-view' : 'events-grid-view'}`}>
                            {filteredAndSortedEvents.map((event, index) => renderEventCard(event, index))}
                        </div>
                    )}
                </section>
            </main>



            {/* Create Event Modal */}
            <CreateEventModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                pocketId={pocket?.pocket_id || ''}
                pocket={pocket}
            />

            {/* Add Media Modal */}
            {selectedEventForPhotos && (
                <AddMediaModal
                    isOpen={showAddMediaModal}
                    onClose={() => {
                        setShowAddMediaModal(false);
                        setSelectedEventForPhotos(null);
                    }}
                    eventId={selectedEventForPhotos.id}
                    eventTitle={selectedEventForPhotos.title}
                />
            )}

            {/* Add Event Members Modal */}
            {selectedEventForMembers && (
                <AddEventMembersModal
                    isOpen={showAddMembersModal}
                    onClose={() => {
                        setShowAddMembersModal(false);
                        setSelectedEventForMembers(null);
                    }}
                    eventId={selectedEventForMembers.id}
                    eventTitle={selectedEventForMembers.title}
                    existingMembers={[
                        ...(pocket?.pocket_members?.map(member => member.id) || []),
                        ...(selectedEventForMembers.additional_members?.map(member => member.id) || [])
                    ]}
                />
            )}

            {/* Edit Event Modal */}
            {selectedEventForEdit && (
                <EditEventModal
                    isOpen={showEditModal}
                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedEventForEdit(null);
                    }}
                    event={selectedEventForEdit}
                    pocket={pocket}
                />
            )}

        </div >
    );
};

export default EventView; 
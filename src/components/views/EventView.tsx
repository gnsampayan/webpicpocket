import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './EventView.module.css';
import NavBar from '../ui/NavBar';
import UserAvatar from '../ui/UserAvatar';
import CreateEventModal from '../modals/CreateEventModal';
import AddMediaModal from '../modals/AddMediaModal';
import AddEventMembersModal from '../modals/AddEventMembersModal';
import EditEventModal from '../modals/EditEventModal';
import MembersModal from '../modals/MembersModal';

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
        return saved || 'event-date-latest';
    };

    const getInitialHideInherited = (): boolean => {
        const saved = localStorage.getItem('events-hide-inherited');
        return saved === 'true';
    };

    // Session storage for last selected event card
    const getLastSelectedEventCard = (): string | null => {
        return sessionStorage.getItem('last-selected-event-card');
    };

    const setLastSelectedEventCard = (eventId: string) => {
        sessionStorage.setItem('last-selected-event-card', eventId);
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
    const [showMembersModal, setShowMembersModal] = useState(false);
    const [lastSelectedEventCard, setLastSelectedEventCardState] = useState<string | null>(getLastSelectedEventCard);
    const [hoveredEventCard, setHoveredEventCard] = useState<string | null>(null);
    // Load initial collapsed state from session storage
    const getInitialEmptyEventsCollapsed = (): boolean => {
        const saved = sessionStorage.getItem('empty-events-collapsed');
        return saved === 'true';
    };

    const [isEmptyEventsCollapsed, setIsEmptyEventsCollapsed] = useState(getInitialEmptyEventsCollapsed);

    // State for dynamic photo count calculation in list view
    const [maxPhotosInRow, setMaxPhotosInRow] = useState(5); // Default fallback
    const photoRowRef = useRef<HTMLDivElement>(null);

    // Refs for event cards to handle scrolling
    const eventCardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
    const mainContentRef = useRef<HTMLDivElement | null>(null);

    // Function to calculate how many photos can fit in the container
    const calculateMaxPhotos = () => {
        if (!photoRowRef.current) {
            return 5; // Default fallback
        }

        const containerWidth = photoRowRef.current.offsetWidth;
        const photoWidth = 80; // From CSS: .row-photo width
        const gapWidth = 12; // From CSS: .photo-row gap (0.75rem = 12px)

        if (containerWidth === 0) {
            return 5; // Container not rendered yet
        }

        // Formula: for n photos, total width = n * photoWidth + (n-1) * gapWidth
        // So: containerWidth >= n * photoWidth + (n-1) * gapWidth
        // Rearranging: n <= (containerWidth + gapWidth) / (photoWidth + gapWidth)
        const maxPhotos = Math.floor((containerWidth + gapWidth) / (photoWidth + gapWidth));
        const result = Math.max(1, Math.min(maxPhotos, 10)); // Always show at least 1, max 10

        return result;
    };

    // Update max photos when container resizes
    useEffect(() => {
        const updateMaxPhotos = () => {
            const newMax = calculateMaxPhotos();
            setMaxPhotosInRow(newMax);
        };

        // Initial calculation
        updateMaxPhotos();

        // Set up resize observer to recalculate when container size changes
        const resizeObserver = new ResizeObserver(() => {
            updateMaxPhotos();
        });

        if (photoRowRef.current) {
            resizeObserver.observe(photoRowRef.current);
        }

        // Also listen to window resize as fallback
        window.addEventListener('resize', updateMaxPhotos);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', updateMaxPhotos);
        };
    }, []);

    // Recalculate max photos when view mode changes
    useEffect(() => {
        if (viewMode === 'list') {
            // Small delay to ensure DOM has updated after view mode change
            const timer = setTimeout(() => {
                const newMax = calculateMaxPhotos();
                setMaxPhotosInRow(newMax);
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [viewMode]);

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
            case 'event-date-latest':
                return sorted.sort((a, b) => {
                    // Handle events without start dates by putting them at the end
                    if (!a.date_range_start && !b.date_range_start) return 0;
                    if (!a.date_range_start) return 1;
                    if (!b.date_range_start) return -1;
                    return new Date(b.date_range_start).getTime() - new Date(a.date_range_start).getTime();
                });
            case 'event-date-earliest':
                return sorted.sort((a, b) => {
                    // Handle events without start dates by putting them at the end
                    if (!a.date_range_start && !b.date_range_start) return 0;
                    if (!a.date_range_start) return 1;
                    if (!b.date_range_start) return -1;
                    return new Date(a.date_range_start).getTime() - new Date(b.date_range_start).getTime();
                });
            case 'event-end-latest':
                return sorted.sort((a, b) => {
                    // Use end date if available, otherwise fall back to start date
                    const aDate = a.date_range_end || a.date_range_start;
                    const bDate = b.date_range_end || b.date_range_start;

                    if (!aDate && !bDate) return 0;
                    if (!aDate) return 1;
                    if (!bDate) return -1;
                    return new Date(bDate).getTime() - new Date(aDate).getTime();
                });
            case 'event-end-earliest':
                return sorted.sort((a, b) => {
                    // Use end date if available, otherwise fall back to start date
                    const aDate = a.date_range_end || a.date_range_start;
                    const bDate = b.date_range_end || b.date_range_start;

                    if (!aDate && !bDate) return 0;
                    if (!aDate) return 1;
                    if (!bDate) return -1;
                    return new Date(aDate).getTime() - new Date(bDate).getTime();
                });
            case 'date-range-longest':
                return sorted.sort((a, b) => {
                    // Calculate duration in milliseconds
                    const getDuration = (event: Event): number => {
                        if (!event.date_range_start) return 0;
                        if (!event.date_range_end) return 0; // Single day events have 0 duration
                        return new Date(event.date_range_end).getTime() - new Date(event.date_range_start).getTime();
                    };

                    const aDuration = getDuration(a);
                    const bDuration = getDuration(b);

                    return bDuration - aDuration; // Longest first
                });
            case 'date-range-shortest':
                return sorted.sort((a, b) => {
                    // Calculate duration in milliseconds
                    const getDuration = (event: Event): number => {
                        if (!event.date_range_start) return Number.MAX_SAFE_INTEGER; // Put events without dates at the end
                        if (!event.date_range_end) return 0; // Single day events have 0 duration
                        return new Date(event.date_range_end).getTime() - new Date(event.date_range_start).getTime();
                    };

                    const aDuration = getDuration(a);
                    const bDuration = getDuration(b);

                    return aDuration - bDuration; // Shortest first
                });
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

    // Handle scroll positioning to last selected event card
    useEffect(() => {
        if (events.length > 0 && lastSelectedEventCard && mainContentRef.current) {
            console.log('🔄 Scrolling to last selected event:', lastSelectedEventCard);

            // Use requestAnimationFrame to ensure DOM has been updated
            requestAnimationFrame(() => {
                const eventCardElement = eventCardRefs.current[lastSelectedEventCard];
                const scrollContainer = mainContentRef.current;

                if (eventCardElement && scrollContainer) {
                    console.log('📍 Found event card element and scroll container, attempting to scroll to it');

                    // Get container's scroll properties
                    const containerScrollTop = scrollContainer.scrollTop;
                    const containerHeight = scrollContainer.clientHeight;
                    const containerScrollHeight = scrollContainer.scrollHeight;

                    console.log('📍 Container scroll top:', containerScrollTop);
                    console.log('📍 Container height:', containerHeight);
                    console.log('📍 Container scroll height:', containerScrollHeight);
                    console.log('📍 Max container scroll:', containerScrollHeight - containerHeight);

                    // Get element position relative to the container
                    const containerRect = scrollContainer.getBoundingClientRect();
                    const elementRect = eventCardElement.getBoundingClientRect();

                    // Calculate element position relative to container's scroll area
                    const elementTopInContainer = containerScrollTop + (elementRect.top - containerRect.top);

                    // Calculate target scroll position to center the element in the container
                    const targetScrollTop = elementTopInContainer - (containerHeight / 2) + (elementRect.height / 2);
                    const maxScroll = containerScrollHeight - containerHeight;
                    const safeScrollTop = Math.max(0, Math.min(targetScrollTop, maxScroll));

                    console.log('📍 Element top in container:', elementTopInContainer);
                    console.log('📍 Target scroll top:', targetScrollTop);
                    console.log('📍 Safe scroll top:', safeScrollTop);

                    // Scroll the main content container instantly
                    scrollContainer.scrollTop = safeScrollTop;

                    // Verify the scroll worked
                    const newScrollTop = scrollContainer.scrollTop;
                    console.log('📍 New scroll position:', newScrollTop);
                    if (Math.abs(newScrollTop - safeScrollTop) < 50) {
                        console.log('✅ Successfully scrolled to event card');
                    } else {
                        console.log('❌ Scroll verification failed');
                        console.log('📍 Expected:', safeScrollTop, 'Got:', newScrollTop);
                    }
                } else {
                    console.log('❌ Event card element or scroll container not found');
                    console.log('Event card element:', !!eventCardElement);
                    console.log('Scroll container:', !!scrollContainer);
                }
            });
        }
    }, [events, lastSelectedEventCard]);

    // Helper function to handle event card selection
    const handleEventCardSelection = (eventId: string) => {
        setLastSelectedEventCard(eventId);
        setLastSelectedEventCardState(eventId);
    };

    // Handle back to pockets view
    const handleBackToPockets = () => {
        // Clear last selected event card when navigating away
        sessionStorage.removeItem('last-selected-event-card');
        setLastSelectedEventCardState(null);
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

    // Helper function to format date as month only for display
    const formatDateMonthOnly = (dateString: string): string => {
        const utcDate = new Date(dateString);
        return utcDate.toLocaleDateString('en-US', {
            month: 'long'
        });
    };

    // Helper function to get full date for title attribute
    const getFullDateTitle = (dateString: string): string => {
        const utcDate = new Date(dateString);
        return utcDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // Helper function to format date range as month only for display
    const formatDateRangeMonthOnly = (startDate?: string, endDate?: string): string | null => {
        if (!startDate && !endDate) return null;

        const formatMonthOnly = (dateString: string): string => {
            const utcDate = new Date(dateString);
            return utcDate.toLocaleDateString('en-US', {
                month: 'long'
            });
        };

        if (startDate && endDate) {
            const startMonth = formatMonthOnly(startDate);
            const endMonth = formatMonthOnly(endDate);
            if (startMonth === endMonth) {
                return startMonth;
            }
            return `${startMonth} - ${endMonth}`;
        } else if (startDate) {
            return formatMonthOnly(startDate);
        } else if (endDate) {
            return `Until ${formatMonthOnly(endDate)}`;
        }

        return null;
    };

    // Helper function to get full date range for title attribute
    const getFullDateRangeTitle = (startDate?: string, endDate?: string): string | null => {
        if (!startDate && !endDate) return null;

        const formatFullDate = (dateString: string): string => {
            const utcDate = new Date(dateString);
            return utcDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        };

        if (startDate && endDate) {
            const start = formatFullDate(startDate);
            const end = formatFullDate(endDate);
            if (start === end) {
                return start;
            }
            return `${start} - ${end}`;
        } else if (startDate) {
            return formatFullDate(startDate);
        } else if (endDate) {
            return `Until ${formatFullDate(endDate)}`;
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

    // Handle open photo details view for a specific photo
    const handleOpenPhotoDetails = (e: React.MouseEvent, photo: PreviewPhoto, event: Event) => {
        e.stopPropagation(); // Prevent event card click
        const pocketIdSuffix = pocket?.pocket_id.slice(-6) || '';
        const eventIdSuffix = event.id.slice(-6);
        const truncatedPocketTitle = pocket?.pocket_title && pocket.pocket_title.length > 50 ? pocket.pocket_title.substring(0, 50) + '...' : pocket?.pocket_title || '';
        const truncatedEventTitle = event.title.length > 50 ? event.title.substring(0, 50) + '...' : event.title;
        const photoShortId = photo.id.slice(-6); // Use last 6 characters like GridPhotoView does
        navigate(`/pockets/${encodeURIComponent(truncatedPocketTitle)}-${pocketIdSuffix}/${encodeURIComponent(truncatedEventTitle)}-${eventIdSuffix}/photo/${photoShortId}`, { state: { from: 'eventView' } });
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

    const handleViewAllMembers = (event: Event) => {
        // Create a modified event object with a guest-specific title
        const eventWithGuestTitle: Event = {
            ...event,
            title: `${event.title} Guests`
        };
        setSelectedEventForMembers(eventWithGuestTitle);
        setShowMembersModal(true);
    };

    const handleViewAllPocketMembers = () => {
        // Create a dummy event object to pass to MembersModal for pocket members
        const dummyEvent: Event = {
            id: 'pocket-members',
            title: `${pocket?.pocket_title}`,
            created_at: '',
            updated_at: '',
            photo_count: 0,
            additional_member_count: 0,
            additional_members: [],
            preview_photos: [],
            date_range_start: undefined,
            date_range_end: undefined,
            inherited: false,
            source_pocket_id: undefined
        };
        setSelectedEventForMembers(dummyEvent);
        setShowMembersModal(true);
    };

    // Save empty events collapsed state to session storage
    const saveEmptyEventsCollapsed = (collapsed: boolean) => {
        sessionStorage.setItem('empty-events-collapsed', collapsed.toString());
    };

    // Handle empty events toggle
    const handleEmptyEventsToggle = () => {
        const newCollapsedState = !isEmptyEventsCollapsed;
        setIsEmptyEventsCollapsed(newCollapsedState);
        saveEmptyEventsCollapsed(newCollapsedState);
    };

    // Render simplified event card for empty events
    const renderEmptyEventCard = (event: Event, index?: number) => {
        return (
            <div key={event.id} className={`${styles.eventCard} ${styles.emptyEventCard} ${viewMode === 'list' ? styles.eventListItem : ''}`}
                onClick={() => {
                    handleEventCardSelection(event.id);
                    handleOpenGridPhotoView(event);
                }}
                onMouseEnter={() => setHoveredEventCard(event.id)}
                onMouseLeave={() => setHoveredEventCard(null)}
                style={{
                    cursor: 'pointer',
                    zIndex: viewMode === 'list' && index !== undefined ? 1000 - index : 1
                }}>
                {/* Event Header */}
                <div className={styles.eventHeader}>
                    <div className={styles.eventTitleSection}>
                        <h3
                            className={`${styles.eventTitle} clickable-title`}
                            onClick={() => {
                                handleEventCardSelection(event.id);
                                handleOpenGridPhotoView(event);
                            }}
                        >
                            {event.title}
                        </h3>
                    </div>
                    <div className={styles.eventMeta}>
                        <button
                            className={styles.eventOptionsButton}
                            onClick={(e) => handleOptionsClick(e, event.id)}
                        >
                            <span>⋯</span>
                        </button>
                    </div>
                </div>



                {/* Event Footer */}
                <div className={styles.eventFooter}>
                    {/* Top Row - Additional Members and Source Pocket */}
                    <div className={styles.eventFooterTopRow}>
                        <div className={styles.eventMembers}>
                            {event.additional_members && event.additional_members.length > 0 ? (
                                <>
                                    <span className={styles.memberCount}>
                                        {event.additional_members.length} guest{event.additional_members.length !== 1 ? 's' : ''}
                                    </span>
                                    <div className={styles.memberAvatars}>
                                        {event.additional_members.slice(0, 3).map((member) => (
                                            <div
                                                key={member.id}
                                                className={`${styles.memberAvatar} ${styles.memberAvatarClickable}`}
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Prevent event card click
                                                    handleEventCardSelection(event.id);
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
                                        {event.additional_members.length > 3 && (
                                            <span
                                                className={`${styles.moreMembers} ${styles.moreMembersClickable}`}
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Prevent event card click
                                                    handleEventCardSelection(event.id);
                                                    handleViewAllMembers(event);
                                                }}
                                                title={`View all ${event.additional_members.length} guests`}
                                            >
                                                +{event.additional_members.length - 3}
                                            </span>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <span className={styles.memberCount}>No guests</span>
                            )}
                        </div>

                        {/* Show source pocket if event is inherited */}
                        {event.inherited && event.source_pocket_id && (
                            <div className={styles.eventSourcePocket}>
                                <span className={styles.sourceLabel}>Inherited from:</span>
                                <span className={styles.sourcePocketName}>
                                    {getSourcePocket(event.source_pocket_id)?.pocket_title || 'Unknown Pocket'}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Bottom Row - Date Range and Updated Date */}
                    <div className={styles.eventFooterBottomRow}>
                        <div className={styles.eventMetaLeft}>
                            <span className={styles.eventPhotoCount}>
                                <span className={styles.emptyPhotoIcon}>📷</span>
                                <span className={styles.emptyPhotoText}>No photos</span>
                            </span>
                            {formatDateRangeMonthOnly(event.date_range_start, event.date_range_end) && (
                                <span
                                    className={styles.eventDateRange}
                                    title={(() => {
                                        const fullDateRange = getFullDateRangeTitle(event.date_range_start, event.date_range_end);
                                        if (!fullDateRange) return 'Unknown date range';

                                        // If the result contains a dash, it's a date range
                                        if (fullDateRange.includes(' - ')) {
                                            return `Photos taken between: ${fullDateRange}`;
                                        } else {
                                            return `All photos taken on: ${fullDateRange}`;
                                        }
                                    })()}
                                >
                                    {hoveredEventCard === event.id
                                        ? getFullDateRangeTitle(event.date_range_start, event.date_range_end)
                                        : formatDateRangeMonthOnly(event.date_range_start, event.date_range_end)
                                    }
                                </span>
                            )}
                        </div>
                        <div className={styles.eventMetaRight}>
                            <span
                                className={styles.eventUpdated}
                                title={`Updated: ${getFullDateTitle(event.updated_at)}`}
                            >
                                {hoveredEventCard === event.id
                                    ? `Updated ${getFullDateTitle(event.updated_at)}`
                                    : `Updated ${formatDateMonthOnly(event.updated_at)}`
                                }
                            </span>
                        </div>
                    </div>
                </div>

                {/* Options Menu */}
                {openOptionsMenu === event.id && (
                    <div className={styles.eventOptionsMenu}>
                        <div className={styles.optionsMenuItem} onClick={(e) => {
                            e.stopPropagation();
                            handleOptionSelect('add-photos', event)
                        }}>
                            <span className={styles.optionIcon}>📸</span>
                            Add Photos
                        </div>
                        <div className={styles.optionsMenuItem} onClick={(e) => {
                            e.stopPropagation();
                            handleOptionSelect('add-people', event)
                        }}>
                            <span className={styles.optionIcon}>👥</span>
                            Add People
                        </div>
                        <div className={styles.optionsMenuItem} onClick={(e) => {
                            e.stopPropagation();
                            handleOptionSelect('share', event)
                        }}>
                            <span className={styles.optionIcon}>📤</span>
                            Share
                        </div>
                        <div className={styles.optionsMenuItem} onClick={(e) => {
                            e.stopPropagation();
                            handleOptionSelect('edit', event)
                        }}>
                            <span className={styles.optionIcon}>✏️</span>
                            Edit
                        </div>
                        <div className={styles.optionsMenuItem} onClick={(e) => {
                            e.stopPropagation();
                            handleOptionSelect('leave', event)
                        }}>
                            <span className={styles.optionIcon}>🚪</span>
                            Leave Event
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Render event card with photo previews
    const renderEventCard = (event: Event, index?: number) => {
        // Get up to 10 photos for preview (1 large + 4 small in grid, more in list)
        const previewPhotos = event.preview_photos?.slice(0, 10) || [];
        const totalPhotoCount = event.photo_count || 0;

        return (
            <div key={event.id} className={`${styles.eventCard} ${viewMode === 'list' ? styles.eventListItem : ''}`}
                onClick={() => {
                    handleEventCardSelection(event.id);
                    handleOpenGridPhotoView(event);
                }}
                onMouseEnter={() => setHoveredEventCard(event.id)}
                onMouseLeave={() => setHoveredEventCard(null)}
                style={{
                    cursor: 'pointer',
                    zIndex: viewMode === 'list' && index !== undefined ? filteredAndSortedEvents.length - index : 1
                }}>
                {/* Event Header */}
                <div className={styles.eventHeader}>
                    <div className={styles.eventTitleSection}>
                        <h3
                            className={`${styles.eventTitle} clickable-title`}
                            onClick={() => {
                                handleEventCardSelection(event.id);
                                handleOpenGridPhotoView(event);
                            }}
                        >
                            {event.title}
                        </h3>
                    </div>
                    <div className={styles.eventMeta}>
                        <button
                            className={styles.eventOptionsButton}
                            onClick={(e) => handleOptionsClick(e, event.id)}
                        >
                            <span>⋯</span>
                        </button>
                    </div>
                </div>

                {/* Event Photo Preview */}
                <div className={styles.eventPhotosPreview}>
                    {previewPhotos.length > 0 ? (
                        viewMode === 'list' ? (
                            // List view: single row of photos
                            <div className={styles.photoRow} ref={photoRowRef}>
                                {previewPhotos.slice(0, maxPhotosInRow).map((photo, index) => (
                                    <div
                                        key={index}
                                        className={styles.rowPhoto}
                                        onClick={(e) => {
                                            handleEventCardSelection(event.id);
                                            handleOpenPhotoDetails(e, photo, event);
                                        }}
                                    >
                                        <img
                                            src={getPhotoUrl(photo)}
                                            alt="Event photo"
                                            onError={(e) => {
                                                e.currentTarget.src = DEFAULT_EVENT_PLACEHOLDER;
                                            }}
                                        />
                                        {/* Show "more" overlay logic */}
                                        {((index === 9 && maxPhotosInRow >= 10 && totalPhotoCount > 10) ||
                                            (index === maxPhotosInRow - 1 && maxPhotosInRow < 10 && totalPhotoCount > maxPhotosInRow)) && (
                                                <div
                                                    className={styles.morePhotosOverlay}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEventCardSelection(event.id);
                                                        handleOpenGridPhotoView(event);
                                                    }}
                                                >
                                                    <span>+{totalPhotoCount - Math.min(maxPhotosInRow, 10)}</span>
                                                </div>
                                            )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            // Grid view: existing layout
                            <div className={styles.photoGrid}>
                                {/* Large photo on the left */}
                                {previewPhotos[0] && (
                                    <div
                                        className={styles.largePhoto}
                                        onClick={(e) => {
                                            handleEventCardSelection(event.id);
                                            handleOpenPhotoDetails(e, previewPhotos[0], event);
                                        }}
                                    >
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
                                <div className={styles.smallPhotosGrid}>
                                    <div className={styles.topRow}>
                                        {previewPhotos[1] && (
                                            <div
                                                className={styles.smallPhoto}
                                                onClick={(e) => {
                                                    handleEventCardSelection(event.id);
                                                    handleOpenPhotoDetails(e, previewPhotos[1], event);
                                                }}
                                            >
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
                                            <div
                                                className={styles.smallPhoto}
                                                onClick={(e) => {
                                                    handleEventCardSelection(event.id);
                                                    handleOpenPhotoDetails(e, previewPhotos[2], event);
                                                }}
                                            >
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
                                    <div className={styles.bottomRow}>
                                        {previewPhotos[3] && (
                                            <div
                                                className={styles.smallPhoto}
                                                onClick={(e) => {
                                                    handleEventCardSelection(event.id);
                                                    handleOpenPhotoDetails(e, previewPhotos[3], event);
                                                }}
                                            >
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
                                            <div
                                                className={styles.smallPhoto}
                                                onClick={(e) => {
                                                    handleEventCardSelection(event.id);
                                                    handleOpenPhotoDetails(e, previewPhotos[4], event);
                                                }}
                                            >
                                                <img
                                                    src={getPhotoUrl(previewPhotos[4])}
                                                    alt="Event photo"
                                                    onError={(e) => {
                                                        e.currentTarget.src = DEFAULT_EVENT_PLACEHOLDER;
                                                    }}
                                                />
                                                {/* Show "more" overlay if there are more than 5 photos (since grid shows 5) */}
                                                {totalPhotoCount > 5 && (
                                                    <div
                                                        className={styles.morePhotosOverlay}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEventCardSelection(event.id);
                                                            handleOpenGridPhotoView(event);
                                                        }}
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
                        <div className={styles.emptyEventPhotos}>
                            <div className={styles.emptyPhotosPlaceholder}>
                                <div className={styles.placeholderIcon}>📷</div>
                                <p>No photos yet</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Event Footer */}
                <div className={styles.eventFooter}>
                    {/* Top Row - Additional Members and Source Pocket */}
                    <div className={styles.eventFooterTopRow}>
                        <div className={styles.eventMembers}>
                            {event.additional_members && event.additional_members.length > 0 ? (
                                <>
                                    <span className={styles.memberCount}>
                                        {event.additional_members.length} guest{event.additional_members.length !== 1 ? 's' : ''}
                                    </span>
                                    <div className={styles.memberAvatars}>
                                        {event.additional_members.slice(0, 3).map((member) => (
                                            <div
                                                key={member.id}
                                                className={`${styles.memberAvatar} ${styles.memberAvatarClickable}`}
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Prevent event card click
                                                    handleEventCardSelection(event.id);
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
                                        {event.additional_members.length > 3 && (
                                            <span
                                                className={`${styles.moreMembers} ${styles.moreMembersClickable}`}
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Prevent event card click
                                                    handleEventCardSelection(event.id);
                                                    handleViewAllMembers(event);
                                                }}
                                                title={`View all ${event.additional_members.length} guests`}
                                            >
                                                +{event.additional_members.length - 3}
                                            </span>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <span className={styles.memberCount}>No guests</span>
                            )}
                        </div>

                        {/* Show source pocket if event is inherited */}
                        {event.inherited && event.source_pocket_id && (
                            <div className={styles.eventSourcePocket}>
                                <span className={styles.sourceLabel}>Inherited from:</span>
                                <span className={styles.sourcePocketName}>
                                    {getSourcePocket(event.source_pocket_id)?.pocket_title || 'Unknown Pocket'}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Bottom Row - Photo Count, Date Range, and Updated Date */}
                    <div className={styles.eventFooterBottomRow}>
                        <div className={styles.eventMetaLeft}>
                            <span className={styles.eventPhotoCount}>{totalPhotoCount} photos</span>
                            {formatDateRangeMonthOnly(event.date_range_start, event.date_range_end) && (
                                <span
                                    className={styles.eventDateRange}
                                    title={(() => {
                                        const fullDateRange = getFullDateRangeTitle(event.date_range_start, event.date_range_end);
                                        if (!fullDateRange) return 'Unknown date range';

                                        // If the result contains a dash, it's a date range
                                        if (fullDateRange.includes(' - ')) {
                                            return `Photos taken between: ${fullDateRange}`;
                                        } else {
                                            return `All photos taken on: ${fullDateRange}`;
                                        }
                                    })()}
                                >
                                    {hoveredEventCard === event.id
                                        ? getFullDateRangeTitle(event.date_range_start, event.date_range_end)
                                        : formatDateRangeMonthOnly(event.date_range_start, event.date_range_end)
                                    }
                                </span>
                            )}
                        </div>
                        <div className={styles.eventMetaRight}>
                            <span
                                className={styles.eventUpdated}
                                title={`Updated: ${getFullDateTitle(event.updated_at)}`}
                            >
                                {hoveredEventCard === event.id
                                    ? `Updated ${getFullDateTitle(event.updated_at)}`
                                    : `Updated ${formatDateMonthOnly(event.updated_at)}`
                                }
                            </span>
                        </div>
                    </div>
                </div>

                {/* Options Menu */}
                {openOptionsMenu === event.id && (
                    <div className={styles.eventOptionsMenu}>
                        <div className={styles.optionsMenuItem} onClick={(e) => {
                            e.stopPropagation();
                            handleOptionSelect('add-photos', event)
                        }}>
                            <span className={styles.optionIcon}>📸</span>
                            Add Photos
                        </div>
                        <div className={styles.optionsMenuItem} onClick={(e) => {
                            e.stopPropagation();
                            handleOptionSelect('add-people', event)
                        }}>
                            <span className={styles.optionIcon}>👥</span>
                            Add People
                        </div>
                        <div className={styles.optionsMenuItem} onClick={(e) => {
                            e.stopPropagation();
                            handleOptionSelect('share', event)
                        }}>
                            <span className={styles.optionIcon}>📤</span>
                            Share
                        </div>
                        <div className={styles.optionsMenuItem} onClick={(e) => {
                            e.stopPropagation();
                            handleOptionSelect('edit', event)
                        }}>
                            <span className={styles.optionIcon}>✏️</span>
                            Edit
                        </div>
                        <div className={styles.optionsMenuItem} onClick={(e) => {
                            e.stopPropagation();
                            handleOptionSelect('leave', event)
                        }}>
                            <span className={styles.optionIcon}>🚪</span>
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
            <div className={styles.eventViewPage}>
                <NavBar />
                <main className={styles.mainContent}>
                    <div className={styles.loadingContainer}>
                        <div className={styles.loadingSpinner}></div>
                        <p>Loading events...</p>
                    </div>
                </main>
            </div>
        );
    }

    // Show error state
    if (error || !pocket) {
        return (
            <div className={styles.eventViewPage}>
                <NavBar />
                <main className={styles.mainContent}>
                    <div className={styles.errorContainer}>
                        <h2>Error Loading Events</h2>
                        <p>{typeof error === 'string' ? error : error?.message || 'Pocket not found'}</p>
                        <button onClick={handleBackToPockets} className={styles.retryButton}>
                            Back to Pockets
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className={styles.eventViewPage}>
            <NavBar />
            <main className={styles.mainContent} ref={mainContentRef}>
                {/* Header */}
                <header className={styles.eventViewHeader}>
                    <div className={styles.headerLeft}>
                        <div className={styles.backButtonSection}>
                            <button onClick={handleBackToPockets} className={styles.backButton}>
                                <span>←</span>
                            </button>
                            <div className={styles.pocketInfo}>
                                <div className={styles.pocketCoverAvatar}>
                                    <img
                                        src={getPocketCoverUrl(pocket)}
                                        alt={pocket.pocket_title}
                                        onError={(e) => {
                                            e.currentTarget.src = DEFAULT_EVENT_PLACEHOLDER;
                                        }}
                                    />
                                </div>
                                <h1 className={styles.pocketTitle}>{pocket.pocket_title}</h1>
                            </div>
                        </div>
                        <p>Events and photos in this pocket</p>
                    </div>
                    <div className={styles.headerRight}>
                        <button
                            className={styles.uploadButton}
                            onClick={() => setShowCreateModal(true)}
                        >
                            <span>+</span>
                            Create Event
                        </button>
                        <div className={styles.userMenu}>
                            <UserAvatar size="medium" clickable={true} />
                        </div>
                    </div>
                </header>

                {/* Controls */}
                <section className={styles.controlsSection}>
                    <div className={styles.controlsLeft}>
                        <div className={styles.searchBox}>
                            <input
                                type="text"
                                placeholder="Search events..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <span className={styles.searchIcon}>🔍</span>
                            {searchTerm.trim() && (
                                <button
                                    className={styles.clearSearchButton}
                                    onClick={() => setSearchTerm('')}
                                    type="button"
                                    aria-label="Clear search"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                        <div className={styles.inheritedToggle}>
                            <label className={styles.toggleLabel}>
                                <input
                                    type="checkbox"
                                    checked={hideInherited}
                                    onChange={(e) => handleHideInheritedChange(e.target.checked)}
                                />
                                <span className={styles.toggleSlider}></span>
                                <span className={styles.toggleText}>Hide Inherited</span>
                            </label>
                        </div>
                    </div>
                    <div className={styles.controlsRight}>
                        <div className={styles.viewToggle}>
                            <button
                                className={`${styles.viewButton} ${viewMode === 'grid' ? styles.active : ''}`}
                                onClick={() => handleViewModeChange('grid')}
                            >
                                <span>⊞</span>
                            </button>
                            <button
                                className={`${styles.viewButton} ${viewMode === 'list' ? styles.active : ''}`}
                                onClick={() => handleViewModeChange('list')}
                            >
                                <span>☰</span>
                            </button>
                        </div>
                        <div className={styles.filterDropdown}>
                            <select value={filter} onChange={(e) => handleFilterChange(e.target.value)}>
                                <option value="event-date-latest">Event Date (Latest First)</option>
                                <option value="event-date-earliest">Event Date (Earliest First)</option>
                                <option value="event-end-latest">Event End Date (Latest First)</option>
                                <option value="event-end-earliest">Event End Date (Earliest First)</option>
                                <option value="date-range-longest">Date Range (Longest First)</option>
                                <option value="date-range-shortest">Date Range (Shortest First)</option>
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
                <section className={styles.eventsSection}>
                    <div className={styles.eventsSectionHeader}>
                        <h2>
                            {searchTerm.trim() ? (
                                <>
                                    Search Results
                                    <span className={styles.searchResultsInfo}>
                                        {filteredAndSortedEvents.length} event{filteredAndSortedEvents.length !== 1 ? 's' : ''} found for "{searchTerm}"
                                        {hideInherited ? ' (inherited events hidden)' : ''}
                                    </span>
                                </>
                            ) : (
                                <>
                                    Events ({filteredAndSortedEvents.length})
                                    {hideInherited && (
                                        <span className={styles.filterInfo}> - inherited events hidden</span>
                                    )}
                                </>
                            )}
                        </h2>
                        {pocket?.pocket_members && pocket.pocket_members.length > 0 && (
                            <div className={styles.pocketMembersSection} onClick={handleViewAllPocketMembers}>
                                <span className={styles.pocketMembersLabel}>
                                    {pocket.pocket_members.length} member{pocket.pocket_members.length !== 1 ? 's' : ''}
                                </span>
                                <div className={styles.pocketMemberAvatars}>
                                    {pocket.pocket_members.slice(0, 5).map((member) => (
                                        <div
                                            key={member.id}
                                            className={`${styles.pocketMemberAvatar} ${styles.memberAvatarClickable}`}
                                            onClick={(e) => {
                                                e.stopPropagation(); // Prevent triggering the parent click
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
                                    {pocket.pocket_members.length > 5 && (
                                        <span className={styles.morePocketMembers}>
                                            +{pocket.pocket_members.length - 5}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Empty Events Subsection */}
                    {(() => {
                        const emptyEvents = filteredAndSortedEvents.filter(event => (event.photo_count || 0) === 0);

                        // Sort empty events by most recently updated
                        const sortedEmptyEvents = sortEvents(emptyEvents, 'newest-updated');

                        return emptyEvents.length > 0 ? (
                            <div className={`${styles.emptyEventsSubsection} ${isEmptyEventsCollapsed ? styles.collapsed : ''}`}>
                                <div className={styles.emptyEventsHeader}>
                                    <h3
                                        className={styles.emptyEventsTitle}
                                        onClick={handleEmptyEventsToggle}
                                        title={isEmptyEventsCollapsed ? "Click to expand empty events" : "Click to collapse empty events"}
                                    >
                                        Empty Events ({emptyEvents.length})
                                    </h3>
                                    <button
                                        className={styles.collapseButton}
                                        onClick={handleEmptyEventsToggle}
                                        title={isEmptyEventsCollapsed ? "Expand empty events" : "Collapse empty events"}
                                    >
                                        <span>
                                            {isEmptyEventsCollapsed ? '▼' : '▲'}
                                        </span>
                                    </button>
                                </div>
                                {!isEmptyEventsCollapsed && (
                                    <div className={`${styles.eventsList} ${viewMode === 'list' ? styles.eventsListView : styles.eventsGridView}`}>
                                        {sortedEmptyEvents.map((event, index) => (
                                            <div
                                                key={event.id}
                                                ref={(el) => {
                                                    eventCardRefs.current[event.id] = el;
                                                }}
                                                onClick={() => handleEventCardSelection(event.id)}
                                            >
                                                {renderEmptyEventCard(event, index)}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : null;
                    })()}
                    {events.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyStateContent}>
                                <h3>Start your first event</h3>
                                <p>Events help you organize photos by specific occasions, trips, or moments. Create your first event to start capturing memories!</p>
                            </div>
                            <div
                                className={styles.emptyStateCta}
                                onClick={() => setShowCreateModal(true)}
                            >
                                <div className={styles.ctaContent}>
                                    <div className={styles.ctaIcon}>✨</div>
                                    <div className={styles.ctaText}>
                                        <span className={styles.ctaTitle}>Create Your First Event</span>
                                        <span className={styles.ctaSubtitle}>Click here to get started</span>
                                    </div>
                                </div>
                                <div className={styles.ctaArrow}>→</div>
                            </div>
                        </div>
                    ) : filteredAndSortedEvents.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={`${styles.emptyStateIcon} ${styles.searchIcon}`}>
                                <div className={styles.searchGlass}>
                                    <div className={styles.magnifyingGlass}>
                                        <div className={styles.glassCircle}></div>
                                        <div className={styles.glassHandle}></div>
                                    </div>
                                </div>
                            </div>
                            <div className={styles.emptyStateContent}>
                                <h3>No events found</h3>
                                <p>No events match "{searchTerm}". Try a different search term or check your spelling.</p>
                            </div>
                        </div>
                    ) : (
                        <div className={`${styles.eventsList} ${viewMode === 'list' ? styles.eventsListView : styles.eventsGridView}`}>
                            {filteredAndSortedEvents.filter(event => (event.photo_count || 0) > 0).map((event, index) => (
                                <div
                                    key={event.id}
                                    ref={(el) => {
                                        eventCardRefs.current[event.id] = el;
                                    }}
                                    onClick={() => handleEventCardSelection(event.id)}
                                >
                                    {renderEventCard(event, index)}
                                </div>
                            ))}
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

            {/* Members Modal */}
            {showMembersModal && selectedEventForMembers && (
                <MembersModal
                    isOpen={showMembersModal}
                    onClose={() => setShowMembersModal(false)}
                    title={
                        selectedEventForMembers.id === 'pocket-members'
                            ? `${selectedEventForMembers.title} Members`
                            : `${selectedEventForMembers.title}`
                    }
                    members={
                        selectedEventForMembers.id === 'pocket-members'
                            ? (pocket?.pocket_members || [])
                            : (selectedEventForMembers.additional_members || [])
                    }
                />
            )}

        </div >
    );
};

export default EventView;
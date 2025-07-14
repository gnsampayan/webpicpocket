import type { Photo } from '../types';

// Load initial state from localStorage
export const getInitialSortFilter = (): string => {
    const saved = localStorage.getItem('photos-sort-filter');
    return saved || 'newest-created';
};

// Save sort filter to localStorage
export const saveSortFilter = (filterValue: string) => {
    localStorage.setItem('photos-sort-filter', filterValue);
};

// Helper function to sort photos based on filter
export const sortPhotos = (photosToSort: Photo[], sortFilter: string): Photo[] => {
    const sorted = [...photosToSort];

    switch (sortFilter) {
        case 'newest-created':
            return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        case 'oldest-created':
            return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        case 'newest-updated':
            return sorted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        case 'oldest-updated':
            return sorted.sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
        case 'comment-high-low':
            return sorted.sort((a, b) => b.comment_count - a.comment_count);
        case 'comment-low-high':
            return sorted.sort((a, b) => a.comment_count - b.comment_count);
        default:
            return sorted;
    }
};

// Get the current sort filter
export const getCurrentSortFilter = (): string => {
    return getInitialSortFilter();
}; 
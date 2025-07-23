import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import type { ContactUser } from "../types/api";

// Query keys for better cache management
export const contactKeys = {
	all: ["contacts"] as const,
	lists: () => [...contactKeys.all, "list"] as const,
	list: (filters: string) => [...contactKeys.lists(), { filters }] as const,
	details: () => [...contactKeys.all, "detail"] as const,
	detail: (id: string) => [...contactKeys.details(), id] as const,
	search: (query: string) => [...contactKeys.all, "search", query] as const,
	requests: () => [...contactKeys.all, "requests"] as const,
	sent: () => [...contactKeys.all, "sent"] as const,
};

// Hook to fetch all contacts data
export const useContacts = () => {
	return useQuery({
		queryKey: contactKeys.lists(),
		queryFn: () => api.getContacts(),
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
		refetchOnWindowFocus: false,
		refetchOnReconnect: true,
	});
};

// Hook to search users
export const useSearchUsers = (query: string) => {
	return useQuery({
		queryKey: contactKeys.search(query),
		queryFn: () => api.searchUsers(query),
		enabled: !!query.trim(),
		staleTime: 2 * 60 * 1000, // 2 minutes
		gcTime: 5 * 60 * 1000, // 5 minutes
		refetchOnWindowFocus: false,
		refetchOnReconnect: true,
	});
};

// Hook for accepting contact requests
export const useAcceptContactMutation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (userId: string) => {
			return api.updateContact(userId, { accept: true });
		},
		onSuccess: () => {
			// Invalidate and refetch contacts
			queryClient.invalidateQueries({ queryKey: contactKeys.all });
		},
		onError: (error) => {
			console.error("Failed to accept contact:", error);
		},
	});
};

// Hook for rejecting contact requests
export const useRejectContactMutation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (userId: string) => {
			return api.updateContact(userId, { reject: true });
		},
		onSuccess: () => {
			// Invalidate and refetch contacts
			queryClient.invalidateQueries({ queryKey: contactKeys.all });
		},
		onError: (error) => {
			console.error("Failed to reject contact:", error);
		},
	});
};

// Hook for canceling sent contact requests
export const useCancelContactMutation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (userId: string) => {
			return api.updateContact(userId, { cancel: true });
		},
		onSuccess: () => {
			// Invalidate and refetch contacts
			queryClient.invalidateQueries({ queryKey: contactKeys.all });
		},
		onError: (error) => {
			console.error("Failed to cancel contact:", error);
		},
	});
};

// Hook for deleting contacts
export const useDeleteContactMutation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (userId: string) => {
			return api.deleteContact(userId);
		},
		onSuccess: () => {
			// Invalidate and refetch contacts
			queryClient.invalidateQueries({ queryKey: contactKeys.all });
		},
		onError: (error) => {
			console.error("Failed to delete contact:", error);
		},
	});
};

// Hook for sending contact requests
export const useSendContactRequestMutation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (userId: string) => {
			return api.sendContactRequest(userId);
		},
		onSuccess: () => {
			// Invalidate and refetch contacts
			queryClient.invalidateQueries({ queryKey: contactKeys.all });
			// Clear search results
			queryClient.removeQueries({ queryKey: contactKeys.search("") });
		},
		onError: (error) => {
			console.error("Failed to send contact request:", error);
		},
	});
};

// Hook for creating placeholder contacts
export const useCreatePlaceholderMutation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: {
			first_name: string;
			last_name: string;
			description?: string;
			profile_object_key?: string;
		}) => {
			return api.createPlaceholder(data);
		},
		onSuccess: () => {
			// Invalidate and refetch contacts to show the new placeholder
			queryClient.invalidateQueries({ queryKey: contactKeys.all });
		},
		onError: (error) => {
			console.error("Failed to create placeholder:", error);
		},
	});
};

// Helper function to get contact avatar
export const getContactAvatar = (
	contact: ContactUser,
	preferredSize?: "small" | "medium" | "large"
): string => {
	const DEFAULT_PROFILE_PLACEHOLDER =
		"data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjUiIGN5PSIyNSIgcj0iMjUiIGZpbGw9IiM2NjdlZWEiLz4KPGNpcmNsZSBjeD0iMjUiIGN5PSIyMCIgcj0iOCIgZmlsbD0iI2ZmZmZmZiIgZmlsbC1vcGFjaXR5PSIwLjgiLz4KPHBhdGggZD0iTTEwIDQwQzEwIDM1IDE1IDMwIDI1IDMwQzM1IDMwIDQwIDM1IDQwIDQwIiBmaWxsPSIjZmZmZmZmIiBmaWxsLW9wYWNpdHk9IjAuOCIvPgo8L3N2Zz4K";

	// If user has default profile picture, use placeholder
	if (contact.profile_picture_default) {
		return DEFAULT_PROFILE_PLACEHOLDER;
	}

	// Handle profile picture object with different sizes
	if (contact.profile_picture) {
		let rawUrl: string | undefined;

		if (preferredSize) {
			// Use the specified preferred size
			switch (preferredSize) {
				case "large":
					rawUrl =
						contact.profile_picture.url_large ||
						contact.profile_picture.url_medium ||
						contact.profile_picture.url_small;
					break;
				case "medium":
					rawUrl =
						contact.profile_picture.url_medium ||
						contact.profile_picture.url_large ||
						contact.profile_picture.url_small;
					break;
				case "small":
					rawUrl =
						contact.profile_picture.url_small ||
						contact.profile_picture.url_medium ||
						contact.profile_picture.url_large;
					break;
			}
		} else {
			// Default behavior: prioritize small to large
			rawUrl =
				contact.profile_picture.url_small ||
				contact.profile_picture.url_medium ||
				contact.profile_picture.url_large;
		}

		if (!rawUrl) {
			return DEFAULT_PROFILE_PLACEHOLDER;
		}

		// Ensure URL is HTTPS
		if (rawUrl.startsWith("http://")) {
			return rawUrl.replace("http://", "https://");
		}

		// If it's already HTTPS, return as-is
		if (rawUrl.startsWith("https://")) {
			return rawUrl;
		}

		// If it doesn't start with http, add https:// (fallback)
		return `https://${rawUrl}`;
	}

	// Fallback to placeholder
	return DEFAULT_PROFILE_PLACEHOLDER;
};

// Helper function to get contact name
export const getContactName = (contact: ContactUser) => {
	return `${contact.first_name} ${contact.last_name}`;
};

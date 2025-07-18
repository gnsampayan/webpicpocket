/**
 * User-related React Query hooks
 * 
 * This file contains hooks for fetching public user information and other user-related data
 * that doesn't necessarily relate to the current user's contacts.
 * 
 */

import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";

// Query keys for user-related queries
export const userKeys = {
	all: ["users"] as const,
	public: () => [...userKeys.all, "public"] as const,
	publicUser: (userId: string) => [...userKeys.public(), userId] as const,
};

/**
 * Hook to get public user information by user ID
 * 
 * This hook fetches publicly available user information for any user,
 * not just contacts. Useful for displaying user profiles, member lists, etc.
 * 
 * @param userId - The ID of the user to fetch information for
 * @returns React Query result with PublicUserInfo data
 */
export const usePublicUserInfo = (userId: string) => {
	return useQuery({
		queryKey: userKeys.publicUser(userId),
		queryFn: () => api.getPublicUserInfo(userId),
		enabled: !!userId,
		staleTime: 10 * 60 * 1000, // 10 minutes (public info changes less frequently)
		gcTime: 30 * 60 * 1000, // 30 minutes
		refetchOnWindowFocus: false,
		refetchOnReconnect: true,
	});
}; 
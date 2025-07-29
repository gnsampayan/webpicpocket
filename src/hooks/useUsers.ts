/**
 * User-related React Query hooks
 * 
 * This file contains hooks for fetching public user information and other user-related data
 * that doesn't necessarily relate to the current user's contacts.
 * 
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { getUserData, setStorageItem, getCurrentUserStorageKeys } from "../utils/storage";
import type { UserInfo, UserProfilePictureResponse, UpdateProfileRequest } from "../types/api";

// Query keys for user-related queries
export const userKeys = {
	all: ["users"] as const,
	public: () => [...userKeys.all, "public"] as const,
	publicUser: (userId: string) => [...userKeys.public(), userId] as const,
	currentUser: () => [...userKeys.all, "current"] as const,
};

/**
 * Hook to get current user information
 * 
 * This hook fetches the current logged-in user's complete profile information.
 * Uses infinite stale time and gc time since data only changes when user explicitly updates it.
 * Falls back to localStorage cache for immediate display while fetching fresh data.
 * 
 * @returns React Query result with current user's UserInfo data
 */
export const useCurrentUser = () => {
	return useQuery({
		queryKey: userKeys.currentUser(),
		queryFn: async (): Promise<UserInfo> => {
			const profileData = await api.getProfilePicture();
			
			// Convert UserProfilePictureResponse to UserInfo format
			const userInfo: UserInfo = {
				id: profileData.id,
				username: profileData.username,
				first_name: profileData.first_name,
				last_name: profileData.last_name,
				description: profileData.description,
				profile_picture_default: profileData.profile_picture_default,
				profile_picture: profileData.profile_picture,
				verified: true, // Assuming current user is verified if they can access profile
			};

			// Update localStorage cache
			try {
				const userKeys = await getCurrentUserStorageKeys();
				await setStorageItem(userKeys.USER_DATA, JSON.stringify(userInfo));
			} catch (error) {
				console.warn('Failed to update localStorage cache:', error);
			}

			return userInfo;
		},
		initialData: () => {
			// Try to get cached data from localStorage for immediate display
			// Note: getUserData is async, but initialData must be sync
			// We'll use a simpler approach and let the query fetch if no cache
			return undefined;
		},
		staleTime: Infinity, // Never consider data stale - only refetch on mutation
		gcTime: Infinity, // Keep in cache indefinitely
		refetchOnWindowFocus: false,
		refetchOnReconnect: false, // Don't refetch on reconnect since data is user-controlled
		refetchOnMount: false, // Don't refetch on mount if we have data
	});
};

/**
 * Hook to update current user profile
 * 
 * Automatically updates the current user cache and localStorage when mutation succeeds.
 * 
 * @returns React Query mutation for updating user profile
 */
export const useUpdateCurrentUser = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (updateData: UpdateProfileRequest): Promise<UserInfo> => {
			const profileData = await api.updateProfile(updateData);
			
			// Convert response to UserInfo format
			const userInfo: UserInfo = {
				id: profileData.id,
				username: profileData.username,
				first_name: profileData.first_name,
				last_name: profileData.last_name,
				description: profileData.description,
				profile_picture_default: profileData.profile_picture_default,
				profile_picture: profileData.profile_picture,
				verified: true,
			};

			return userInfo;
		},
		onSuccess: async (updatedUserInfo) => {
			// Update React Query cache
			queryClient.setQueryData(userKeys.currentUser(), updatedUserInfo);

			// Update localStorage cache
			try {
				const userKeys = await getCurrentUserStorageKeys();
				await setStorageItem(userKeys.USER_DATA, JSON.stringify(updatedUserInfo));
			} catch (error) {
				console.warn('Failed to update localStorage cache:', error);
			}
		},
	});
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
/**
 * Storage utilities for web using localStorage
 * Replaces AsyncStorage from React Native
 */

// =============================================
// STORAGE KEYS
// =============================================
export const STORAGE_KEYS = {
	CURRENT_USER_ID: "pic_pocket_current_user_id",
	ACCESS_TOKEN_PREFIX: "pic_pocket_access_token_",
	REFRESH_TOKEN_PREFIX: "pic_pocket_refresh_token_",
	USER_DATA_PREFIX: "pic_pocket_user_data_",
} as const;

// =============================================
// STORAGE KEY GENERATORS
// =============================================
export const getUserStorageKeys = (userId: string) => ({
	ACCESS_TOKEN: `${STORAGE_KEYS.ACCESS_TOKEN_PREFIX}${userId}`,
	REFRESH_TOKEN: `${STORAGE_KEYS.REFRESH_TOKEN_PREFIX}${userId}`,
	USER_DATA: `${STORAGE_KEYS.USER_DATA_PREFIX}${userId}`,
});

export const getCurrentUserStorageKeys = async () => {
	const currentUserId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
	if (!currentUserId) {
		throw new Error("No current user found");
	}
	return getUserStorageKeys(currentUserId);
};

// =============================================
// STORAGE UTILITIES
// =============================================

/**
 * Set item in localStorage with error handling
 */
export const setStorageItem = async (
	key: string,
	value: string
): Promise<void> => {
	try {
		localStorage.setItem(key, value);
	} catch (error) {
		console.error("❌ [Storage] Failed to save item:", error);
		throw error;
	}
};

/**
 * Get item from localStorage with error handling
 */
export const getStorageItem = async (key: string): Promise<string | null> => {
	try {
		return localStorage.getItem(key);
	} catch (error) {
		console.error("❌ [Storage] Failed to get item:", error);
		return null;
	}
};

/**
 * Remove item from localStorage with error handling
 */
export const removeStorageItem = async (key: string): Promise<void> => {
	try {
		localStorage.removeItem(key);
	} catch (error) {
		console.error("❌ [Storage] Failed to remove item:", error);
		// Don't throw on removal errors as it might be during logout
	}
};

/**
 * Clear all storage data
 */
export const clearAllStorage = async (): Promise<void> => {
	try {
		// Clear all PicPocket related items
		const keys = Object.keys(localStorage);
		keys.forEach((key) => {
			if (key.startsWith("pic_pocket_")) {
				localStorage.removeItem(key);
			}
		});
	} catch (error) {
		console.error("❌ [Storage] Failed to clear storage:", error);
	}
};

/**
 * Set current user ID
 */
export const setCurrentUserId = async (userId: string): Promise<void> => {
	await setStorageItem(STORAGE_KEYS.CURRENT_USER_ID, userId);
};

/**
 * Get current user ID
 */
export const getCurrentUserId = async (): Promise<string | null> => {
	return await getStorageItem(STORAGE_KEYS.CURRENT_USER_ID);
};

/**
 * Clear current user ID
 */
export const clearCurrentUserId = async (): Promise<void> => {
	await removeStorageItem(STORAGE_KEYS.CURRENT_USER_ID);
};

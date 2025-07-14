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
	REMEMBER_ME: "pic_pocket_remember_me",
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
	const currentUserId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID) || 
	                     sessionStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
	if (!currentUserId) {
		throw new Error("No current user found");
	}
	return getUserStorageKeys(currentUserId);
};

// =============================================
// REMEMBER ME UTILITIES
// =============================================

/**
 * Get the appropriate storage object based on remember me setting
 */
const getStorage = (usePersistentStorage: boolean = false) => {
	return usePersistentStorage ? localStorage : sessionStorage;
};

/**
 * Set remember me preference
 */
export const setRememberMe = async (rememberMe: boolean): Promise<void> => {
	await setStorageItem(STORAGE_KEYS.REMEMBER_ME, rememberMe.toString());
};

/**
 * Get remember me preference
 */
export const getRememberMe = async (): Promise<boolean> => {
	const rememberMe = await getStorageItem(STORAGE_KEYS.REMEMBER_ME);
	return rememberMe === 'true';
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
 * Set item in storage (localStorage or sessionStorage) based on remember me setting
 */
export const setStorageItemWithRememberMe = async (
	key: string,
	value: string,
	rememberMe: boolean = false
): Promise<void> => {
	try {
		const storage = getStorage(rememberMe);
		storage.setItem(key, value);
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
 * Get item from storage (localStorage or sessionStorage) with fallback
 */
export const getStorageItemWithFallback = async (key: string): Promise<string | null> => {
	try {
		// Try localStorage first
		let value = localStorage.getItem(key);
		if (value !== null) {
			return value;
		}
		// Fallback to sessionStorage
		return sessionStorage.getItem(key);
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
		sessionStorage.removeItem(key); // Also remove from sessionStorage for cleanup
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
		// Clear all PicPocket related items from both storages
		const localStorageKeys = Object.keys(localStorage);
		const sessionStorageKeys = Object.keys(sessionStorage);
		
		[...localStorageKeys, ...sessionStorageKeys].forEach((key) => {
			if (key.startsWith("pic_pocket_")) {
				localStorage.removeItem(key);
				sessionStorage.removeItem(key);
			}
		});
	} catch (error) {
		console.error("❌ [Storage] Failed to clear storage:", error);
	}
};

/**
 * Set current user ID
 */
export const setCurrentUserId = async (userId: string, rememberMe: boolean = false): Promise<void> => {
	await setStorageItemWithRememberMe(STORAGE_KEYS.CURRENT_USER_ID, userId, rememberMe);
};

/**
 * Get current user ID
 */
export const getCurrentUserId = async (): Promise<string | null> => {
	return await getStorageItemWithFallback(STORAGE_KEYS.CURRENT_USER_ID);
};

/**
 * Clear current user ID
 */
export const clearCurrentUserId = async (): Promise<void> => {
	await removeStorageItem(STORAGE_KEYS.CURRENT_USER_ID);
};

/**
 * Get current user data
 */
export const getUserData = async (): Promise<any | null> => {
	try {
		const userKeys = await getCurrentUserStorageKeys();
		const userDataString = await getStorageItemWithFallback(userKeys.USER_DATA);
		
		if (!userDataString) {
			return null;
		}

		return JSON.parse(userDataString);
	} catch (error) {
		console.error("❌ [Storage] Failed to get user data:", error);
		return null;
	}
};

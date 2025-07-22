import { getCurrentUserId } from "./storage";
import { clearAllStorage } from "./storage";
import {
	clearAccessToken,
	clearRefreshToken,
	clearUserData,
	api,
} from "../services/api";

/**
 * Attempts to automatically authenticate user using stored tokens
 * Returns true if authentication successful, false otherwise
 * @returns Promise<boolean> - true if authenticated successfully
 */
export const attemptAutoAuthentication = async (): Promise<boolean> => {
	try {
		console.log("🔐 [Auth] Attempting auto-authentication...");

		// First check if we have a current user ID
		const userId = await getCurrentUserId();
		if (!userId) {
			console.log("🔒 [Auth] No user ID found in storage");
			return false;
		}

		console.log("🔍 [Auth] User ID found, checking tokens...");

		// Try to make an authenticated request to validate tokens
		// Using profile endpoint as a lightweight test
		try {
			await api.getProfilePicture();
			console.log(
				"✅ [Auth] Auto-authentication successful with existing tokens"
			);
			return true;
		} catch (error) {
			console.log(
				"⚠️ [Auth] Access token invalid, attempting token refresh..."
			);

			// Access token failed, try to refresh
			try {
				await api.refreshToken();
				console.log("✅ [Auth] Token refresh successful, re-validating...");

				// Try the authenticated request again with refreshed token
				await api.getProfilePicture();
				console.log(
					"✅ [Auth] Auto-authentication successful after token refresh"
				);
				return true;
			} catch (refreshError) {
				console.log("❌ [Auth] Token refresh failed:", refreshError);

				// Refresh failed, clear all stored data for security
				await Promise.all([
					clearAllStorage(),
					clearAccessToken(),
					clearRefreshToken(),
					clearUserData(),
				]);

				return false;
			}
		}
	} catch (error) {
		console.error("❌ [Auth] Error during auto-authentication:", error);
		return false;
	}
};

/**
 * Centralized logout function that clears all user data and redirects to login
 * @param redirectTo - Optional path to redirect to (defaults to /signin)
 */
export const logout = async (redirectTo: string = "/signin"): Promise<void> => {
	try {
		console.log("🚪 [Auth] Logging out user...");

		// Clear all user data and authentication tokens using both methods
		// for comprehensive cleanup
		await Promise.all([
			clearAllStorage(),
			clearAccessToken(),
			clearRefreshToken(),
			clearUserData(),
		]);

		console.log("✅ [Auth] User logged out successfully");

		// Redirect to the specified page
		window.location.href = redirectTo;
	} catch (error) {
		console.error("❌ [Auth] Error during logout:", error);

		// Even if there's an error, still redirect to login page
		// as the user wants to log out
		window.location.href = redirectTo;
	}
};

/**
 * Check if user is authenticated and redirect to login if not
 * @param navigate - React Router's navigate function
 * @returns Promise<boolean> - true if authenticated, false if redirected
 */
export const checkAuthAndRedirect = async (
	navigate: (path: string) => void
): Promise<boolean> => {
	try {
		const userId = await getCurrentUserId();

		if (!userId) {
			console.log("🔒 [Auth] No user found, redirecting to login");
			navigate("/signin");
			return false;
		}

		return true;
	} catch (error) {
		console.error("❌ [Auth] Error checking authentication:", error);
		console.log("🔒 [Auth] Authentication check failed, redirecting to login");
		navigate("/signin");
		return false;
	}
};

/**
 * Check if user is authenticated without redirecting
 * @returns Promise<boolean> - true if authenticated, false if not
 */
export const isAuthenticated = async (): Promise<boolean> => {
	try {
		const userId = await getCurrentUserId();
		return !!userId;
	} catch (error) {
		console.error("❌ [Auth] Error checking authentication:", error);
		return false;
	}
};

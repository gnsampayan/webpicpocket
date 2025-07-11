import { getCurrentUserId } from "./storage";
import { clearAllStorage } from "./storage";
import {
	clearAccessToken,
	clearRefreshToken,
	clearUserData,
} from "../services/api";

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

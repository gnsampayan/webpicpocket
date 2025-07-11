/**
 * Main API service for PicPocket Web
 * Adapted from mobile version for web compatibility
 */

import env from "../config/env";
import { API_CONFIG } from "../config/api";
import {
	getUserStorageKeys,
	getCurrentUserStorageKeys,
	setStorageItem,
	getStorageItem,
	removeStorageItem,
	setCurrentUserId,
} from "../utils/storage";
import {
	AUTH_ERRORS,
	AuthError,
	isEmailVerificationError,
} from "../utils/errors";
import * as ApiTypes from "../types/api";

const API_URL = env.API_URL;

// Token management
let currentAccessToken: string | null = null;
let refreshPromise: Promise<{
	access_token: string;
	refresh_token: string;
}> | null = null;

// =============================================
// TOKEN MANAGEMENT
// =============================================

// Access token management
const getAccessToken = async () => {
	if (!currentAccessToken) {
		try {
			const userKeys = await getCurrentUserStorageKeys();
			currentAccessToken = await getStorageItem(userKeys.ACCESS_TOKEN);
		} catch (error) {
			// No current user for token access, ignore error
			return null;
		}
	}
	return currentAccessToken;
};

const setAccessToken = async (token: string, userId?: string) => {
	currentAccessToken = token;
	try {
		const userKeys = userId
			? getUserStorageKeys(userId)
			: await getCurrentUserStorageKeys();
		await setStorageItem(userKeys.ACCESS_TOKEN, token);
	} catch (error) {
		console.error("❌ [API] Failed to save access token:", error);
	}
};

const clearAccessToken = async () => {
	currentAccessToken = null;
	try {
		const userKeys = await getCurrentUserStorageKeys();
		await removeStorageItem(userKeys.ACCESS_TOKEN);
	} catch (error) {
		// User might already be logged out, ignore error
		return null;
	}
};

// Refresh token management
const getRefreshToken = async () => {
	try {
		const userKeys = await getCurrentUserStorageKeys();
		return await getStorageItem(userKeys.REFRESH_TOKEN);
	} catch (error) {
		// No current user for refresh token access, ignore error
		return null;
	}
};

const setRefreshToken = async (token: string, userId?: string) => {
	try {
		const userKeys = userId
			? getUserStorageKeys(userId)
			: await getCurrentUserStorageKeys();
		await setStorageItem(userKeys.REFRESH_TOKEN, token);
	} catch (error) {
		console.error("❌ [API] Failed to save refresh token:", error);
	}
};

const clearRefreshToken = async () => {
	try {
		const userKeys = await getCurrentUserStorageKeys();
		await removeStorageItem(userKeys.REFRESH_TOKEN);
	} catch (error) {
		// User might already be logged out, ignore error
		return null;
	}
};

// User data management
const setUserData = async (data: string, userId?: string) => {
	try {
		const userKeys = userId
			? getUserStorageKeys(userId)
			: await getCurrentUserStorageKeys();
		await setStorageItem(userKeys.USER_DATA, data);
	} catch (error) {
		console.error("❌ [API] Failed to save user data:", error);
	}
};

const clearUserData = async () => {
	try {
		const userKeys = await getCurrentUserStorageKeys();
		await removeStorageItem(userKeys.USER_DATA);
	} catch (error) {
		// User might already be logged out, ignore error
		return null;
	}
};

// =============================================
// MAIN API OBJECT
// =============================================
export const api = {
	// =============================================
	// AUTHENTICATION FUNCTIONS
	// =============================================

	/**
	 * Registers a new user
	 */
	async register(
		data: ApiTypes.RegisterData
	): Promise<ApiTypes.RegisterResponse> {
		const url = `${API_URL}${API_CONFIG.endpoints.auth.register}`;
		try {
			const response = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(data),
			}).catch((error) => {
				console.error("❌ [API] Network error details:", {
					name: error.name,
					message: error.message,
					cause: error.cause,
				});
				throw error;
			});

			const responseText = await response.text();
			let responseData;
			try {
				responseData = JSON.parse(responseText);
			} catch (parseError) {
				console.error("❌ [API] Failed to parse response as JSON:", parseError);
				console.error("❌ [API] Response was:", responseText);
				throw new Error("Invalid response from server");
			}

			if (!response.ok) {
				console.error("❌ [API] Registration failed:", responseData);
				if (
					responseData.error?.toLowerCase().includes("email") &&
					responseData.error?.toLowerCase().includes("already")
				) {
					throw new Error(AUTH_ERRORS.EMAIL_ALREADY_REGISTERED);
				}
				throw new Error(
					responseData.error || responseData.message || "Registration failed"
				);
			}
			return responseData;
		} catch (error) {
			console.error("❌ [API] Registration error:", error);
			if (
				error instanceof TypeError &&
				error.message === "Network request failed"
			) {
				throw new Error(AUTH_ERRORS.NETWORK_ERROR);
			}
			throw error;
		}
	},

	/**
	 * Logs in a user
	 */
	async login(data: ApiTypes.LoginData): Promise<ApiTypes.LoginResponse> {
		const url = `${API_URL}${API_CONFIG.endpoints.auth.login}`;
		try {
			const response = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(data),
			}).catch((error) => {
				console.error("❌ [API] Network error details:", {
					name: error.name,
					message: error.message,
					cause: error.cause,
				});
				throw error;
			});

			const responseData = await response.json();
			if (!response.ok) {
				const error = responseData as ApiTypes.ApiError;
				console.error("❌ [API] Login failed:", error);
				throw new Error(error.error || "Login failed");
			}

			// Store tokens after successful login
			const userId = responseData.user_info.id;
			await setCurrentUserId(userId);
			await setAccessToken(responseData.access_token, userId);
			await setRefreshToken(responseData.refresh_token, userId);
			await setUserData(JSON.stringify(responseData.user_info), userId);
			return responseData;
		} catch (error) {
			console.error("❌ [API] Login error:", error);
			if (
				error instanceof TypeError &&
				error.message === "Network request failed"
			) {
				throw new Error(
					"Unable to connect to the server. Please check your internet connection and try again."
				);
			}
			throw error;
		}
	},

	/**
	 * Gets authentication headers for API requests
	 */
	async getAuthHeaders() {
		const accessToken = await getAccessToken();
		const refreshToken = await getRefreshToken();
		if (!accessToken || !refreshToken) {
			throw new Error("No authentication tokens found");
		}
		return {
			Authorization: `Bearer ${accessToken}`,
			"X-Refresh-Token": refreshToken,
		};
	},

	/**
	 * Refreshes the access token
	 */
	async refreshToken(): Promise<{
		access_token: string;
		refresh_token: string;
	}> {
		// If there's already a refresh in progress, wait for it
		if (refreshPromise) {
			console.log("🔄 [API] Token refresh already in progress, waiting...");
			try {
				return await refreshPromise;
			} catch (error) {
				// If the existing refresh failed, clear it and try again
				refreshPromise = null;
				throw error;
			}
		}

		const url = `${API_URL}${API_CONFIG.endpoints.auth.refresh}`;

		// Create and store the refresh promise
		refreshPromise = (async () => {
			try {
				const refreshToken = await getRefreshToken();
				if (!refreshToken) {
					throw new AuthError(
						"Refresh token is invalid",
						"refresh_token_invalid"
					);
				}

				console.log("🔄 [API] Starting token refresh...");
				const response = await fetch(url, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-Refresh-Token": refreshToken,
					},
				});

				if (response.status === 401 || response.status === 403) {
					console.error("❌ [API] Refresh token is invalid or expired");
					throw new AuthError(
						"Refresh token is invalid",
						"refresh_token_invalid"
					);
				}

				if (!response.ok) {
					console.error("❌ [API] Failed to refresh token:", {
						status: response.status,
						statusText: response.statusText,
					});
					throw new Error("Failed to refresh token");
				}

				const responseData = await response.json();

				// Store new tokens
				await setAccessToken(responseData.access_token);
				await setRefreshToken(responseData.refresh_token);

				console.log("✅ [API] Token refresh successful");
				return responseData;
			} catch (error) {
				if (error instanceof AuthError) {
					console.warn("⚠️ [API] Authentication required:", error.message);
				} else {
					console.error("❌ [API] Unexpected token refresh error:", error);
				}
				throw error;
			}
		})();

		try {
			const result = await refreshPromise;
			return result;
		} finally {
			// Clear the promise when done (success or failure)
			refreshPromise = null;
		}
	},

	/**
	 * Authenticated request wrapper
	 */
	async authenticatedRequest(url: string, options: RequestInit = {}) {
		try {
			const accessToken = await getAccessToken();
			if (!accessToken) {
				throw new AuthError(
					"Refresh token is invalid",
					"refresh_token_invalid"
				);
			}
			const response = await fetch(url, {
				...options,
				headers: {
					...options.headers,
					Authorization: `Bearer ${accessToken}`,
				},
			});

			// Handle email verification errors (403 status)
			if (response.status === 403) {
				const responseText = await response.text();
				let errorData;
				try {
					errorData = JSON.parse(responseText);
				} catch (e) {
					errorData = { error: responseText };
				}

				const errorMessage = errorData.error || responseText;
				if (
					typeof errorMessage === "string" &&
					errorMessage.toLowerCase().includes("e-mail not verified")
				) {
					console.warn("⚠️ [API] Email verification required");
					const error = new AuthError(
						AUTH_ERRORS.EMAIL_NOT_VERIFIED,
						"email_not_verified"
					);
					throw error;
				}

				console.error("❌ [API] Forbidden:", {
					status: response.status,
					error: errorMessage,
				});
				throw new Error(errorMessage || "Access forbidden");
			}

			// Handle token expiration (401 status)
			if (response.status === 401) {
				console.warn("⚠️ [API] Access token expired, attempting refresh...");
				try {
					const { access_token } = await this.refreshToken();
					await setAccessToken(access_token);

					// Retry the request with new token
					const retryResponse = await fetch(url, {
						...options,
						headers: {
							...options.headers,
							Authorization: `Bearer ${access_token}`,
						},
					});

					// Handle email verification on retry
					if (retryResponse.status === 403) {
						const retryResponseText = await retryResponse.text();
						let retryErrorData;
						try {
							retryErrorData = JSON.parse(retryResponseText);
						} catch (e) {
							retryErrorData = { error: retryResponseText };
						}

						const retryErrorMessage = retryErrorData.error || retryResponseText;
						if (
							typeof retryErrorMessage === "string" &&
							retryErrorMessage.toLowerCase().includes("e-mail not verified")
						) {
							console.warn(
								"⚠️ [API] Email verification required after token refresh"
							);
							const error = new AuthError(
								AUTH_ERRORS.EMAIL_NOT_VERIFIED,
								"email_not_verified"
							);
							throw error;
						}
					}

					return retryResponse;
				} catch (refreshError) {
					if (isEmailVerificationError(refreshError)) {
						throw refreshError;
					}
					if (
						refreshError instanceof Error &&
						(refreshError.message === "REFRESH_TOKEN_INVALID" ||
							refreshError.message === "Failed to refresh token" ||
							refreshError.message === "Refresh token is invalid")
					) {
						console.error(
							"❌ [API] Refresh token invalid, logging out user and redirecting to login"
						);

						// Use centralized logout function
						const { logout } = await import("../utils/auth");
						await logout("/signin");

						const err = new AuthError(
							"Refresh token is invalid",
							"refresh_token_invalid"
						);
						(err as any).isAuthError = true;
						throw err;
					}
					console.error(
						"❌ [API] Unexpected error during token refresh:",
						refreshError
					);
					throw refreshError;
				}
			}

			return response;
		} catch (error) {
			if (isEmailVerificationError(error)) {
				throw error;
			}
			if (error instanceof AuthError) {
				throw error;
			} else {
				console.error("❌ [API] Unexpected request error:", error);
				throw error;
			}
		}
	},

	// =============================================
	// EMAIL VERIFICATION FUNCTIONS
	// =============================================
	async verifyEmail(): Promise<ApiTypes.VerifyEmailResponse> {
		const url = `${API_URL}${API_CONFIG.endpoints.auth.verify_email}`;
		try {
			const response = await this.authenticatedRequest(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			});
			if (!response.ok) {
				const errorText = await response.text();
				console.error("❌ [API] Email verification failed:", {
					status: response.status,
					error: errorText,
				});
				throw new Error(errorText || "Failed to verify email");
			}
			const responseData = await response.json();
			return responseData;
		} catch (error) {
			console.error("❌ [API] Error verifying email:", error);
			throw error;
		}
	},

	async validateEmail(code: string): Promise<ApiTypes.ValidateEmailResponse> {
		const url = `${API_URL}${API_CONFIG.endpoints.auth.validate_email}`;
		try {
			const response = await this.authenticatedRequest(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					code: code,
				}),
			});
			if (!response.ok) {
				const errorText = await response.text();
				console.error("❌ [API] Email validation failed:", {
					status: response.status,
					error: errorText,
				});
				throw new Error(errorText || "Failed to validate email");
			}
			const responseData = await response.json();

			if (responseData.access_token) {
				await setAccessToken(responseData.access_token);
				console.log("✅ [API] Email verified and access token updated");
			}

			return responseData;
		} catch (error) {
			console.error("❌ [API] Error validating email:", error);
			throw error;
		}
	},

	// =============================================
	// UPLOAD FUNCTIONS
	// =============================================
	async uploadMedia(
		data: ApiTypes.UploadRequest
	): Promise<ApiTypes.UploadResponse> {
		const url = `${API_URL}${API_CONFIG.endpoints.upload}`;
		try {
			const response = await this.authenticatedRequest(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(data),
			});
			if (!response.ok) {
				const errorText = await response.text();
				console.error("❌ [API] Upload URL request failed:", {
					status: response.status,
					error: errorText,
				});
				throw new Error(errorText || "Failed to get upload URL");
			}
			const responseData = await response.json();
			return responseData;
		} catch (error) {
			console.error("❌ [API] Error getting upload URL:", error);
			throw error;
		}
	},

	async uploadFileToS3(uploadUrl: string, file: Blob): Promise<void> {
		try {
			const response = await fetch(uploadUrl, {
				method: "PUT",
				headers: {
					"Content-Type": file.type,
				},
				body: file,
			});
			if (!response.ok) {
				const errorText = await response.text();
				console.error("❌ [API] S3 upload failed:", {
					status: response.status,
					error: errorText,
				});
				throw new Error(errorText || "Failed to upload file to S3");
			}
			console.log("✅ [API] File uploaded to S3");
		} catch (error) {
			console.error("❌ [API] Error uploading file to S3:", error);
			throw error;
		}
	},

	// =============================================
	// PROFILE FUNCTIONS
	// =============================================
	async getProfilePicture(): Promise<ApiTypes.UserProfilePictureResponse> {
		const url = `${API_URL}${API_CONFIG.endpoints.profile}`;
		try {
			const response = await this.authenticatedRequest(url, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					...(await this.getAuthHeaders()),
				},
			});
			const responseData = await response.json();
			return responseData;
		} catch (error) {
			if (!isEmailVerificationError(error)) {
				console.error("❌ [API] Error getting profile picture:", error);
			}
			throw error;
		}
	},

	// =============================================
	// USER SEARCH FUNCTIONS
	// =============================================

	/**
	 * Search for users by query (username, first name, or last name)
	 */
	async searchUsers(query: string): Promise<ApiTypes.ContactUser[]> {
		const url = `${API_URL}${
			API_CONFIG.endpoints.global_user_search
		}/${encodeURIComponent(query)}`;
		try {
			const response = await this.authenticatedRequest(url, {
				method: "GET",
			});
			const responseData = await response.json();
			return responseData;
		} catch (error) {
			console.error("❌ [API] Error searching users:", error);
			throw error;
		}
	},

	async updateProfile(
		data: ApiTypes.UpdateProfileRequest
	): Promise<ApiTypes.UserInfo> {
		const url = `${API_URL}${API_CONFIG.endpoints.profile}`;
		try {
			const response = await this.authenticatedRequest(url, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(data),
			});
			if (!response.ok) {
				const errorText = await response.text();
				console.error("❌ [API] Update profile failed:", {
					status: response.status,
					error: errorText,
				});
				throw new Error(errorText || "Failed to update profile");
			}
			const responseData = await response.json();
			return responseData.user_info;
		} catch (error) {
			console.error("❌ [API] Error updating profile:", error);
			throw error;
		}
	},

	async uploadProfilePicture(file: Blob): Promise<ApiTypes.UserInfo> {
		const fileSizeMB = file.size / (1024 * 1024);
		if (fileSizeMB > 10) {
			throw new Error("Profile picture size must be less than 10MB");
		}
		const mimeType = file.type;
		if (!mimeType.startsWith("image/")) {
			throw new Error("Profile picture must be an image file");
		}

		const uploadUrl = `${API_URL}${API_CONFIG.endpoints.upload}`;
		try {
			// Use the actual file name instead of generating a generic one
			const fileName =
				(file as File).name || `profile.${mimeType.split("/")[1]}`;

			console.log("🔍 [API] Starting profile picture upload:", {
				fileName,
				fileSize: `${fileSizeMB.toFixed(2)}MB`,
				mimeType,
			});

			const uploadResponse = await this.authenticatedRequest(uploadUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					files: [fileName],
				}),
			});

			if (!uploadResponse.ok) {
				const errorText = await uploadResponse.text();
				console.error("❌ [API] Upload URL request failed:", {
					status: uploadResponse.status,
					error: errorText,
				});
				throw new Error(errorText || "Failed to get upload URL");
			}

			const uploadData = await uploadResponse.json();
			console.log("🔍 [API] Upload response received:", uploadData);

			// Upload file to S3
			await this.uploadFileToS3(uploadData.uploads[0].upload_url, file);
			console.log("✅ [API] File uploaded to S3 successfully");

			// Update profile with the object key
			const profileUpdate = await this.updateProfile({
				profile_object_key: uploadData.uploads[0].object_key,
			});
			console.log("✅ [API] Profile updated successfully:", profileUpdate);

			return profileUpdate;
		} catch (error) {
			console.error("❌ [API] Error uploading profile picture:", error);
			throw error;
		}
	},

	async deleteProfilePicture(): Promise<void> {
		const url = `${API_URL}${API_CONFIG.endpoints.profile}`;
		try {
			const response = await this.authenticatedRequest(url, {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.error("❌ [API] Delete profile picture failed:", {
					status: response.status,
					error: errorText,
				});
				throw new Error(errorText || "Failed to delete profile picture");
			}
		} catch (error) {
			console.error("❌ [API] Error deleting profile picture:", error);
			throw error;
		}
	},

	// =============================================
	// CONTACT FUNCTIONS
	// =============================================
	async getContacts(signal?: AbortSignal): Promise<ApiTypes.ContactsResponse> {
		const url = `${API_URL}${API_CONFIG.endpoints.contact.list}`;
		try {
			const response = await this.authenticatedRequest(url, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
				signal,
			});
			const responseData = await response.json();
			return responseData;
		} catch (error) {
			console.error("❌ [API] Error getting contacts:", error);
			throw error;
		}
	},

	async updateContact(
		userId: string,
		action: ApiTypes.ContactUpdateRequest
	): Promise<ApiTypes.ContactRequestResponse | void> {
		const url = `${API_URL}${API_CONFIG.endpoints.contact.list}/${userId}`;
		const requestBody = JSON.stringify(action);
		try {
			const response = await this.authenticatedRequest(url, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: requestBody,
			});

			if (
				(action.accept && response.status === 202) ||
				(action.cancel && response.status === 204)
			) {
				return;
			}

			if (!response.ok) {
				const errorText = await response.text();
				console.error("❌ [API] Update contact failed:", {
					status: response.status,
					error: errorText,
				});

				const errorMap: { [key: string]: string } = {
					"Failed to reject contact request":
						"Unable to reject the friend request. Please try again.",
					"Failed to accept contact request":
						"Unable to accept the friend request. Please try again.",
					"Failed to cancel contact request":
						"Unable to cancel the friend request. Please try again.",
				};

				let errorMessage = errorText;
				try {
					const errorData = JSON.parse(errorText);
					errorMessage = errorData.error || errorText;
				} catch (e) {
					// Use errorText as is if it's not JSON
				}

				throw new Error(
					errorMap[errorMessage] || errorMessage || "Failed to update contact"
				);
			}

			const responseText = await response.text();
			if (!responseText.trim()) {
				return;
			}

			let responseData;
			try {
				responseData = JSON.parse(responseText);
			} catch (e) {
				console.error("❌ [API] Failed to parse response as JSON:", e);
				throw new Error("Invalid response from server");
			}

			if (responseData.error) {
				let errorMessage = responseData.error;
				try {
					const parsedError = JSON.parse(errorMessage);
					errorMessage = parsedError.error || errorMessage;
				} catch (e) {
					// If it's not a JSON string, use it as is
				}

				const errorMap: { [key: string]: string } = {
					"Failed to reject contact request":
						"Unable to reject the friend request. Please try again.",
					"Failed to accept contact request":
						"Unable to accept the friend request. Please try again.",
					"Failed to cancel contact request":
						"Unable to cancel the friend request. Please try again.",
				};

				throw new Error(
					errorMap[errorMessage] || errorMessage || "Failed to update contact"
				);
			}

			const transformedResponse: ApiTypes.ContactRequestResponse = {
				requesting_user: responseData.requesting_user,
				recipient: responseData.recipient,
				contact_request: responseData.contact_request,
			};
			return transformedResponse;
		} catch (error) {
			console.error("❌ [API] Error updating contact:", error);
			if (error instanceof Error) {
				throw error;
			}
			throw new Error("Failed to update contact");
		}
	},

	async deleteContact(userId: string): Promise<void> {
		const url = `${API_URL}${API_CONFIG.endpoints.contact.delete}/${userId}`;
		try {
			const response = await this.authenticatedRequest(url, {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
				},
			});
			if (!response.ok) {
				const errorText = await response.text();
				console.error("❌ [API] Delete contact failed:", {
					status: response.status,
					error: errorText,
				});
				throw new Error(errorText || "Failed to delete contact");
			}
		} catch (error) {
			console.error("❌ [API] Error deleting contact:", error);
			throw error;
		}
	},

	async sendContactRequest(userId: string): Promise<void> {
		const url = `${API_URL}${API_CONFIG.endpoints.contact.send}/${userId}`;
		try {
			const response = await this.authenticatedRequest(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			});
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to send contact request");
			}
			return;
		} catch (error) {
			console.error("❌ [API] Error sending contact request:", error);
			throw error;
		}
	},

	// =============================================
	// POCKET FUNCTIONS
	// =============================================
	async getPockets(): Promise<ApiTypes.Pocket[]> {
		const url = `${API_URL}${API_CONFIG.endpoints.pocket.list}`;
		try {
			const response = await this.authenticatedRequest(url, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			});
			const responseData = await response.json();

			if (!responseData) {
				return [];
			}
			if (!Array.isArray(responseData)) {
				console.error(
					"❌ [API] Invalid pockets response format:",
					responseData
				);
				throw new Error("Invalid response format from server");
			}

			return responseData;
		} catch (error) {
			console.error("❌ [API] Error getting pockets:", error);
			throw error;
		}
	},

	async createPocket(
		data: ApiTypes.CreatePocketRequest
	): Promise<ApiTypes.Pocket> {
		const url = `${API_URL}${API_CONFIG.endpoints.pocket.create}`;
		try {
			const response = await this.authenticatedRequest(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(data),
			});
			const responseData = await response.json();

			const transformedPocket = {
				...responseData,
				pocket_title: responseData.pocket_title || responseData.title,
				pocket_created_at:
					responseData.pocket_created_at || responseData.created_at,
				pocket_id: responseData.pocket_id || responseData.id,
				pocket_members:
					responseData.pocket_members || responseData.members || [],
			};

			return transformedPocket;
		} catch (error) {
			console.error("❌ [API] Error creating pocket:", error);
			throw error;
		}
	},

	async updatePocket(
		pocketId: string,
		data: ApiTypes.UpdatePocketRequest
	): Promise<ApiTypes.Pocket> {
		const url = `${API_URL}${API_CONFIG.endpoints.pocket.edit}/${pocketId}`;
		try {
			const response = await this.authenticatedRequest(url, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(data),
			});
			const responseData = await response.json();
			return responseData;
		} catch (error) {
			console.error("❌ [API] Error updating pocket:", error);
			throw error;
		}
	},

	async leavePocket(pocketId: string): Promise<void> {
		const url = `${API_URL}${API_CONFIG.endpoints.pocket.leave}/${pocketId}`;
		try {
			const response = await this.authenticatedRequest(url, {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
				},
			});
			if (!response.ok) {
				const errorText = await response.text();
				console.error("❌ [API] Error leaving pocket:", errorText);
				throw new Error(errorText || "Failed to leave pocket");
			}
		} catch (error) {
			console.error("❌ [API] Error leaving pocket:", error);
			throw error;
		}
	},

	// =============================================
	// EVENT FUNCTIONS
	// =============================================
	async getEvents(pocketId: string): Promise<ApiTypes.Event[]> {
		const url = `${API_URL}${API_CONFIG.endpoints.events.list}/${pocketId}`;
		try {
			const response = await this.authenticatedRequest(url, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			});
			if (!response.ok) {
				const errorText = await response.text();
				console.error("❌ [API] Get events failed:", {
					status: response.status,
					error: errorText,
				});
				throw new Error(errorText || "Failed to get events");
			}
			const responseData = await response.json();
			return responseData;
		} catch (error) {
			console.error("❌ [API] Error getting events:", error);
			throw error;
		}
	},

	async createEvent(
		data: ApiTypes.CreateEventRequest
	): Promise<ApiTypes.Event> {
		const url = `${API_URL}${API_CONFIG.endpoints.events.create}`;
		try {
			console.log("🔍 [API] Creating event at URL:", url);
			console.log("🔍 [API] Request data:", data);
			console.log("🔍 [API] Request body JSON:", JSON.stringify(data, null, 2));

			const response = await this.authenticatedRequest(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(data),
			});
			if (!response.ok) {
				const errorText = await response.text();
				console.error("❌ [API] Create event failed:", {
					status: response.status,
					error: errorText,
				});
				throw new Error(errorText || "Failed to create event");
			}
			const responseData = await response.json();
			return responseData;
		} catch (error) {
			console.error("❌ [API] Error creating event:", error);
			throw error;
		}
	},

	async editEvent(
		eventId: string,
		data: ApiTypes.EditEventRequest
	): Promise<ApiTypes.Event> {
		const url = `${API_URL}${API_CONFIG.endpoints.events.edit}/${eventId}`;
		try {
			const response = await this.authenticatedRequest(url, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(data),
			});
			if (!response.ok) {
				const errorText = await response.text();
				console.error("❌ [API] Edit event failed:", {
					status: response.status,
					error: errorText,
				});
				throw new Error(errorText || "Failed to edit event");
			}
			const responseData = await response.json();
			return responseData;
		} catch (error) {
			console.error("❌ [API] Error editing event:", error);
			throw error;
		}
	},

	async getEventPhotos(eventId: string): Promise<ApiTypes.PreviewPhoto[]> {
		const url = `${API_URL}${API_CONFIG.endpoints.events.getPhotos}/${eventId}`;
		try {
			const response = await this.authenticatedRequest(url, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			});
			if (!response.ok) {
				const errorText = await response.text();
				console.error("❌ [API] Get event photos failed:", {
					status: response.status,
					error: errorText,
				});
				throw new Error(errorText || "Failed to get event photos");
			}
			const responseData = await response.json();
			return responseData;
		} catch (error) {
			console.error("❌ [API] Error getting event photos:", error);
			throw error;
		}
	},

	// =============================================
	// PHOTO FUNCTIONS
	// =============================================
	async uploadPhotosToEvent(
		eventId: string,
		body: ApiTypes.AddPhotoRequest
	): Promise<ApiTypes.PhotoView> {
		const url = `${API_URL}${API_CONFIG.endpoints.events.attachPhotos}/${eventId}`;
		try {
			const response = await this.authenticatedRequest(url, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(body),
			});

			const responseText = await response.text();

			if (!response.ok) {
				console.error("❌ [API] Add photo failed:", {
					status: response.status,
					error: responseText,
				});
				throw new Error(responseText || "Failed to add photo");
			}

			const responseData = JSON.parse(responseText);
			console.log("[API] uploadPhotosToEvent responseData:", responseData);
			return responseData;
		} catch (error) {
			console.error("❌ [API] Error adding photo:", error);
			throw error;
		}
	},

	async deletePhoto(photoId: string): Promise<void> {
		const url = `${API_URL}${API_CONFIG.endpoints.photos.delete}/${photoId}`;
		try {
			const response = await this.authenticatedRequest(url, {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
				},
			});
			if (!response.ok) {
				const errorText = await response.text();
				console.error("❌ [API] Delete photo failed:", {
					status: response.status,
					error: errorText,
				});
				throw new Error(errorText || "Failed to delete photo");
			}
		} catch (error) {
			console.error("❌ [API] Error deleting photo:", error);
			throw error;
		}
	},

	async getPhotoComments(
		photoId: string
	): Promise<ApiTypes.PhotoCommentView[]> {
		const url = `${API_URL}${API_CONFIG.endpoints.photos.getComments}/${photoId}`;
		try {
			const response = await this.authenticatedRequest(url, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			});
			if (!response.ok) {
				const errorText = await response.text();
				console.error("❌ [API] Get photo comments failed:", {
					status: response.status,
					error: errorText,
				});
				throw new Error(errorText || "Failed to get photo comments");
			}
			const responseData = await response.json();
			return responseData;
		} catch (error) {
			console.error("❌ [API] Error getting photo comments:", error);
			throw error;
		}
	},

	// =============================================
	// COMMENT FUNCTIONS
	// =============================================
	async addComment(
		photoId: string,
		data: ApiTypes.CreateCommentRequest
	): Promise<ApiTypes.Comment> {
		const url = `${API_URL}${API_CONFIG.endpoints.comments.add}/${photoId}`;
		try {
			const response = await this.authenticatedRequest(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(data),
			});
			if (!response.ok) {
				const errorText = await response.text();
				console.error("❌ [API] Add comment failed:", {
					status: response.status,
					error: errorText,
				});
				throw new Error(errorText || "Failed to add comment");
			}
			return await response.json();
		} catch (error) {
			console.error("❌ [API] Error adding comment:", error);
			throw error;
		}
	},

	async editComment(
		commentId: string,
		data: ApiTypes.EditCommentRequest
	): Promise<ApiTypes.Comment> {
		const url = `${API_URL}${API_CONFIG.endpoints.comments.edit}/${commentId}`;
		try {
			const response = await this.authenticatedRequest(url, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ text: data.text }),
			});
			if (!response.ok) {
				const errorText = await response.text();
				console.error("❌ [API] Edit comment failed:", {
					status: response.status,
					error: errorText,
				});
				throw new Error(errorText || "Failed to edit comment");
			}
			return await response.json();
		} catch (error) {
			console.error("❌ [API] Error editing comment:", error);
			throw error;
		}
	},

	async deleteComment(commentId: string): Promise<void> {
		const url = `${API_URL}${API_CONFIG.endpoints.comments.delete}/${commentId}`;
		try {
			const response = await this.authenticatedRequest(url, {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
				},
			});
			if (!response.ok) {
				const errorText = await response.text();
				console.error("❌ [API] Delete comment failed:", {
					status: response.status,
					error: errorText,
				});
				throw new Error(errorText || "Failed to delete comment");
			}
		} catch (error) {
			console.error("❌ [API] Error deleting comment:", error);
			throw error;
		}
	},

	//TODO: Update with config api.ts
	async getEventDetails(eventId: string): Promise<any> {
		const url = `${API_URL}/v1/events/${eventId}`;
		try {
			const response = await this.authenticatedRequest(url, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			});
			if (!response.ok) {
				const errorText = await response.text();
				console.error("❌ [API] Get event details failed:", {
					status: response.status,
					error: errorText,
				});
				throw new Error(errorText || "Failed to get event details");
			}
			const responseData = await response.json();
			console.log("✅ [API] Event details fetched successfully");
			return responseData;
		} catch (error) {
			console.error("❌ [API] Error getting event details:", error);
			throw error;
		}
	},

	//TODO: Update with config api.ts
	async favoritePhoto(photoId: string): Promise<void> {
		const url = `${API_URL}/v1/photos/${photoId}/favorite`;
		try {
			const response = await this.authenticatedRequest(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			});
			if (!response.ok) {
				const errorText = await response.text();
				console.error("❌ [API] Favorite photo failed:", {
					status: response.status,
					error: errorText,
				});
				throw new Error(errorText || "Failed to favorite photo");
			}
			console.log("✅ [API] Photo favorited successfully");
		} catch (error) {
			console.error("❌ [API] Error favoriting photo:", error);
			throw error;
		}
	},

	//TODO: Update with config api.ts
	async unfavoritePhoto(photoId: string): Promise<void> {
		const url = `${API_URL}/v1/photos/${photoId}/favorite`;
		try {
			const response = await this.authenticatedRequest(url, {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
				},
			});
			if (!response.ok) {
				const errorText = await response.text();
				console.error("❌ [API] Unfavorite photo failed:", {
					status: response.status,
					error: errorText,
				});
				throw new Error(errorText || "Failed to unfavorite photo");
			}
			console.log("✅ [API] Photo unfavorited successfully");
		} catch (error) {
			console.error("❌ [API] Error unfavoriting photo:", error);
			throw error;
		}
	},
};

// Export token management functions for external use
export { setAccessToken, clearAccessToken, clearRefreshToken, clearUserData };

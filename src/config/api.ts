/**
 * API Configuration
 * Contains settings for API endpoints, upload limits, and accepted file types
 */

import env from "./env";

export const API_CONFIG = {
	baseUrl: env.API_URL,
	mediaUrl: env.MEDIA_URL,
	// Upload configuration
	upload: {
		maxFileSizes: {
			profile: 10, // MB
			cover: 10, // MB
			photo: 50, // MB
			video: 1024, // MB (1GB)
			comment: 10, // MB
		} as const,
		acceptedMimeTypes: {
			profile: ["image/jpeg", "image/png", "image/webp"] as const,
			cover: ["image/jpeg", "image/png", "image/webp"] as const,
			photo: ["image/jpeg", "image/png", "image/webp"] as const,
			video: ["video/mp4"] as const,
			comment: ["audio/mpeg"] as const,
		} as const,
	},

	// API endpoints
	endpoints: {
		auth: {
			login: "/v1/login",
			register: "/v1/register",
			refresh: "/v1/refresh",
			verify_email: "/v1/verify",
			validate_email: "/v1/validate",
		},
		upload: "/v1/upload", // uploading different types of media
		profile: "/v1/profile", // logged in user's info
		global_user_search: "/v1/profile", // Append with: /{search-query}
		contact: {
			list: "/v1/contacts",
			send: "/v1/contacts", // Append with: /{contact-user-id}
			delete: "/v1/contacts", // Append with: /{contact-user-id}
		},
		pocket: {
			list: "/v1/pockets",
			create: "/v1/pockets",
			edit: "/v1/pockets", // Append with: /{pocket-id}
			leave: "/v1/pockets",
		},
		comments: {
			add: "/v1/photo", // Append with: /{photo-id}
			edit: "/v1/comment", // Append with: /{comment-id}
			delete: "/v1/comment", // Append with: /{comment-id}
		},
		photos: {
			upload: "/v1/photos", // Append with: /{event-id}
			delete: "/v1/photo", // Append with: /{photo-id}
			getComments: "/v1/photo", // Append with: /{photo-id}
			getDetails: "/v1/photo", // Append with: /{photo-id}
		},
		events: {
			list: "/v1/pockets", // Append with: /{pocket-id}
			create: "/v1/events",
			attachPhotos: "/v1/photos", // Append with: /{event-id}
			getPhotos: "/v1/events", // Append with: /{event-id}
			edit: "/v1/events", // Append with: /{event-id}
		},
	},

	// Request configuration
	request: {
		timeout: 10000, // 10 seconds
		retryAttempts: 3,
	},
} as const;

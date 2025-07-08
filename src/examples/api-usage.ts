/**
 * API Usage Examples
 * This file demonstrates how to use the API service in React components
 */

import { api, isAuthError, AUTH_ERRORS } from "../services";
import type { LoginData, RegisterData } from "../services";

// Example: User Registration
export const exampleRegister = async (formData: RegisterData) => {
	try {
		const response = await api.register(formData);
		console.log("Registration successful:", response);
		// Handle successful registration (e.g., show success message, redirect to login)
		return response;
	} catch (error) {
		console.error("Registration failed:", error);
		if (isAuthError(error)) {
			// Handle specific auth errors
			if (error.message === AUTH_ERRORS.EMAIL_ALREADY_REGISTERED) {
				// Show "email already exists" message to user
				throw new Error(
					"This email is already registered. Please try signing in instead."
				);
			}
		}
		// Handle other errors
		throw error;
	}
};

// Example: User Login
export const exampleLogin = async (credentials: LoginData) => {
	try {
		const response = await api.login(credentials);
		console.log("Login successful:", response);
		// Handle successful login (e.g., redirect to dashboard, save user data)
		return response;
	} catch (error) {
		console.error("Login failed:", error);
		if (isAuthError(error)) {
			// Handle auth errors with user-friendly messages
			throw new Error("Invalid username or password. Please try again.");
		}
		throw error;
	}
};

// Example: Get User's Pockets
export const exampleGetPockets = async () => {
	try {
		const pockets = await api.getPockets();
		console.log("Pockets loaded:", pockets);
		return pockets;
	} catch (error) {
		console.error("Failed to load pockets:", error);
		if (isAuthError(error)) {
			// Handle auth errors (e.g., redirect to login)
			throw new Error("Your session has expired. Please log in again.");
		}
		throw error;
	}
};

// Example: Create a New Pocket
export const exampleCreatePocket = async (
	title: string,
	members?: string[],
	coverPhoto?: File
) => {
	try {
		const pocketData = {
			title,
			members,
		};

		const pocket = await api.createPocket(pocketData, coverPhoto);
		console.log("Pocket created:", pocket);
		return pocket;
	} catch (error) {
		console.error("Failed to create pocket:", error);
		throw error;
	}
};

// Example: Upload Profile Picture
export const exampleUploadProfilePicture = async (file: File) => {
	try {
		// Validate file before upload
		if (!file.type.startsWith("image/")) {
			throw new Error("Please select an image file");
		}

		if (file.size > 10 * 1024 * 1024) {
			throw new Error("Image must be smaller than 10MB");
		}

		const userInfo = await api.uploadProfilePicture(file);
		console.log("Profile picture updated:", userInfo);
		return userInfo;
	} catch (error) {
		console.error("Failed to upload profile picture:", error);
		throw error;
	}
};

// Example: Get Contacts
export const exampleGetContacts = async () => {
	try {
		const contacts = await api.getContacts();
		console.log("Contacts loaded:", contacts);
		return contacts;
	} catch (error) {
		console.error("Failed to load contacts:", error);
		if (isAuthError(error)) {
			throw new Error("Your session has expired. Please log in again.");
		}
		throw error;
	}
};

// Example: Send Contact Request
export const exampleSendContactRequest = async (userId: string) => {
	try {
		await api.sendContactRequest(userId);
		console.log("Contact request sent");
		// Show success message to user
	} catch (error) {
		console.error("Failed to send contact request:", error);
		throw error;
	}
};

// Example: React Hook for API calls
import { useState, useEffect } from "react";

export const useApiCall = <T>(apiCall: () => Promise<T>) => {
	const [data, setData] = useState<T | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchData = async () => {
			try {
				setLoading(true);
				setError(null);
				const result = await apiCall();
				setData(result);
			} catch (err) {
				setError(err instanceof Error ? err.message : "An error occurred");
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, []);

	return { data, loading, error };
};

// Example usage in a React component:
/*
const PocketsComponent = () => {
  const { data: pockets, loading, error } = useApiCall(() => api.getPockets());

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {pockets?.map(pocket => (
        <div key={pocket.pocket_id}>
          <h3>{pocket.pocket_title}</h3>
          <p>Members: {pocket.pocket_members.length}</p>
        </div>
      ))}
    </div>
  );
};
*/

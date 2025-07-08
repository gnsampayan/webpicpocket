/**
 * Error handling utilities and types
 */

// =============================================
// ERROR CONSTANTS
// =============================================
export const AUTH_ERRORS = {
	EMAIL_ALREADY_REGISTERED:
		"An account with this email already exists. Please try signing in instead.",
	NETWORK_ERROR:
		"Unable to connect to the server. Please check your internet connection and try again.",
	EMAIL_NOT_VERIFIED: "Please verify your email address to continue.",
	INVALID_CREDENTIALS: "Invalid username or password.",
	REFRESH_TOKEN_INVALID: "Your session has expired. Please log in again.",
	TOKEN_EXPIRED: "Your session has expired. Please log in again.",
} as const;

// =============================================
// ERROR CLASSES
// =============================================
export class AuthError extends Error {
	public readonly code: string;
	public readonly isAuthError = true;

	constructor(message: string, code: string) {
		super(message);
		this.name = "AuthError";
		this.code = code;
	}
}

export class NetworkError extends Error {
	public readonly isNetworkError = true;

	constructor(message: string = AUTH_ERRORS.NETWORK_ERROR) {
		super(message);
		this.name = "NetworkError";
	}
}

export class ValidationError extends Error {
	public readonly isValidationError = true;

	constructor(message: string) {
		super(message);
		this.name = "ValidationError";
	}
}

// =============================================
// ERROR CHECKING UTILITIES
// =============================================
export const isAuthError = (error: any): error is AuthError => {
	return error instanceof AuthError || error?.isAuthError === true;
};

export const isNetworkError = (error: any): error is NetworkError => {
	return (
		error instanceof NetworkError ||
		error?.isNetworkError === true ||
		(error instanceof TypeError &&
			error.message === "Network request failed") ||
		(error instanceof TypeError && error.message.includes("fetch"))
	);
};

export const isValidationError = (error: any): error is ValidationError => {
	return error instanceof ValidationError || error?.isValidationError === true;
};

export const isEmailVerificationError = (error: any): boolean => {
	if (isAuthError(error)) {
		return error.code === "email_not_verified";
	}

	if (error instanceof Error) {
		return (
			error.message.toLowerCase().includes("e-mail not verified") ||
			error.message.toLowerCase().includes("email not verified")
		);
	}

	return false;
};

// =============================================
// ERROR PARSING UTILITIES
// =============================================
export const parseApiError = (
	error: any,
	defaultMessage: string = "An unexpected error occurred"
): string => {
	// Handle different error formats
	if (typeof error === "string") {
		return error;
	}

	if (error?.message) {
		return error.message;
	}

	if (error?.error) {
		if (typeof error.error === "string") {
			return error.error;
		}
		if (error.error?.message) {
			return error.error.message;
		}
	}

	return defaultMessage;
};

export const handleApiError = (error: any): Error => {
	// Network errors
	if (isNetworkError(error)) {
		return new NetworkError();
	}

	// Auth errors
	if (isAuthError(error)) {
		return error;
	}

	// Parse error message
	const message = parseApiError(error);

	// Check for specific error patterns
	if (
		message.toLowerCase().includes("email") &&
		message.toLowerCase().includes("already")
	) {
		return new AuthError(
			AUTH_ERRORS.EMAIL_ALREADY_REGISTERED,
			"email_already_registered"
		);
	}

	if (
		message.toLowerCase().includes("invalid") &&
		(message.toLowerCase().includes("password") ||
			message.toLowerCase().includes("credentials"))
	) {
		return new AuthError(
			AUTH_ERRORS.INVALID_CREDENTIALS,
			"invalid_credentials"
		);
	}

	if (message.toLowerCase().includes("e-mail not verified")) {
		return new AuthError(AUTH_ERRORS.EMAIL_NOT_VERIFIED, "email_not_verified");
	}

	// Return as generic error
	return new Error(message);
};

// =============================================
// ENVIRONMENT TYPES
// =============================================
type Environment = "dev" | "staging" | "prod";

interface EnvConfig {
	API_URL: string;
	MEDIA_URL: string;
	ENV: Environment;
}

interface EnvVars {
	dev: EnvConfig;
	staging: EnvConfig;
	prod: EnvConfig;
}
// =============================================

// =============================================
// ENVIRONMENT CONFIGURATION
// =============================================
// TODO: Update API_URL when server is ready
// Current configuration uses picpocket.io for all environments
// This should be updated to use the correct domains when available:
// - dev: development server URL
// - staging: staging server URL
// - prod: production server URL

const ENV: EnvVars = {
	dev: {
		API_URL: "/api", // Proxy for development due to CORS issues
		MEDIA_URL: "https://media.picpocket.io",
		ENV: "dev",
	},
	staging: {
		API_URL: "https://api.picpocket.io",
		MEDIA_URL: "https://media.picpocket.io",
		ENV: "staging",
	},
	prod: {
		API_URL: "https://api.picpocket.io",
		MEDIA_URL: "https://media.picpocket.io",
		ENV: "prod",
	},
};
// =============================================

// =============================================
// ENVIRONMENT HELPER FUNCTIONS
// =============================================
/**
 * Gets the environment configuration based on the current environment
 * Falls back to 'dev' if no environment is specified
 */
const getEnvVars = (): EnvConfig => {
	// For web, we can use import.meta.env or process.env
	// Default to 'dev' if no environment is specified
	const env = (import.meta.env.VITE_ENV || "dev") as Environment;
	return ENV[env];
};
// =============================================

export default getEnvVars();

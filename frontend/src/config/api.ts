export const API_CONFIG = {
	baseURL:
		import.meta.env.VITE_API_BASE_URL ||
		(import.meta.env.MODE === "production"
			? "https://your-production-api.com/api"
			: "http://localhost:3000/api"),
	timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 30000, // 30 seconds for file uploads
} as const;

export const API_ENDPOINTS = {
	ADD_SONG: "/add_song",
	IDENTIFY: "/identify",
	STATS: "/stats",
	HEALTH: "/health",
} as const;

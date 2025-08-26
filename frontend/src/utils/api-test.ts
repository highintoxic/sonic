import { shazamService } from "@/services/shazam.service";

/**
 * Test API connectivity and basic functionality
 */
export const testApiConnection = async (): Promise<{
	success: boolean;
	message: string;
	details?: any;
}> => {
	try {
		// Test health endpoint
		const healthResponse = await shazamService.healthCheck();

		if (!healthResponse.success) {
			return {
				success: false,
				message: "API health check failed",
				details: healthResponse,
			};
		}

		// Test stats endpoint
		const statsResponse = await shazamService.getStats();

		if (!statsResponse.success) {
			return {
				success: false,
				message: "Stats endpoint failed",
				details: statsResponse,
			};
		}

		return {
			success: true,
			message: "API connection successful",
			details: {
				health: healthResponse.data,
				stats: statsResponse.data,
			},
		};
	} catch (error) {
		return {
			success: false,
			message: `API connection failed: ${
				error instanceof Error ? error.message : "Unknown error"
			}`,
			details: error,
		};
	}
};

/**
 * Test audio file validation
 */
export const validateAudioFile = (
	file: File
): {
	isValid: boolean;
	message: string;
} => {
	const validTypes = [
		"audio/mpeg",
		"audio/wav",
		"audio/flac",
		"audio/mp4",
		"audio/ogg",
		"audio/x-m4a",
	];

	if (!validTypes.includes(file.type)) {
		return {
			isValid: false,
			message: `Unsupported file type: ${file.type}. Supported formats: MP3, WAV, FLAC, M4A, OGG`,
		};
	}

	// Check file size (max 50MB)
	const maxSize = 50 * 1024 * 1024; // 50MB in bytes
	if (file.size > maxSize) {
		return {
			isValid: false,
			message: `File too large: ${(file.size / 1024 / 1024).toFixed(
				2
			)}MB. Maximum size: 50MB`,
		};
	}

	return {
		isValid: true,
		message: "File validation successful",
	};
};

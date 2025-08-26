import { apiClient } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/config/api";
import {
	AddSongRequest,
	AddSongResponse,
	IdentifySongRequest,
	IdentifySongResponse,
	StatsResponse,
	ApiResponse,
} from "@/types/api";

export class ShazamService {
	/**
	 * Add a new song to the database
	 */
	async addSong(
		request: AddSongRequest
	): Promise<ApiResponse<AddSongResponse>> {
		const additionalData = {
			title: request.title,
			artist: request.artist,
			...(request.album && { album: request.album }),
		};

		return apiClient.uploadFile<AddSongResponse>(
			API_ENDPOINTS.ADD_SONG,
			request.audio,
			additionalData
		);
	}

	/**
	 * Identify a song from an audio clip
	 */
	async identifySong(
		request: IdentifySongRequest
	): Promise<ApiResponse<IdentifySongResponse>> {
		return apiClient.uploadFile<IdentifySongResponse>(
			API_ENDPOINTS.IDENTIFY,
			request.audio
		);
	}

	/**
	 * Get system statistics
	 */
	async getStats(): Promise<ApiResponse<StatsResponse>> {
		return apiClient.get<StatsResponse>(API_ENDPOINTS.STATS);
	}

	/**
	 * Health check
	 */
	async healthCheck(): Promise<ApiResponse<{ status: string }>> {
		return apiClient.get<{ status: string }>(API_ENDPOINTS.HEALTH);
	}
}

export const shazamService = new ShazamService();

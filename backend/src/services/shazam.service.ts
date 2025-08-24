import * as path from "path";
import * as fs from "fs";
import { AudioFingerprinter } from "./audio-fingerprinter.service";
import { SongMatcher, MatchResult } from "./song-matcher.service";
import { DatabaseService, SongMetadata } from "./database.service";
import { logger } from "../utils/logger";

export interface AddSongResult {
	songId: number;
	fingerprintsGenerated: number;
	processingTime: number;
}

export interface IdentifyResult {
	success: boolean;
	song?: {
		id: number;
		title: string;
		artist: string;
		album?: string;
		duration?: number;
	};
	confidence?: number;
	alignedMatches?: number;
	totalQueryFingerprints?: number;
	processingTime: number;
}

export class ShazamService {
	private audioFingerprinter: AudioFingerprinter;
	private songMatcher: SongMatcher;
	private databaseService: DatabaseService;

	constructor() {
		this.databaseService = new DatabaseService();
		this.audioFingerprinter = new AudioFingerprinter();
		this.songMatcher = new SongMatcher(this.databaseService);
	}

	/**
	 * Add a song to the database with fingerprints
	 */
	async addSong(
		audioFilePath: string,
		metadata: SongMetadata
	): Promise<AddSongResult> {
		const startTime = Date.now();

		try {
			logger.info(
				`Starting to add song: ${metadata.title} by ${metadata.artist}`
			);

			// Validate file exists
			if (!fs.existsSync(audioFilePath)) {
				throw new Error(`Audio file not found: ${audioFilePath}`);
			}

			// Get audio duration if not provided
			let duration = metadata.duration;
			if (!duration) {
				duration = await this.audioFingerprinter.getAudioDuration(
					audioFilePath
				);
			}

			// Generate fingerprints
			const fingerprints = await this.audioFingerprinter.generateFingerprints(
				audioFilePath
			);

			if (fingerprints.length === 0) {
				throw new Error(
					"No fingerprints could be generated from the audio file"
				);
			}

			// Add song to database
			const song = await this.databaseService.addSong(
				{ ...metadata, duration },
				audioFilePath
			);

			// Add fingerprints to database
			await this.databaseService.addFingerprints(song.id, fingerprints);

			const processingTime = Date.now() - startTime;

			logger.info(
				`Successfully added song: ${song.title} (ID: ${song.id}) with ${fingerprints.length} fingerprints in ${processingTime}ms`
			);

			return {
				songId: song.id,
				fingerprintsGenerated: fingerprints.length,
				processingTime,
			};
		} catch (error) {
			logger.error(
				`Error adding song: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
			throw error;
		}
	}

	/**
	 * Identify a song from an audio file
	 */
	async identifySong(audioFilePath: string): Promise<IdentifyResult> {
		const startTime = Date.now();

		try {
			logger.info(`Starting song identification for: ${audioFilePath}`);

			// Validate file exists
			if (!fs.existsSync(audioFilePath)) {
				throw new Error(`Audio file not found: ${audioFilePath}`);
			}

			// Get audio duration for analytics
			const audioDuration = await this.audioFingerprinter.getAudioDuration(
				audioFilePath
			);

			// Generate fingerprints from query audio
			const queryFingerprints =
				await this.audioFingerprinter.generateFingerprints(audioFilePath);

			if (queryFingerprints.length === 0) {
				throw new Error(
					"No fingerprints could be generated from the query audio"
				);
			}

			// Identify song
			const matchResult = await this.songMatcher.identifySong(
				queryFingerprints
			);

			const totalProcessingTime = Date.now() - startTime;

			if (matchResult) {
				// Get song details
				const song = await this.databaseService.getSongById(matchResult.songId);

				if (!song) {
					throw new Error(
						`Song with ID ${matchResult.songId} not found in database`
					);
				}

				// Record successful query
				await this.databaseService.recordUserQuery(
					audioDuration,
					matchResult.songId,
					matchResult.confidence,
					totalProcessingTime
				);

				logger.info(
					`Song identified successfully: ${song.title} by ${
						song.artist
					} (confidence: ${matchResult.confidence.toFixed(3)})`
				);

				return {
					success: true,
					song: {
						id: song.id,
						title: song.title,
						artist: song.artist,
						album: song.album || undefined,
						duration: song.duration || undefined,
					},
					confidence: matchResult.confidence,
					alignedMatches: matchResult.alignedMatches,
					totalQueryFingerprints: matchResult.totalQueryFingerprints,
					processingTime: totalProcessingTime,
				};
			} else {
				// Record failed query
				await this.databaseService.recordUserQuery(
					audioDuration,
					null,
					null,
					totalProcessingTime
				);

				logger.info("No matching song found");

				return {
					success: false,
					processingTime: totalProcessingTime,
				};
			}
		} catch (error) {
			const processingTime = Date.now() - startTime;
			logger.error(
				`Error identifying song: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);

			return {
				success: false,
				processingTime,
			};
		}
	}

	/**
	 * Get all songs in the database
	 */
	async getAllSongs() {
		try {
			return await this.databaseService.getAllSongs();
		} catch (error) {
			logger.error(
				`Error getting all songs: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
			throw error;
		}
	}

	/**
	 * Delete a song from the database
	 */
	async deleteSong(songId: number): Promise<void> {
		try {
			await this.databaseService.deleteSong(songId);
			logger.info(`Successfully deleted song ID: ${songId}`);
		} catch (error) {
			logger.error(
				`Error deleting song: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
			throw error;
		}
	}

	/**
	 * Get system statistics
	 */
	async getStats() {
		try {
			const stats = await this.databaseService.getStats();
			const successRate =
				stats.queryCount > 0
					? (stats.successfulQueries / stats.queryCount) * 100
					: 0;

			return {
				...stats,
				successRate: Math.round(successRate * 100) / 100, // Round to 2 decimal places
			};
		} catch (error) {
			logger.error(
				`Error getting stats: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
			throw error;
		}
	}

	/**
	 * Health check for the service
	 */
	async healthCheck(): Promise<{
		status: "healthy" | "unhealthy";
		database: boolean;
		timestamp: string;
	}> {
		try {
			const databaseHealthy = await this.databaseService.healthCheck();

			return {
				status: databaseHealthy ? "healthy" : "unhealthy",
				database: databaseHealthy,
				timestamp: new Date().toISOString(),
			};
		} catch (error) {
			logger.error(
				`Health check failed: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
			return {
				status: "unhealthy",
				database: false,
				timestamp: new Date().toISOString(),
			};
		}
	}
}

import { Request, Response } from "express";
import { ShazamService } from "../services/shazam.service";
import { logger } from "../utils/logger";
import * as path from "path";
import * as fs from "fs";

interface SongMetadata {
	title: string;
	artist: string;
	album?: string;
}

export class ShazamController {
	private shazamService: ShazamService;

	constructor() {
		this.shazamService = new ShazamService();
	}

	/**
	 * Add a new song to the database
	 * POST /api/add_song
	 */
	addSong = async (req: Request, res: Response): Promise<void> => {
		try {
			// Check if file was uploaded
			if (!req.file) {
				res.status(400).json({
					success: false,
					error: "No audio file uploaded",
				});
				return;
			}

			// Validate required metadata
			const { title, artist, album } = req.body;
			if (!title || !artist) {
				// Clean up uploaded file
				if (fs.existsSync(req.file.path)) {
					fs.unlinkSync(req.file.path);
				}

				res.status(400).json({
					success: false,
					error: "Title and artist are required",
				});
				return;
			}

			const metadata = {
				title: title.trim(),
				artist: artist.trim(),
				album: album?.trim() || undefined,
			};

			// Generate unique processing ID for tracking
			const processingId = `song_${Date.now()}_${Math.random()
				.toString(36)
				.substr(2, 9)}`;

			logger.info(
				`Song upload received for processing: ${metadata.title} by ${metadata.artist} (ID: ${processingId})`
			);

			// Return immediate success response
			res.status(202).json({
				success: true,
				message: "Song file received and queued for processing",
				data: {
					processingId,
					title: metadata.title,
					artist: metadata.artist,
					album: metadata.album,
					status: "processing",
				},
			});

			// Process the song asynchronously in the background
			this.processSongAsync(req.file.path, metadata, processingId).catch(
				(error) => {
					logger.error(
						`Background processing failed for ${metadata.title} by ${
							metadata.artist
						} (ID: ${processingId}): ${
							error instanceof Error ? error.message : "Unknown error"
						}`
					);
				}
			);
		} catch (error) {
			logger.error(
				`Error in addSong controller: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);

			// Clean up uploaded file on error
			if (req.file && fs.existsSync(req.file.path)) {
				fs.unlinkSync(req.file.path);
			}

			res.status(500).json({
				success: false,
				error: "Failed to queue song for processing",
				details: error instanceof Error ? error.message : "Unknown error",
			});
		}
	};

	/**
	 * Process song asynchronously in the background
	 */
	private async processSongAsync(
		filePath: string,
		metadata: SongMetadata,
		processingId: string
	): Promise<void> {
		try {
			logger.info(
				`Starting background processing for song: ${metadata.title} by ${metadata.artist} (ID: ${processingId})`
			);

			const result = await this.shazamService.addSong(filePath, metadata);

			logger.info(
				`Successfully processed song: ${metadata.title} by ${metadata.artist} (ID: ${processingId}) - Song ID: ${result.songId}, Fingerprints: ${result.fingerprintsGenerated}, Time: ${result.processingTime}ms`
			);
		} catch (error) {
			// Enhanced error logging with specific error types
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";

			if (errorMessage.includes("connection")) {
				logger.error(
					`Database connection error while processing song: ${metadata.title} by ${metadata.artist} (ID: ${processingId}) - ${errorMessage}`
				);
			} else if (errorMessage.includes("timeout")) {
				logger.error(
					`Database timeout error while processing song: ${metadata.title} by ${metadata.artist} (ID: ${processingId}) - ${errorMessage}`
				);
			} else if (errorMessage.includes("Transaction failed and rolled back")) {
				logger.error(
					`Transaction rollback occurred for song: ${metadata.title} by ${metadata.artist} (ID: ${processingId}) - Database has been reverted to previous state - ${errorMessage}`
				);
			} else {
				logger.error(
					`Failed to process song: ${metadata.title} by ${metadata.artist} (ID: ${processingId}) - ${errorMessage}`
				);
			}

			// Clean up uploaded file on processing error
			if (fs.existsSync(filePath)) {
				try {
					fs.unlinkSync(filePath);
					logger.info(`Cleaned up file after processing error: ${filePath}`);
				} catch (cleanupError) {
					logger.error(`Failed to cleanup file ${filePath}: ${cleanupError}`);
				}
			}
		}
	}

	/**
	 * Identify a song from audio clip
	 * POST /api/identify
	 */
	identifySong = async (req: Request, res: Response): Promise<void> => {
		try {
			// Check if file was uploaded
			if (!req.file) {
				res.status(400).json({
					success: false,
					error: "No audio file uploaded",
				});
				return;
			}

			// Identify song
			const result = await this.shazamService.identifySong(req.file.path);

			// Clean up uploaded file
			if (fs.existsSync(req.file.path)) {
				fs.unlinkSync(req.file.path);
			}

			if (result.success && result.song) {
				logger.info(
					`Song identified: ${result.song.title} by ${result.song.artist}`
				);

				res.status(200).json({
					success: true,
					data: {
						song: result.song,
						confidence: result.confidence,
						alignedMatches: result.alignedMatches,
						totalQueryFingerprints: result.totalQueryFingerprints,
						processingTime: result.processingTime,
					},
				});
			} else {
				logger.info("Song not identified");

				res.status(200).json({
					success: false,
					message: "Song not found in database",
					processingTime: result.processingTime,
				});
			}
		} catch (error) {
			logger.error(
				`Error in identifySong controller: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);

			// Clean up uploaded file on error
			if (req.file && fs.existsSync(req.file.path)) {
				fs.unlinkSync(req.file.path);
			}

			res.status(500).json({
				success: false,
				error: "Failed to identify song",
				details: error instanceof Error ? error.message : "Unknown error",
			});
		}
	};

	/**
	 * Get all songs in database
	 * GET /api/songs
	 */
	getAllSongs = async (req: Request, res: Response): Promise<void> => {
		try {
			const songs = await this.shazamService.getAllSongs();

			res.status(200).json({
				success: true,
				data: {
					songs: songs.map((song) => ({
						id: song.id,
						title: song.title,
						artist: song.artist,
						album: song.album,
						duration: song.duration,
						createdAt: song.createdAt,
					})),
					count: songs.length,
				},
			});
		} catch (error) {
			logger.error(
				`Error in getAllSongs controller: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);

			res.status(500).json({
				success: false,
				error: "Failed to retrieve songs",
				details: error instanceof Error ? error.message : "Unknown error",
			});
		}
	};

	/**
	 * Delete a song from database
	 * DELETE /api/songs/:id
	 */
	deleteSong = async (req: Request, res: Response): Promise<void> => {
		try {
			const songId = parseInt(req.params.id);

			if (isNaN(songId)) {
				res.status(400).json({
					success: false,
					error: "Invalid song ID",
				});
				return;
			}

			await this.shazamService.deleteSong(songId);

			res.status(200).json({
				success: true,
				message: `Song with ID ${songId} deleted successfully`,
			});
		} catch (error) {
			logger.error(
				`Error in deleteSong controller: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);

			res.status(500).json({
				success: false,
				error: "Failed to delete song",
				details: error instanceof Error ? error.message : "Unknown error",
			});
		}
	};

	/**
	 * Get system statistics
	 * GET /api/stats
	 */
	getStats = async (req: Request, res: Response): Promise<void> => {
		try {
			const stats = await this.shazamService.getStats();

			res.status(200).json({
				success: true,
				data: stats,
			});
		} catch (error) {
			logger.error(
				`Error in getStats controller: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);

			res.status(500).json({
				success: false,
				error: "Failed to retrieve statistics",
				details: error instanceof Error ? error.message : "Unknown error",
			});
		}
	};

	/**
	 * Health check endpoint
	 * GET /api/health
	 */
	healthCheck = async (req: Request, res: Response): Promise<void> => {
		try {
			const health = await this.shazamService.healthCheck();

			const statusCode = health.status === "healthy" ? 200 : 503;

			res.status(statusCode).json({
				success: health.status === "healthy",
				data: health,
			});
		} catch (error) {
			logger.error(
				`Error in healthCheck controller: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);

			res.status(503).json({
				success: false,
				data: {
					status: "unhealthy",
					database: false,
					timestamp: new Date().toISOString(),
				},
				error: "Health check failed",
			});
		}
	};
}

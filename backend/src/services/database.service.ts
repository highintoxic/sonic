import { PrismaClient, Song, Fingerprint } from "@prisma/client";
import { AudioFingerprint } from "./audio-fingerprinter.service";
import { FingerprintMatch } from "./song-matcher.service";
import { logger } from "../utils/logger";
import { prisma } from "../utils/prisma";

export interface SongWithFingerprints extends Song {
	fingerprints: Fingerprint[];
}

export interface SongMetadata {
	title: string;
	artist: string;
	album?: string;
	duration?: number;
}

export class DatabaseService {
	constructor(private db: PrismaClient = prisma) {}

	/**
	 * Add a new song to the database
	 */
	async addSong(metadata: SongMetadata, filePath: string): Promise<Song> {
		try {
			const song = await this.db.song.create({
				data: {
					title: metadata.title,
					artist: metadata.artist,
					album: metadata.album,
					duration: metadata.duration,
					filePath: filePath,
				},
			});

			logger.info(
				`Added song to database: ${song.title} by ${song.artist} (ID: ${song.id})`
			);
			return song;
		} catch (error) {
			logger.error(
				`Error adding song to database: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
			throw error;
		}
	}

	/**
	 * Add fingerprints for a song in batches
	 */
	async addFingerprints(
		songId: number,
		fingerprints: AudioFingerprint[]
	): Promise<void> {
		try {
			const batchSize = 1000; // Process in batches to avoid memory issues

			for (let i = 0; i < fingerprints.length; i += batchSize) {
				const batch = fingerprints.slice(i, i + batchSize);

				await this.db.fingerprint.createMany({
					data: batch.map((fp) => ({
						songId: songId,
						hashValue: fp.hash,
						timeOffset: fp.timeOffset,
					})),
					skipDuplicates: true,
				});
			}

			logger.info(
				`Added ${fingerprints.length} fingerprints for song ID: ${songId}`
			);
		} catch (error) {
			logger.error(
				`Error adding fingerprints: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
			throw error;
		}
	}

	/**
	 * Find matching fingerprints in the database
	 */
	async findMatchingFingerprints(
		queryFingerprints: AudioFingerprint[]
	): Promise<FingerprintMatch[]> {
		try {
			const hashes = queryFingerprints.map((fp) => fp.hash);

			const matches = await this.db.fingerprint.findMany({
				where: {
					hashValue: {
						in: hashes,
					},
				},
				select: {
					songId: true,
					timeOffset: true,
					hashValue: true,
				},
			});

			// Create lookup map for query fingerprints
			const queryMap = new Map<string, number>();
			for (const qf of queryFingerprints) {
				queryMap.set(qf.hash.toString(), qf.timeOffset);
			}

			// Convert to FingerprintMatch format
			const fingerprintMatches: FingerprintMatch[] = matches.map((match) => {
				const queryTimeOffset = queryMap.get(match.hashValue.toString()) || 0;
				return {
					songId: match.songId,
					timeOffset: match.timeOffset,
					queryTimeOffset: queryTimeOffset,
					timeDelta: match.timeOffset - queryTimeOffset,
				};
			});

			return fingerprintMatches;
		} catch (error) {
			logger.error(
				`Error finding matching fingerprints: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
			throw error;
		}
	}

	/**
	 * Get song details by ID
	 */
	async getSongById(songId: number): Promise<Song | null> {
		try {
			return await this.db.song.findUnique({
				where: { id: songId },
			});
		} catch (error) {
			logger.error(
				`Error getting song by ID: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
			throw error;
		}
	}

	/**
	 * Get all songs with basic info
	 */
	async getAllSongs(): Promise<Song[]> {
		try {
			return await this.db.song.findMany({
				orderBy: { createdAt: "desc" },
			});
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
	 * Delete a song and all its fingerprints
	 */
	async deleteSong(songId: number): Promise<void> {
		try {
			// Fingerprints will be deleted automatically due to cascade
			await this.db.song.delete({
				where: { id: songId },
			});

			logger.info(`Deleted song with ID: ${songId}`);
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
	 * Record a user query for analytics
	 */
	async recordUserQuery(
		audioDuration: number,
		identifiedSongId: number | null,
		confidenceScore: number | null,
		processingTime: number
	): Promise<void> {
		try {
			await this.db.userQuery.create({
				data: {
					audioDuration,
					identifiedSongId,
					confidenceScore,
					processingTime,
				},
			});
		} catch (error) {
			logger.error(
				`Error recording user query: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
			// Don't throw error here as this is non-critical
		}
	}

	/**
	 * Get database statistics
	 */
	async getStats(): Promise<{
		songCount: number;
		fingerprintCount: number;
		queryCount: number;
		successfulQueries: number;
		averageProcessingTime: number;
	}> {
		try {
			const [songCount, fingerprintCount, queryStats] = await Promise.all([
				this.db.song.count(),
				this.db.fingerprint.count(),
				this.db.userQuery.aggregate({
					_count: { id: true },
					_avg: { processingTime: true },
				}),
			]);

			const successfulQueries = await this.db.userQuery.count({
				where: {
					identifiedSongId: {
						not: null,
					},
				},
			});

			return {
				songCount,
				fingerprintCount,
				queryCount: queryStats._count.id,
				successfulQueries,
				averageProcessingTime: queryStats._avg.processingTime || 0,
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
	 * Check database connection
	 */
	async healthCheck(): Promise<boolean> {
		try {
			await this.db.$queryRaw`SELECT 1`;
			return true;
		} catch (error) {
			logger.error(
				`Database health check failed: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
			return false;
		}
	}
}

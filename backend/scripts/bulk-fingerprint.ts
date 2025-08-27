#!/usr/bin/env ts-node

import * as fs from "fs";
import * as path from "path";
import { AudioFingerprinter } from "../src/services/audio-fingerprinter.service";
import { DatabaseService } from "../src/services/database.service";
import { logger } from "../src/utils/logger";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

interface SongFileInfo {
	filePath: string;
	fileName: string;
	number: string;
	artist: string;
	title: string;
}

class BulkFingerprintProcessor {
	private audioFingerprinter: AudioFingerprinter;
	private databaseService: DatabaseService;

	constructor() {
		this.audioFingerprinter = new AudioFingerprinter();
		this.databaseService = new DatabaseService();
	}

	/**
	 * Parse filename in format "number - artist - title.ext"
	 */
	private parseFileName(fileName: string): SongFileInfo | null {
		try {
			// Remove file extension
			const nameWithoutExt = path.parse(fileName).name;

			// Split by " - " delimiter
			const parts = nameWithoutExt.split(" - ");

			if (parts.length !== 3) {
				logger.error(
					`❌ Invalid filename format: "${fileName}". Expected format: "number - artist - title"`
				);
				return null;
			}

			const [number, artist, title] = parts.map((part) => part.trim());

			if (!number || !artist || !title) {
				logger.error(`❌ Missing parts in filename: "${fileName}"`);
				return null;
			}

			return {
				filePath: "",
				fileName,
				number,
				artist,
				title,
			};
		} catch (error) {
			logger.error(`❌ Error parsing filename "${fileName}": ${error}`);
			return null;
		}
	}

	/**
	 * Get all supported audio files from directory
	 */
	private getSongFiles(dirPath: string): SongFileInfo[] {
		const supportedExtensions = [".mp3", ".wav", ".flac", ".m4a", ".ogg"];
		const songFiles: SongFileInfo[] = [];

		try {
			const files = fs.readdirSync(dirPath);

			for (const fileName of files) {
				const filePath = path.join(dirPath, fileName);
				const ext = path.extname(fileName).toLowerCase();

				// Check if it's a supported audio file
				if (supportedExtensions.includes(ext)) {
					const songInfo = this.parseFileName(fileName);
					if (songInfo) {
						songInfo.filePath = filePath;
						songFiles.push(songInfo);
					}
				}
			}

			logger.info(
				`🎵 Found ${songFiles.length} valid audio files in ${dirPath}`
			);
			return songFiles;
		} catch (error) {
			logger.error(`❌ Error reading directory ${dirPath}: ${error}`);
			throw error;
		}
	}

	/**
	 * Process a single song file
	 */
	private async processSongFile(songInfo: SongFileInfo): Promise<void> {
		try {
			logger.info(`🎤 Processing: ${songInfo.artist} - ${songInfo.title}`);

			// Check if song already exists in database
			const existingSong = await this.checkIfSongExists(
				songInfo.artist,
				songInfo.title
			);
			if (existingSong) {
				logger.warn(
					`⚠️  Song already exists: ${songInfo.artist} - ${songInfo.title} (ID: ${existingSong.id})`
				);
				return;
			}

			// Generate fingerprints
			logger.info(`🔍 Generating fingerprints for: ${songInfo.fileName}`);
			const fingerprints = await this.audioFingerprinter.generateFingerprints(
				songInfo.filePath
			);

			if (fingerprints.length === 0) {
				logger.error(`❌ No fingerprints generated for: ${songInfo.fileName}`);
				return;
			}

			// Add song to database
			const song = await this.databaseService.addSong(
				{
					title: songInfo.title,
					artist: songInfo.artist,
					album: undefined, // Could be extracted from metadata if needed
					duration: undefined, // Could be extracted from audio file if needed
				},
				songInfo.filePath
			);

			// Add fingerprints to database
			await this.databaseService.addFingerprints(song.id, fingerprints);

			logger.info(
				`✅ Successfully processed: ${songInfo.artist} - ${songInfo.title} (${fingerprints.length} fingerprints)`
			);
		} catch (error) {
			logger.error(`❌ Error processing ${songInfo.fileName}: ${error}`);
		}
	}

	/**
	 * Check if song already exists in database
	 */
	private async checkIfSongExists(artist: string, title: string): Promise<any> {
		try {
			// You might want to implement a more sophisticated matching algorithm
			const existingSong = await this.databaseService["db"].song.findFirst({
				where: {
					AND: [
						{ artist: { equals: artist, mode: "insensitive" } },
						{ title: { equals: title, mode: "insensitive" } },
					],
				},
			});
			return existingSong;
		} catch (error) {
			logger.error(`Error checking if song exists: ${error}`);
			return null;
		}
	}

	/**
	 * Process all songs in a directory
	 */
	async processSongsInDirectory(
		dirPath: string,
		options: {
			skipExisting?: boolean;
			maxConcurrent?: number;
			startFrom?: number;
		} = {}
	): Promise<void> {
		const { skipExisting = true, maxConcurrent = 2, startFrom = 0 } = options;

		try {
			if (!fs.existsSync(dirPath)) {
				throw new Error(`Directory does not exist: ${dirPath}`);
			}

			const songFiles = this.getSongFiles(dirPath);
			if (songFiles.length === 0) {
				logger.warn("⚠️  No valid audio files found");
				return;
			}

			// Sort by number if possible
			songFiles.sort((a, b) => {
				const numA = parseInt(a.number) || 0;
				const numB = parseInt(b.number) || 0;
				return numA - numB;
			});

			// Filter by startFrom if specified
			const filesToProcess = songFiles.slice(startFrom);
			logger.info(
				`🚀 Starting bulk fingerprinting: ${filesToProcess.length} files to process`
			);

			// Process files with controlled concurrency
			const semaphore = new Array(maxConcurrent).fill(null);
			let processedCount = 0;
			let successCount = 0;
			let errorCount = 0;

			const processBatch = async (files: SongFileInfo[]): Promise<void> => {
				const promises = files.map(async (songInfo, index) => {
					// Wait for a semaphore slot
					await new Promise((resolve) => {
						const tryAcquire = () => {
							const slotIndex = semaphore.findIndex((slot) => slot === null);
							if (slotIndex !== -1) {
								semaphore[slotIndex] = songInfo;
								resolve(slotIndex);
							} else {
								setTimeout(tryAcquire, 100);
							}
						};
						tryAcquire();
					});

					try {
						await this.processSongFile(songInfo);
						successCount++;
					} catch (error) {
						errorCount++;
						logger.error(`Failed to process ${songInfo.fileName}: ${error}`);
					} finally {
						// Release semaphore slot
						const slotIndex = semaphore.findIndex((slot) => slot === songInfo);
						if (slotIndex !== -1) {
							semaphore[slotIndex] = null;
						}
						processedCount++;

						// Log progress
						const progress = (
							(processedCount / filesToProcess.length) *
							100
						).toFixed(1);
						logger.info(
							`📊 Progress: ${processedCount}/${filesToProcess.length} (${progress}%) - Success: ${successCount}, Errors: ${errorCount}`
						);
					}
				});

				await Promise.all(promises);
			};

			await processBatch(filesToProcess);

			// Final summary
			logger.info(`🏁 Bulk fingerprinting completed!`);
			logger.info(
				`📈 Summary: ${successCount} successful, ${errorCount} errors, ${processedCount} total`
			);
		} catch (error) {
			logger.error(`❌ Bulk fingerprinting failed: ${error}`);
			throw error;
		}
	}
}

/**
 * Main execution function
 */
async function main() {
	const args = process.argv.slice(2);

	if (args.length === 0) {
		console.log(`
Usage: ts-node scripts/bulk-fingerprint.ts <directory> [options]

Arguments:
  <directory>     Path to directory containing audio files

Options:
  --start-from <number>    Start processing from file number (default: 0)
  --max-concurrent <number> Maximum concurrent processing (default: 2)
  --force                  Process even if song exists in database

Examples:
  ts-node scripts/bulk-fingerprint.ts ./songs
  ts-node scripts/bulk-fingerprint.ts ./songs --start-from 10 --max-concurrent 1
  ts-node scripts/bulk-fingerprint.ts ./songs --force

Expected filename format: "number - artist - title.ext"
Example: "001 - The Beatles - Hey Jude.mp3"
		`);
		process.exit(1);
	}

	const dirPath = path.resolve(args[0]);
	const startFrom = args.includes("--start-from")
		? parseInt(args[args.indexOf("--start-from") + 1]) || 0
		: 0;
	const maxConcurrent = args.includes("--max-concurrent")
		? parseInt(args[args.indexOf("--max-concurrent") + 1]) || 2
		: 2;
	const force = args.includes("--force");

	logger.info(`🎯 Starting bulk fingerprinting process...`);
	logger.info(`📁 Directory: ${dirPath}`);
	logger.info(`🔢 Start from: ${startFrom}`);
	logger.info(`⚡ Max concurrent: ${maxConcurrent}`);
	logger.info(`🚫 Skip existing: ${!force}`);

	const processor = new BulkFingerprintProcessor();

	try {
		await processor.processSongsInDirectory(dirPath, {
			skipExisting: !force,
			maxConcurrent,
			startFrom,
		});

		logger.info("🎉 Bulk fingerprinting process completed successfully!");
	} catch (error) {
		logger.error(`💥 Bulk fingerprinting process failed: ${error}`);
		process.exit(1);
	}
}

// Run the script if called directly
if (require.main === module) {
	main().catch((error) => {
		console.error("Unhandled error:", error);
		process.exit(1);
	});
}

export { BulkFingerprintProcessor };

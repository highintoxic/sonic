#!/usr/bin/env ts-node

/**
 * Complete Audio Processing Pipeline
 * This script combines validation and bulk fingerprinting in one workflow
 */

import { AudioFileValidator } from "./validate-audio-files";
import { BulkFingerprintProcessor } from "./bulk-fingerprint";
import { logger } from "../src/utils/logger";
import dotenv from "dotenv";
import * as path from "path";
import * as readline from "readline";

// Load environment variables
dotenv.config();

class AudioProcessingPipeline {
	private validator: AudioFileValidator;
	private processor: BulkFingerprintProcessor;

	constructor() {
		this.validator = new AudioFileValidator();
		this.processor = new BulkFingerprintProcessor();
	}

	/**
	 * Ask user for confirmation
	 */
	private async askConfirmation(message: string): Promise<boolean> {
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		return new Promise((resolve) => {
			rl.question(`${message} (y/N): `, (answer) => {
				rl.close();
				resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
			});
		});
	}

	/**
	 * Run complete pipeline: validate first, then process
	 */
	async runPipeline(
		dirPath: string,
		options: {
			skipValidation?: boolean;
			skipExisting?: boolean;
			maxConcurrent?: number;
			startFrom?: number;
			autoConfirm?: boolean;
		} = {}
	): Promise<void> {
		const {
			skipValidation = false,
			skipExisting = true,
			maxConcurrent = 2,
			startFrom = 0,
			autoConfirm = false,
		} = options;

		try {
			logger.info("🚀 Starting Complete Audio Processing Pipeline");
			logger.info(`📁 Directory: ${dirPath}`);

			// Step 1: Validation (unless skipped)
			if (!skipValidation) {
				logger.info("\n📋 Step 1: Validating audio files...");

				const validationResult = this.validator.validateDirectory(dirPath);
				this.validator.printReport(validationResult, dirPath);

				// Stop if there are invalid files
				if (validationResult.invalidFiles.length > 0) {
					if (!autoConfirm) {
						const proceed = await this.askConfirmation(
							"⚠️  Some files have invalid names. Do you want to proceed anyway?"
						);
						if (!proceed) {
							logger.info(
								"❌ Processing cancelled. Please fix invalid filenames and try again."
							);
							return;
						}
					} else {
						logger.warn(
							"⚠️  Auto-confirm enabled. Proceeding despite invalid files."
						);
					}
				}

				// Show summary before processing
				if (validationResult.validFiles.length > 0) {
					logger.info(
						`\n✅ Found ${validationResult.validFiles.length} valid files ready for processing.`
					);

					if (!autoConfirm) {
						const proceed = await this.askConfirmation(
							"🎵 Do you want to proceed with bulk fingerprinting?"
						);
						if (!proceed) {
							logger.info("❌ Processing cancelled by user.");
							return;
						}
					}
				} else {
					logger.error("❌ No valid files found for processing.");
					return;
				}
			}

			// Step 2: Bulk Processing
			logger.info("\n🎤 Step 2: Starting bulk fingerprinting...");

			await this.processor.processSongsInDirectory(dirPath, {
				skipExisting,
				maxConcurrent,
				startFrom,
			});

			logger.info(
				"\n🎉 Complete Audio Processing Pipeline finished successfully!"
			);
		} catch (error) {
			logger.error(`❌ Pipeline failed: ${error}`);
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
Usage: ts-node scripts/process-audio-pipeline.ts <directory> [options]

Arguments:
  <directory>     Path to directory containing audio files

Options:
  --skip-validation        Skip the validation step
  --start-from <number>    Start processing from file number (default: 0)
  --max-concurrent <number> Maximum concurrent processing (default: 2)
  --force                  Process even if song exists in database
  --auto-confirm           Skip all confirmation prompts

Examples:
  ts-node scripts/process-audio-pipeline.ts ./songs
  ts-node scripts/process-audio-pipeline.ts ./songs --skip-validation --force
  ts-node scripts/process-audio-pipeline.ts ./songs --auto-confirm --max-concurrent 1

This pipeline will:
1. Validate all audio filenames (unless --skip-validation)
2. Show validation report and ask for confirmation
3. Process all valid files with bulk fingerprinting
4. Provide detailed progress and final summary

Expected filename format: "number - artist - title.ext"
        `);
		process.exit(1);
	}

	const dirPath = path.resolve(args[0]);
	const skipValidation = args.includes("--skip-validation");
	const startFrom = args.includes("--start-from")
		? parseInt(args[args.indexOf("--start-from") + 1]) || 0
		: 0;
	const maxConcurrent = args.includes("--max-concurrent")
		? parseInt(args[args.indexOf("--max-concurrent") + 1]) || 2
		: 2;
	const force = args.includes("--force");
	const autoConfirm = args.includes("--auto-confirm");

	logger.info("🎯 Initializing Complete Audio Processing Pipeline...");

	const pipeline = new AudioProcessingPipeline();

	try {
		await pipeline.runPipeline(dirPath, {
			skipValidation,
			skipExisting: !force,
			maxConcurrent,
			startFrom,
			autoConfirm,
		});
	} catch (error) {
		logger.error(`💥 Pipeline failed: ${error}`);
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

export { AudioProcessingPipeline };

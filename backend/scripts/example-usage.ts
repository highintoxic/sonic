#!/usr/bin/env ts-node

/**
 * Example usage of the BulkFingerprintProcessor
 * This demonstrates how to use the processor programmatically
 */

import { BulkFingerprintProcessor } from "./bulk-fingerprint";
import { logger } from "../src/utils/logger";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function exampleUsage() {
	const processor = new BulkFingerprintProcessor();

	// Example 1: Basic usage
	try {
		logger.info("Example 1: Basic bulk fingerprinting");
		await processor.processSongsInDirectory("./example-songs", {
			skipExisting: true,
			maxConcurrent: 2,
		});
	} catch (error) {
		logger.error(`Example 1 failed: ${error}`);
	}

	// Example 2: Process with specific options
	try {
		logger.info("Example 2: Custom options");
		await processor.processSongsInDirectory("./more-songs", {
			skipExisting: false, // Force reprocess
			maxConcurrent: 1, // Lower concurrency
			startFrom: 10, // Start from file #10
		});
	} catch (error) {
		logger.error(`Example 2 failed: ${error}`);
	}
}

// Run if called directly
if (require.main === module) {
	exampleUsage().catch(console.error);
}

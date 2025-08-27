#!/usr/bin/env ts-node

/**
 * Audio File Validator
 * Validates audio files in a directory to ensure they follow the expected naming format
 * before running the bulk fingerprinting process
 */

import * as fs from "fs";
import * as path from "path";
import { logger } from "../src/utils/logger";

interface ValidationResult {
	validFiles: string[];
	invalidFiles: { file: string; reason: string; suggestion?: string }[];
	unsupportedFiles: string[];
	totalFiles: number;
}

class AudioFileValidator {
	private readonly SUPPORTED_EXTENSIONS = [
		".mp3",
		".wav",
		".flac",
		".m4a",
		".ogg",
	];

	/**
	 * Validate all audio files in a directory
	 */
	validateDirectory(dirPath: string): ValidationResult {
		const result: ValidationResult = {
			validFiles: [],
			invalidFiles: [],
			unsupportedFiles: [],
			totalFiles: 0,
		};

		try {
			if (!fs.existsSync(dirPath)) {
				throw new Error(`Directory does not exist: ${dirPath}`);
			}

			const files = fs.readdirSync(dirPath);
			const audioFiles = files.filter((file) => {
				const ext = path.extname(file).toLowerCase();
				return this.SUPPORTED_EXTENSIONS.includes(ext);
			});

			result.totalFiles = audioFiles.length;

			for (const file of audioFiles) {
				const validation = this.validateFileName(file);

				if (validation.isValid) {
					result.validFiles.push(file);
				} else {
					result.invalidFiles.push({
						file,
						reason: validation.reason!,
						suggestion: validation.suggestion,
					});
				}
			}

			// Check for unsupported files
			const allFiles = files.filter((file) => {
				const stats = fs.statSync(path.join(dirPath, file));
				return (
					stats.isFile() && !fs.statSync(path.join(dirPath, file)).isDirectory()
				);
			});

			result.unsupportedFiles = allFiles.filter((file) => {
				const ext = path.extname(file).toLowerCase();
				return (
					!this.SUPPORTED_EXTENSIONS.includes(ext) &&
					![".txt", ".md", ".json", ".log"].includes(ext)
				); // Ignore common non-audio files
			});

			return result;
		} catch (error) {
			logger.error(`Error validating directory: ${error}`);
			throw error;
		}
	}

	/**
	 * Validate individual filename
	 */
	private validateFileName(fileName: string): {
		isValid: boolean;
		reason?: string;
		suggestion?: string;
	} {
		const nameWithoutExt = path.parse(fileName).name;
		const parts = nameWithoutExt.split(" - ");

		// Check format: "number - artist - title"
		if (parts.length !== 3) {
			return {
				isValid: false,
				reason: `Expected format: "number - artist - title", but got ${parts.length} parts`,
				suggestion: this.generateSuggestion(nameWithoutExt),
			};
		}

		const [number, artist, title] = parts.map((part) => part.trim());

		// Check if number is present
		if (!number) {
			return {
				isValid: false,
				reason: "Missing track number",
				suggestion: `001 - ${artist} - ${title}`,
			};
		}

		// Check if artist is present
		if (!artist) {
			return {
				isValid: false,
				reason: "Missing artist name",
				suggestion: `${number} - Unknown Artist - ${title}`,
			};
		}

		// Check if title is present
		if (!title) {
			return {
				isValid: false,
				reason: "Missing song title",
				suggestion: `${number} - ${artist} - Unknown Title`,
			};
		}

		// Check if number is numeric (optional but recommended)
		if (!/^\d+$/.test(number)) {
			return {
				isValid: false,
				reason: "Track number should be numeric",
				suggestion: `001 - ${artist} - ${title}`,
			};
		}

		return { isValid: true };
	}

	/**
	 * Generate a suggestion for fixing invalid filenames
	 */
	private generateSuggestion(nameWithoutExt: string): string {
		// Try to extract meaningful parts
		const commonSeparators = [" - ", "_", " by ", " – ", "-"];

		for (const separator of commonSeparators) {
			if (nameWithoutExt.includes(separator)) {
				const parts = nameWithoutExt.split(separator);
				if (parts.length >= 2) {
					const [first, ...rest] = parts;
					return `001 - ${first.trim()} - ${rest.join(" ").trim()}`;
				}
			}
		}

		return `001 - Unknown Artist - ${nameWithoutExt}`;
	}

	/**
	 * Print validation report
	 */
	printReport(result: ValidationResult, dirPath: string): void {
		console.log("\n" + "=".repeat(60));
		console.log("🔍 AUDIO FILE VALIDATION REPORT");
		console.log("=".repeat(60));
		console.log(`📁 Directory: ${dirPath}`);
		console.log(`📊 Total audio files: ${result.totalFiles}`);
		console.log(`✅ Valid files: ${result.validFiles.length}`);
		console.log(`❌ Invalid files: ${result.invalidFiles.length}`);
		console.log(`🚫 Unsupported files: ${result.unsupportedFiles.length}`);

		if (result.validFiles.length > 0) {
			console.log("\n✅ VALID FILES:");
			result.validFiles.forEach((file, index) => {
				console.log(`   ${(index + 1).toString().padStart(3, " ")}. ${file}`);
			});
		}

		if (result.invalidFiles.length > 0) {
			console.log("\n❌ INVALID FILES:");
			result.invalidFiles.forEach((item, index) => {
				console.log(
					`   ${(index + 1).toString().padStart(3, " ")}. ${item.file}`
				);
				console.log(`       📋 Reason: ${item.reason}`);
				if (item.suggestion) {
					console.log(`       💡 Suggestion: ${item.suggestion}`);
				}
				console.log("");
			});
		}

		if (result.unsupportedFiles.length > 0) {
			console.log("\n🚫 UNSUPPORTED FILES:");
			result.unsupportedFiles.forEach((file, index) => {
				console.log(`   ${(index + 1).toString().padStart(3, " ")}. ${file}`);
			});
			console.log(
				`\n   Supported formats: ${this.SUPPORTED_EXTENSIONS.join(", ")}`
			);
		}

		// Summary
		console.log("\n" + "=".repeat(60));
		if (result.invalidFiles.length === 0) {
			console.log("🎉 All audio files are properly formatted!");
			console.log("   You can proceed with bulk fingerprinting.");
		} else {
			console.log("⚠️  Some files need to be renamed before processing.");
			console.log(
				"   Please fix the invalid filenames and run validation again."
			);
		}
		console.log("=".repeat(60) + "\n");
	}
}

/**
 * Main execution function
 */
async function main() {
	const args = process.argv.slice(2);

	if (args.length === 0) {
		console.log(`
Usage: ts-node scripts/validate-audio-files.ts <directory>

Arguments:
  <directory>     Path to directory containing audio files

Examples:
  ts-node scripts/validate-audio-files.ts ./songs
  npm run validate-audio -- ./music-collection

This script will check if your audio files follow the expected naming format:
"number - artist - title.extension"
        `);
		process.exit(1);
	}

	const dirPath = path.resolve(args[0]);

	logger.info(`🔍 Validating audio files in: ${dirPath}`);

	const validator = new AudioFileValidator();

	try {
		const result = validator.validateDirectory(dirPath);
		validator.printReport(result, dirPath);

		// Exit with error code if there are invalid files
		if (result.invalidFiles.length > 0) {
			process.exit(1);
		}
	} catch (error) {
		logger.error(`Validation failed: ${error}`);
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

export { AudioFileValidator };

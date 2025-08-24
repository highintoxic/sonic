import multer from "multer";
import * as path from "path";
import * as fs from "fs";
import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
	fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for audio file uploads
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, uploadsDir);
	},
	filename: (req, file, cb) => {
		// Generate unique filename with timestamp
		const timestamp = Date.now();
		const randomNum = Math.floor(Math.random() * 10000);
		const extension = path.extname(file.originalname).toLowerCase();
		const filename = `${timestamp}_${randomNum}${extension}`;
		cb(null, filename);
	},
});

// File filter for audio files
const fileFilter = (
	req: any,
	file: Express.Multer.File,
	cb: multer.FileFilterCallback
) => {
	// Allowed audio extensions
	const allowedExtensions = [
		".mp3",
		".wav",
		".m4a",
		".flac",
		".aac",
		".ogg",
		".webm",
	];
	const allowedMimeTypes = [
		"audio/mpeg", // MP3
		"audio/wav", // WAV
		"audio/wave", // WAV alternative
		"audio/x-wav", // WAV alternative
		"audio/mp4", // M4A
		"audio/x-m4a", // M4A alternative
		"audio/flac", // FLAC
		"audio/x-flac", // FLAC alternative
		"audio/aac", // AAC
		"audio/ogg", // OGG
		"audio/webm", // WebM
	];

	const extension = path.extname(file.originalname).toLowerCase();
	const mimeType = file.mimetype.toLowerCase();

	if (
		allowedExtensions.includes(extension) ||
		allowedMimeTypes.includes(mimeType)
	) {
		cb(null, true);
	} else {
		logger.warn(
			`Rejected file upload: ${file.originalname} (${file.mimetype})`
		);
		cb(
			new Error(
				`Invalid file type. Allowed types: ${allowedExtensions.join(", ")}`
			)
		);
	}
};

// Configure multer
export const upload = multer({
	storage: storage,
	fileFilter: fileFilter,
	limits: {
		fileSize: 50 * 1024 * 1024, // 50MB max file size
		files: 1, // Only allow one file per request
	},
});

// Middleware for handling upload errors
export const handleUploadError = (
	error: any,
	req: any,
	res: any,
	next: any
) => {
	if (error instanceof multer.MulterError) {
		let message = "File upload error";

		switch (error.code) {
			case "LIMIT_FILE_SIZE":
				message = "File too large. Maximum size is 50MB.";
				break;
			case "LIMIT_FILE_COUNT":
				message = "Too many files. Only one file allowed.";
				break;
			case "LIMIT_UNEXPECTED_FILE":
				message = 'Unexpected field name. Use "audio" field for file uploads.';
				break;
			default:
				message = error.message;
		}

		logger.warn(`File upload error: ${message}`);
		return res.status(400).json({
			success: false,
			error: message,
		});
	}

	if (error.message.includes("Invalid file type")) {
		return res.status(400).json({
			success: false,
			error: error.message,
		});
	}

	next(error);
};


export const uploadAudio = upload.single("audio") as (
	req: Request,
	res: Response,
	next: NextFunction
) => void;


// Cleanup function to remove old temporary files
export const cleanupOldFiles = () => {
	try {
		const files = fs.readdirSync(uploadsDir);
		const now = Date.now();
		const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

		files.forEach((file) => {
			const filePath = path.join(uploadsDir, file);
			const stats = fs.statSync(filePath);

			if (now - stats.mtime.getTime() > maxAge) {
				fs.unlinkSync(filePath);
				logger.info(`Cleaned up old file: ${file}`);
			}
		});
	} catch (error) {
		logger.error(
			`Error cleaning up old files: ${
				error instanceof Error ? error.message : "Unknown error"
			}`
		);
	}
};

// Run cleanup every hour
setInterval(cleanupOldFiles, 60 * 60 * 1000);

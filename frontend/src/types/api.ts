// API Response Types
export interface ApiResponse<T = any> {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
	details?: string;
}

// Song Types
export interface Song {
	id: number;
	title: string;
	artist: string;
	album?: string;
	duration?: number;
	createdAt?: string;
}

// Add Song Request & Response
export interface AddSongRequest {
	audio: File;
	title: string;
	artist: string;
	album?: string;
}

export interface AddSongResponse {
	processingId: string;
	title: string;
	artist: string;
	album?: string;
	status: "processing";
}

// Legacy response type for backward compatibility
export interface AddSongCompletedResponse {
	songId: number;
	title: string;
	artist: string;
	album?: string;
	fingerprintsGenerated: number;
	processingTime: number;
}

// Identify Song Request & Response
export interface IdentifySongRequest {
	audio: File;
}

export interface IdentifySongResponse {
	song: Song;
	confidence: number;
	alignedMatches: number;
	totalQueryFingerprints: number;
	processingTime: number;
}

// Stats Response
export interface StatsResponse {
	totalSongs: number;
	totalFingerprints: number;
	databaseSize: string;
	uptime: number;
}

// API Error Types
export class ApiError extends Error {
	status?: number;
	details?: string;

	constructor(message: string, status?: number, details?: string) {
		super(message);
		this.name = "ApiError";
		this.status = status;
		this.details = details;
	}
}

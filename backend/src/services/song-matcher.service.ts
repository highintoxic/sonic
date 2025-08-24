import { AudioFingerprint } from "./audio-fingerprinter.service";
import { DatabaseService } from "./database.service";
import { logger } from "../utils/logger";

export interface MatchResult {
	songId: number;
	confidence: number;
	alignedMatches: number;
	totalQueryFingerprints: number;
	processingTime: number;
}

export interface FingerprintMatch {
	songId: number;
	timeOffset: number;
	queryTimeOffset: number;
	timeDelta: number;
}

export class SongMatcher {
	private readonly MIN_MATCHES = 5; // Minimum matches for valid identification
	private readonly CONFIDENCE_THRESHOLD = 0.1; // Minimum confidence score
	private readonly TIME_ALIGNMENT_TOLERANCE = 0.1; // Seconds tolerance for alignment

	constructor(private databaseService: DatabaseService) {}

	/**
	 * Identify a song from query fingerprints
	 */
	async identifySong(
		queryFingerprints: AudioFingerprint[]
	): Promise<MatchResult | null> {
		const startTime = Date.now();

		try {
			logger.info(
				`Starting song identification with ${queryFingerprints.length} query fingerprints`
			);

			// Find all potential matches in database
			const matches = await this.findPotentialMatches(queryFingerprints);

			if (matches.length === 0) {
				logger.info("No potential matches found");
				return null;
			}

			// Group matches by song and calculate alignment scores
			const songMatches = this.groupMatchesBySong(matches);
			const alignmentScores = this.calculateAlignmentScores(songMatches);

			// Find best match
			const bestMatch = this.findBestMatch(
				alignmentScores,
				queryFingerprints.length
			);

			const processingTime = Date.now() - startTime;

			if (bestMatch) {
				logger.info(
					`Song identified: ID=${
						bestMatch.songId
					}, confidence=${bestMatch.confidence.toFixed(3)}`
				);
				return {
					...bestMatch,
					processingTime,
				};
			} else {
				logger.info("No confident matches found");
				return null;
			}
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
			logger.error(`Error in song identification: ${errorMsg}`);
			throw error;
		}
	}

	/**
	 * Find potential matches in the database
	 */
	private async findPotentialMatches(
		queryFingerprints: AudioFingerprint[]
	): Promise<FingerprintMatch[]> {
		const matches: FingerprintMatch[] = [];

		// Batch lookup fingerprints for efficiency
		const batchSize = 100;
		for (let i = 0; i < queryFingerprints.length; i += batchSize) {
			const batch = queryFingerprints.slice(i, i + batchSize);
			const batchMatches = await this.databaseService.findMatchingFingerprints(
				batch
			);
			matches.push(...batchMatches);
		}

		return matches;
	}

	/**
	 * Group matches by song ID
	 */
	private groupMatchesBySong(
		matches: FingerprintMatch[]
	): Map<number, FingerprintMatch[]> {
		const songMatches = new Map<number, FingerprintMatch[]>();

		for (const match of matches) {
			if (!songMatches.has(match.songId)) {
				songMatches.set(match.songId, []);
			}
			songMatches.get(match.songId)!.push(match);
		}

		return songMatches;
	}

	/**
	 * Calculate alignment scores for each song
	 */
	private calculateAlignmentScores(
		songMatches: Map<number, FingerprintMatch[]>
	): Map<number, AlignmentScore> {
		const alignmentScores = new Map<number, AlignmentScore>();

		for (const [songId, matches] of songMatches) {
			if (matches.length < this.MIN_MATCHES) continue;

			const score = this.calculateSingleAlignmentScore(matches);
			if (score.confidence >= this.CONFIDENCE_THRESHOLD) {
				alignmentScores.set(songId, score);
			}
		}

		return alignmentScores;
	}

	/**
	 * Calculate alignment score for a single song
	 */
	private calculateSingleAlignmentScore(
		matches: FingerprintMatch[]
	): AlignmentScore {
		// Calculate time deltas (database_time - query_time)
		const timeDeltas = matches.map((match) => match.timeDelta);

		// Find the most common time delta (this represents the temporal alignment)
		const deltaHistogram = this.createDeltaHistogram(
			timeDeltas,
			this.TIME_ALIGNMENT_TOLERANCE
		);
		const bestAlignment = this.findBestAlignment(deltaHistogram);

		if (!bestAlignment) {
			return { alignedMatches: 0, confidence: 0, timeOffset: 0 };
		}

		// Count matches that align with the best time delta
		const alignedMatches = timeDeltas.filter(
			(delta) =>
				Math.abs(delta - bestAlignment.delta) <= this.TIME_ALIGNMENT_TOLERANCE
		).length;

		// Calculate confidence based on aligned matches ratio
		const confidence = alignedMatches / matches.length;

		return {
			alignedMatches,
			confidence,
			timeOffset: bestAlignment.delta,
		};
	}

	/**
	 * Create histogram of time deltas
	 */
	private createDeltaHistogram(
		timeDeltas: number[],
		tolerance: number
	): Map<number, number> {
		const histogram = new Map<number, number>();

		for (const delta of timeDeltas) {
			// Quantize delta to tolerance bins
			const quantizedDelta = Math.round(delta / tolerance) * tolerance;
			histogram.set(quantizedDelta, (histogram.get(quantizedDelta) || 0) + 1);
		}

		return histogram;
	}

	/**
	 * Find the time delta with the most matches
	 */
	private findBestAlignment(
		histogram: Map<number, number>
	): { delta: number; count: number } | null {
		let bestDelta = 0;
		let maxCount = 0;

		for (const [delta, count] of histogram) {
			if (count > maxCount) {
				maxCount = count;
				bestDelta = delta;
			}
		}

		return maxCount >= this.MIN_MATCHES
			? { delta: bestDelta, count: maxCount }
			: null;
	}

	/**
	 * Find the best match among all songs
	 */
	private findBestMatch(
		alignmentScores: Map<number, AlignmentScore>,
		totalQueryFingerprints: number
	): MatchResult | null {
		let bestMatch: MatchResult | null = null;
		let highestScore = 0;

		for (const [songId, score] of alignmentScores) {
			// Combined score based on confidence and number of aligned matches
			const combinedScore =
				score.confidence * (score.alignedMatches / totalQueryFingerprints);

			if (combinedScore > highestScore) {
				highestScore = combinedScore;
				bestMatch = {
					songId,
					confidence: score.confidence,
					alignedMatches: score.alignedMatches,
					totalQueryFingerprints,
					processingTime: 0, // Will be set by caller
				};
			}
		}

		return bestMatch;
	}
}

interface AlignmentScore {
	alignedMatches: number;
	confidence: number;
	timeOffset: number;
}

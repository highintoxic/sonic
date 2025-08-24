import * as fs from 'fs';
import * as path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import * as fft from 'fft-js';
import { logger } from '../utils/logger';

export interface AudioFingerprint {
  hash: bigint;
  timeOffset: number;
}

export interface Peak {
  frequency: number;
  time: number;
  magnitude: number;
}

export class AudioFingerprinter {
  private readonly SAMPLE_RATE = 22050; // Hz
  private readonly WINDOW_SIZE = 4096; // FFT window size
  private readonly HOP_LENGTH = 1024; // Samples between windows
  private readonly MIN_HASH_TIME_DELTA = 0.5; // Minimum time difference for hash pairs
  private readonly MAX_HASH_TIME_DELTA = 3.0; // Maximum time difference for hash pairs
  private readonly PEAK_NEIGHBORHOOD_SIZE = 20; // Local maxima neighborhood
  private readonly MIN_AMPLITUDE = 10; // Minimum amplitude for peak detection
  private readonly FANOUT = 15; // Number of target points per anchor

  /**
   * Main method to generate fingerprints from audio file
   */
  async generateFingerprints(audioFilePath: string): Promise<AudioFingerprint[]> {
    try {
      logger.info(`Starting fingerprint generation for: ${audioFilePath}`);
      
      // Extract raw PCM data from audio file
      const audioData = await this.extractAudioData(audioFilePath);
      
      // Generate spectrogram using FFT
      const spectrogram = this.generateSpectrogram(audioData);
      
      // Find peaks in the spectrogram
      const peaks = this.findPeaks(spectrogram);
      
      // Convert peaks to fingerprint hashes
      const fingerprints = this.peaksToFingerprints(peaks);
      
      logger.info(`Generated ${fingerprints.length} fingerprints for ${audioFilePath}`);
      return fingerprints;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
      logger.error(`Error generating fingerprints: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Extract PCM audio data from various audio formats
   */
  private async extractAudioData(audioFilePath: string): Promise<Float32Array> {
    return new Promise((resolve, reject) => {
      const outputPath = path.join(path.dirname(audioFilePath), `temp_${Date.now()}.raw`);
      
      ffmpeg(audioFilePath)
        .audioChannels(1) // Convert to mono
        .audioFrequency(this.SAMPLE_RATE) // Set sample rate
        .audioCodec('pcm_f32le') // 32-bit float PCM
        .format('f32le')
        .output(outputPath)
        .on('end', () => {
          try {
            // Read raw PCM data
            const buffer = fs.readFileSync(outputPath);
            const audioData = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.length / 4);
            
            // Clean up temporary file
            fs.unlinkSync(outputPath);
            
            resolve(audioData);
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (error) => {
          // Clean up on error
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
          }
          reject(error);
        })
        .run();
    });
  }

  /**
   * Generate spectrogram using sliding window FFT
   */
  private generateSpectrogram(audioData: Float32Array): number[][] {
    const spectrogram: number[][] = [];
    const windowFunction = this.generateHannWindow(this.WINDOW_SIZE);
    
    for (let i = 0; i <= audioData.length - this.WINDOW_SIZE; i += this.HOP_LENGTH) {
      // Extract window and apply Hann window
      const window = new Array(this.WINDOW_SIZE);
      for (let j = 0; j < this.WINDOW_SIZE; j++) {
        window[j] = audioData[i + j] * windowFunction[j];
      }
      
      // Compute FFT
      const fftResult = fft.fft(window);
      
      // Convert to magnitude spectrum (only first half due to symmetry)
      const magnitudes = new Array(this.WINDOW_SIZE / 2);
      for (let j = 0; j < this.WINDOW_SIZE / 2; j++) {
        const real = fftResult[j][0];
        const imag = fftResult[j][1];
        magnitudes[j] = Math.sqrt(real * real + imag * imag);
      }
      
      spectrogram.push(magnitudes);
    }
    
    return spectrogram;
  }

  /**
   * Generate Hann window for FFT preprocessing
   */
  private generateHannWindow(size: number): number[] {
    const window = new Array(size);
    for (let i = 0; i < size; i++) {
      window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (size - 1)));
    }
    return window;
  }

  /**
   * Find prominent peaks in spectrogram (constellation map approach)
   */
  private findPeaks(spectrogram: number[][]): Peak[] {
    const peaks: Peak[] = [];
    const timeFrames = spectrogram.length;
    const frequencyBins = spectrogram[0].length;
    
    for (let t = 0; t < timeFrames; t++) {
      for (let f = 0; f < frequencyBins; f++) {
        const magnitude = spectrogram[t][f];
        
        if (magnitude < this.MIN_AMPLITUDE) continue;
        
        // Check if this is a local maximum
        if (this.isLocalMaximum(spectrogram, t, f, this.PEAK_NEIGHBORHOOD_SIZE)) {
          const timeInSeconds = (t * this.HOP_LENGTH) / this.SAMPLE_RATE;
          const frequencyInHz = (f * this.SAMPLE_RATE) / (2 * (frequencyBins - 1));
          
          peaks.push({
            frequency: frequencyInHz,
            time: timeInSeconds,
            magnitude: magnitude
          });
        }
      }
    }
    
    // Sort peaks by magnitude (strongest first) and limit number
    peaks.sort((a, b) => b.magnitude - a.magnitude);
    return peaks.slice(0, 10000); // Keep top 10k peaks
  }

  /**
   * Check if a point is a local maximum in its neighborhood
   */
  private isLocalMaximum(spectrogram: number[][], t: number, f: number, neighborhoodSize: number): boolean {
    const magnitude = spectrogram[t][f];
    const halfSize = Math.floor(neighborhoodSize / 2);
    
    for (let dt = -halfSize; dt <= halfSize; dt++) {
      for (let df = -halfSize; df <= halfSize; df++) {
        if (dt === 0 && df === 0) continue;
        
        const nt = t + dt;
        const nf = f + df;
        
        if (nt >= 0 && nt < spectrogram.length && nf >= 0 && nf < spectrogram[0].length) {
          if (spectrogram[nt][nf] >= magnitude) {
            return false;
          }
        }
      }
    }
    
    return true;
  }

  /**
   * Convert peaks to fingerprint hashes using anchor-target approach
   */
  private peaksToFingerprints(peaks: Peak[]): AudioFingerprint[] {
    const fingerprints: AudioFingerprint[] = [];
    
    // Sort peaks by time
    peaks.sort((a, b) => a.time - b.time);
    
    for (let i = 0; i < peaks.length; i++) {
      const anchor = peaks[i];
      let targetCount = 0;
      
      for (let j = i + 1; j < peaks.length && targetCount < this.FANOUT; j++) {
        const target = peaks[j];
        const timeDelta = target.time - anchor.time;
        
        if (timeDelta < this.MIN_HASH_TIME_DELTA) continue;
        if (timeDelta > this.MAX_HASH_TIME_DELTA) break;
        
        // Create fingerprint hash from anchor and target
        const hash = this.createHash(anchor.frequency, target.frequency, timeDelta);
        
        fingerprints.push({
          hash: BigInt(hash),
          timeOffset: anchor.time
        });
        
        targetCount++;
      }
    }
    
    return fingerprints;
  }

  /**
   * Create a hash from two frequencies and their time delta
   * This is a simplified version of the Shazam hash function
   */
  private createHash(f1: number, f2: number, timeDelta: number): number {
    // Quantize frequencies to reduce noise sensitivity
    const quantizedF1 = Math.floor(f1 / 10) * 10;
    const quantizedF2 = Math.floor(f2 / 10) * 10;
    const quantizedDelta = Math.floor(timeDelta * 100) / 100;
    
    // Create hash using bit shifting and XOR
    let hash = 0;
    hash = (hash * 31 + quantizedF1) >>> 0;
    hash = (hash * 31 + quantizedF2) >>> 0;
    hash = (hash * 31 + Math.floor(quantizedDelta * 1000)) >>> 0;
    
    return hash;
  }

  /**
   * Get audio duration from file
   */
  async getAudioDuration(audioFilePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(audioFilePath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          resolve(metadata.format.duration || 0);
        }
      });
    });
  }
}

/**
 * Manual WAV encoder utility for Web Audio API PCM data
 * Converts raw PCM audio data to WAV format without external dependencies
 */

export interface WAVEncoderOptions {
	sampleRate?: number;
	channels?: number;
	bitDepth?: 16 | 24 | 32;
}

export class WAVEncoder {
	private sampleRate: number;
	private channels: number;
	private bitDepth: 16 | 24 | 32;

	constructor(options: WAVEncoderOptions = {}) {
		this.sampleRate = options.sampleRate || 44100;
		this.channels = options.channels || 1;
		this.bitDepth = options.bitDepth || 16;
	}

	/**
	 * Convert Float32Array PCM data to WAV format
	 */
	encodeWAV(pcmData: Float32Array): ArrayBuffer {
		const bytesPerSample = this.bitDepth / 8;
		const blockAlign = this.channels * bytesPerSample;
		const byteRate = this.sampleRate * blockAlign;
		const dataSize = pcmData.length * bytesPerSample;
		const fileSize = 36 + dataSize;

		const buffer = new ArrayBuffer(44 + dataSize);
		const view = new DataView(buffer);

		// WAV file header
		this.writeString(view, 0, "RIFF");
		view.setUint32(4, fileSize, true);
		this.writeString(view, 8, "WAVE");
		this.writeString(view, 12, "fmt ");
		view.setUint32(16, 16, true); // PCM chunk size
		view.setUint16(20, 1, true); // PCM format
		view.setUint16(22, this.channels, true);
		view.setUint32(24, this.sampleRate, true);
		view.setUint32(28, byteRate, true);
		view.setUint16(32, blockAlign, true);
		view.setUint16(34, this.bitDepth, true);
		this.writeString(view, 36, "data");
		view.setUint32(40, dataSize, true);

		// Convert and write PCM data
		this.writePCMData(view, 44, pcmData);

		return buffer;
	}

	/**
	 * Convert AudioBuffer to WAV format
	 */
	encodeAudioBuffer(audioBuffer: AudioBuffer): ArrayBuffer {
		// Merge channels if stereo
		let pcmData: Float32Array;

		if (audioBuffer.numberOfChannels === 1) {
			pcmData = audioBuffer.getChannelData(0);
		} else {
			// Mix down to mono by averaging channels
			const length = audioBuffer.length;
			pcmData = new Float32Array(length);

			for (let i = 0; i < length; i++) {
				let sum = 0;
				for (
					let channel = 0;
					channel < audioBuffer.numberOfChannels;
					channel++
				) {
					sum += audioBuffer.getChannelData(channel)[i];
				}
				pcmData[i] = sum / audioBuffer.numberOfChannels;
			}
		}

		return this.encodeWAV(pcmData);
	}

	/**
	 * Process MediaStream using Web Audio API and encode to WAV
	 */
	async recordFromStream(
		stream: MediaStream,
		duration: number = 10000 // Duration in milliseconds
	): Promise<ArrayBuffer> {
		return new Promise((resolve, reject) => {
			// Create AudioContext without forcing sample rate - use the default/native rate
			const audioContext = new AudioContext();
			const source = audioContext.createMediaStreamSource(stream);

			// Create ScriptProcessorNode for audio processing
			const bufferSize = 4096;
			const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);

			const audioChunks: Float32Array[] = [];
			let isRecording = true;
			const actualSampleRate = audioContext.sampleRate; // Get the actual sample rate

			processor.onaudioprocess = (event) => {
				if (!isRecording) return;

				const inputData = event.inputBuffer.getChannelData(0);
				// Copy the data to avoid reference issues
				const chunk = new Float32Array(inputData);
				audioChunks.push(chunk);
			};

			// Connect the audio graph
			source.connect(processor);
			processor.connect(audioContext.destination);

			// Stop recording after specified duration
			const timer = setTimeout(() => {
				isRecording = false;
				processor.disconnect();
				source.disconnect();
				audioContext.close();

				// Combine all chunks
				const totalLength = audioChunks.reduce(
					(sum, chunk) => sum + chunk.length,
					0
				);
				const combinedData = new Float32Array(totalLength);

				let offset = 0;
				for (const chunk of audioChunks) {
					combinedData.set(chunk, offset);
					offset += chunk.length;
				}

				try {
					// Create a temporary encoder with the actual sample rate
					const tempEncoder = new WAVEncoder({
						sampleRate: actualSampleRate,
						channels: this.channels,
						bitDepth: this.bitDepth,
					});
					const wavBuffer = tempEncoder.encodeWAV(combinedData);
					resolve(wavBuffer);
				} catch (error) {
					reject(error);
				}
			}, duration);

			// Handle errors
			audioContext.addEventListener("error", (event) => {
				clearTimeout(timer);
				isRecording = false;
				reject(new Error(`AudioContext error: ${event}`));
			});

			processor.addEventListener("error", (event) => {
				clearTimeout(timer);
				isRecording = false;
				reject(new Error(`ScriptProcessor error: ${event}`));
			});
		});
	}

	/**
	 * Create a manual recorder that can be controlled externally
	 */
	createManualRecorder(stream: MediaStream): {
		start: () => void;
		stop: () => Promise<ArrayBuffer>;
		isRecording: () => boolean;
	} {
		// Create AudioContext without forcing sample rate - use the default/native rate
		const audioContext = new AudioContext();
		const source = audioContext.createMediaStreamSource(stream);
		const bufferSize = 4096;
		const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);

		const audioChunks: Float32Array[] = [];
		let isRecording = false;
		let actualSampleRate = audioContext.sampleRate; // Use the actual context sample rate

		processor.onaudioprocess = (event) => {
			if (!isRecording) return;

			const inputData = event.inputBuffer.getChannelData(0);
			const chunk = new Float32Array(inputData);
			audioChunks.push(chunk);
		};

		// Connect the audio graph
		source.connect(processor);
		processor.connect(audioContext.destination);

		return {
			start: () => {
				audioChunks.length = 0; // Clear previous data
				actualSampleRate = audioContext.sampleRate; // Update sample rate
				isRecording = true;
			},

			stop: async () => {
				isRecording = false;
				processor.disconnect();
				source.disconnect();
				await audioContext.close();

				// Combine all chunks
				const totalLength = audioChunks.reduce(
					(sum, chunk) => sum + chunk.length,
					0
				);
				const combinedData = new Float32Array(totalLength);

				let offset = 0;
				for (const chunk of audioChunks) {
					combinedData.set(chunk, offset);
					offset += chunk.length;
				}

				// Create a temporary encoder with the actual sample rate
				const tempEncoder = new WAVEncoder({
					sampleRate: actualSampleRate,
					channels: this.channels,
					bitDepth: this.bitDepth,
				});

				return tempEncoder.encodeWAV(combinedData);
			},

			isRecording: () => isRecording,
		};
	}

	private writeString(view: DataView, offset: number, string: string): void {
		for (let i = 0; i < string.length; i++) {
			view.setUint8(offset + i, string.charCodeAt(i));
		}
	}

	private writePCMData(
		view: DataView,
		offset: number,
		pcmData: Float32Array
	): void {
		if (this.bitDepth === 16) {
			for (let i = 0; i < pcmData.length; i++) {
				// Convert float32 (-1 to 1) to int16 (-32768 to 32767)
				const sample = Math.max(-1, Math.min(1, pcmData[i]));
				const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
				view.setInt16(offset + i * 2, intSample, true);
			}
		} else if (this.bitDepth === 24) {
			for (let i = 0; i < pcmData.length; i++) {
				const sample = Math.max(-1, Math.min(1, pcmData[i]));
				const intSample = sample < 0 ? sample * 0x800000 : sample * 0x7fffff;
				const bytes = [
					intSample & 0xff,
					(intSample >> 8) & 0xff,
					(intSample >> 16) & 0xff,
				];
				view.setUint8(offset + i * 3, bytes[0]);
				view.setUint8(offset + i * 3 + 1, bytes[1]);
				view.setUint8(offset + i * 3 + 2, bytes[2]);
			}
		} else if (this.bitDepth === 32) {
			for (let i = 0; i < pcmData.length; i++) {
				const sample = Math.max(-1, Math.min(1, pcmData[i]));
				const intSample =
					sample < 0 ? sample * 0x80000000 : sample * 0x7fffffff;
				view.setInt32(offset + i * 4, intSample, true);
			}
		}
	}
}

/**
 * Utility function to create a File object from WAV ArrayBuffer
 */
export function createWAVFile(
	wavBuffer: ArrayBuffer,
	filename: string = "recorded-audio.wav"
): File {
	const blob = new Blob([wavBuffer], { type: "audio/wav" });
	return new File([blob], filename, { type: "audio/wav" });
}

/**
 * Utility function to create a Blob URL from WAV ArrayBuffer for playback
 */
export function createWAVBlobURL(wavBuffer: ArrayBuffer): string {
	const blob = new Blob([wavBuffer], { type: "audio/wav" });
	return URL.createObjectURL(blob);
}

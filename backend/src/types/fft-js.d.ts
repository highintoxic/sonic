declare module "fft-js" {
	// FFT functions
	export function fft(input: number[]): number[][];
	export function ifft(input: number[][]): number[];

	// Utility functions
	export namespace util {
		function fftFreq(n: number, sampleRate: number): number[];
		function fftMag(fft: number[][]): number[];
		function complex(d: number[]): number[][];
	}
}

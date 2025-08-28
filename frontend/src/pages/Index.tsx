import { useState, useRef, useEffect } from "react";
import { FileUpload } from "@/components/FileUpload";
import { Turntable } from "@/components/Turntable";
import { FloatingNav } from "@/components/FloatingNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useShazam } from "@/hooks/use-shazam";
import { validateAudioFile } from "@/utils/api-test";
import { WAVEncoder, createWAVFile } from "@/utils/wav-encoder";
import { IdentifySongResponse } from "@/types/api";
import {
	Disc3,
	Volume2,
	VolumeX,
	AlertCircle,
	Clock,
	Target,
	Mic,
	Square,
	Play,
	Pause,
} from "lucide-react";

const Index = () => {
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [result, setResult] = useState<IdentifySongResponse | null>(null);
	const [noMatch, setNoMatch] = useState(false);
	const [isRecording, setIsRecording] = useState(false);
	const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const mediaStreamRef = useRef<MediaStream | null>(null);
	const wavEncoderRef = useRef<{
		stop: () => Promise<ArrayBuffer>;
		isRecording: () => boolean;
	} | null>(null);
	const { toast } = useToast();
	const {
		identifySong,
		isLoading: isRecognizing,
		error,
		clearError,
	} = useShazam();

	// Cleanup audio URL on component unmount
	useEffect(() => {
		return () => {
			if (recordedAudioUrl) {
				URL.revokeObjectURL(recordedAudioUrl);
			}
			// Stop media stream tracks to release microphone on unmount
			if (mediaStreamRef.current) {
				mediaStreamRef.current.getTracks().forEach((track) => track.stop());
			}
		};
	}, [recordedAudioUrl]);

	const handleFileSelect = (file: File) => {
		// Validate file before accepting it
		const validation = validateAudioFile(file);

		if (!validation.isValid) {
			toast({
				title: "Invalid File",
				description: validation.message,
				variant: "destructive",
			});
			return;
		}

		setSelectedFile(file);
		setResult(null);
		setNoMatch(false);
		// Clear previous recorded audio when selecting a new file
		if (recordedAudioUrl) {
			URL.revokeObjectURL(recordedAudioUrl);
		}
		// Pause any currently playing audio
		if (audioRef.current && isPlaying) {
			audioRef.current.pause();
		}
		// Create URL for audio preview (works for both uploaded and recorded files)
		const audioUrl = URL.createObjectURL(file);
		setRecordedAudioUrl(audioUrl);
		setIsPlaying(false);
		clearError(); // Clear any previous errors
		toast({
			title: "File Selected",
			description: `${file.name} ready for recognition`,
		});
	};

	const handleRecognize = async () => {
		if (!selectedFile) return;

		try {
			const response = await identifySong({ audio: selectedFile });

			if (response) {
				setResult(response);
				setNoMatch(false);
				toast({
					title: "Recognition Complete",
					description: `Found: ${response.song.title} by ${response.song.artist}`,
				});
			} else {
				setResult(null);
				setNoMatch(true);
				toast({
					title: "No Match Found",
					description: "This song is not in our database",
					variant: "destructive",
				});
			}
		} catch (err) {
			// Error is already handled by the hook
			console.error("Recognition error:", err);
			setResult(null);
			setNoMatch(false);
		}
	};

	const handleStartRecording = async () => {
		try {
			// Clear previous results
			setResult(null);
			setNoMatch(false);
			// Clear previous recorded audio
			if (recordedAudioUrl) {
				URL.revokeObjectURL(recordedAudioUrl);
				setRecordedAudioUrl(null);
			}
			// Pause any currently playing audio
			if (audioRef.current && isPlaying) {
				audioRef.current.pause();
			}
			setIsPlaying(false);
			clearError();

			// Stop any existing media stream before starting new one
			if (mediaStreamRef.current) {
				mediaStreamRef.current.getTracks().forEach((track) => track.stop());
				mediaStreamRef.current = null;
			}

			// Request microphone permission with optimized settings for audio fingerprinting
			// Remove sampleRate constraint to avoid conflicts with AudioContext
			const audioSettings = {
				audio: {
					channelCount: 1, // Mono for consistent processing
					echoCancellation: false, // Preserve original audio characteristics
					autoGainControl: false, // Maintain volume levels
					noiseSuppression: false, // Don't filter out audio content
				},
			};

			const stream = await navigator.mediaDevices.getUserMedia(audioSettings);

			// Store the stream reference for cleanup
			mediaStreamRef.current = stream;

			// Create WAV encoder - will adapt to the actual stream sample rate
			const wavEncoder = new WAVEncoder({
				channels: 1,
				bitDepth: 16, // Standard WAV format
				// sampleRate will be determined by the AudioContext
			});

			// Create manual recorder for precise control
			const recorder = wavEncoder.createManualRecorder(stream);
			wavEncoderRef.current = recorder;

			// Start recording
			recorder.start();
			setIsRecording(true);

			toast({
				title: "Recording Started",
				description:
					"Recording with Web Audio API. Play music near your microphone for identification",
			});
		} catch (error) {
			console.error("Recording failed:", error);

			// Clean up any partially created stream
			if (mediaStreamRef.current) {
				mediaStreamRef.current.getTracks().forEach((track) => track.stop());
				mediaStreamRef.current = null;
			}

			toast({
				title: "Recording Failed",
				description:
					error instanceof Error
						? error.message
						: "Could not access microphone",
				variant: "destructive",
			});
		}
	};

	const handleStopRecording = async () => {
		if (wavEncoderRef.current && isRecording) {
			try {
				// Stop recording and get WAV buffer
				const wavBuffer = await wavEncoderRef.current.stop();

				// Create WAV file
				const file = createWAVFile(wavBuffer, "recorded-audio.wav");

				// Check if the recorded file has content
				if (file.size === 0) {
					toast({
						title: "Recording Error",
						description: "Recorded file is empty",
						variant: "destructive",
					});
					setIsRecording(false);
					return;
				}

				// Use handleFileSelect to set up the file and preview
				setSelectedFile(file);
				// Create URL for audio preview
				const audioUrl = URL.createObjectURL(file);
				setRecordedAudioUrl(audioUrl);
				setIsRecording(false);
				wavEncoderRef.current = null;

				// Stop all media stream tracks to release microphone
				if (mediaStreamRef.current) {
					mediaStreamRef.current.getTracks().forEach((track) => track.stop());
					mediaStreamRef.current = null;
				}

				toast({
					title: "Recording Complete",
					description: `Recorded ${(file.size / 1024).toFixed(
						1
					)} KB of WAV audio. Processing...`,
				});

				// Automatically identify the recorded song
				try {
					const response = await identifySong({ audio: file });

					if (response) {
						setResult(response);
						setNoMatch(false);
						toast({
							title: "Song Identified!",
							description: `Found: ${response.song.title} by ${response.song.artist}`,
						});
					} else {
						setResult(null);
						setNoMatch(true);
						toast({
							title: "No Match Found",
							description: "This song is not in our database",
							variant: "destructive",
						});
					}
				} catch (err) {
					// Error is already handled by the hook
					console.error("Recognition error:", err);
					setResult(null);
					setNoMatch(false);
					toast({
						title: "Recognition Failed",
						description: "Could not identify the recorded audio",
						variant: "destructive",
					});
				}
			} catch (error) {
				console.error("Error stopping recording:", error);
				setIsRecording(false);
				wavEncoderRef.current = null;

				// Stop all media stream tracks to release microphone
				if (mediaStreamRef.current) {
					mediaStreamRef.current.getTracks().forEach((track) => track.stop());
					mediaStreamRef.current = null;
				}

				toast({
					title: "Recording Error",
					description: "Failed to process recorded audio",
					variant: "destructive",
				});
			}
		}
	};

	const handlePlayPause = () => {
		if (!audioRef.current || !recordedAudioUrl) return;

		if (isPlaying) {
			audioRef.current.pause();
			setIsPlaying(false);
		} else {
			audioRef.current
				.play()
				.then(() => {
					setIsPlaying(true);
				})
				.catch((error) => {
					console.error("Audio play error:", error);
					toast({
						title: "Playback Error",
						description: "Could not play the audio file",
						variant: "destructive",
					});
				});
		}
	};

	const handleAudioEnded = () => {
		setIsPlaying(false);
	};

	const handleAudioError = () => {
		setIsPlaying(false);
		toast({
			title: "Audio Error",
			description: "There was an error with the audio file",
			variant: "destructive",
		});
	};

	return (
		<div className='min-h-screen bg-background'>
			<FloatingNav />

			<main className='container mx-auto px-4 py-8 pb-32'>
				<div className='max-w-2xl mx-auto text-center space-y-10'>
					{/* Header */}
					<div className='space-y-4'>
						<div className='flex justify-center'>
							<Turntable size='lg' spinning={isRecognizing} />
						</div>
						<div>
							<h1 className='text-4xl font-bold font-mono tracking-tight mb-2'>
								SONIC
							</h1>
							<p className='text-lg text-muted-foreground font-mono'>
								IDENTIFY ANY TRACK
							</p>
						</div>
					</div>

					{/* Error Display */}
					{error && (
						<Card className='p-4 bg-destructive/10 border-destructive'>
							<div className='flex items-center gap-3'>
								<AlertCircle className='h-5 w-5 text-destructive' />
								<div className='flex-1 text-left'>
									<p className='font-mono font-bold text-sm text-destructive'>
										Recognition Failed
									</p>
									<p className='text-xs text-destructive/80'>{error}</p>
								</div>
								<Button
									variant='outline'
									size='sm'
									onClick={clearError}
									className='text-destructive border-destructive hover:bg-destructive/10'
								>
									Dismiss
								</Button>
							</div>
						</Card>
					)}

					{/* Upload Section */}
					<div className='space-y-6'>
						<FileUpload onFileSelect={handleFileSelect} />
						<div className='flex justify-center'>
							<Button
								onClick={
									isRecording ? handleStopRecording : handleStartRecording
								}
								variant={isRecording ? "destructive" : "outline"}
								className='font-mono'
								size='lg'
							>
								{isRecording ? (
									<>
										<Square className='mr-2 h-5 w-5' />
										STOP RECORDING
									</>
								) : (
									<>
										<Mic className='mr-2 h-5 w-5' />
										RECORD AUDIO
									</>
								)}
							</Button>
						</div>

						{selectedFile && (
							<Card className='p-6 bg-card border-2 border-border'>
								<div className='flex items-center gap-4'>
									<Volume2 className='h-8 w-8 text-accent' />
									<div className='text-left flex-1'>
										<p className='font-mono font-bold'>{selectedFile.name}</p>
										<p className='text-sm text-muted-foreground'>
											{(selectedFile.size / 1024 / 1024).toFixed(2)} MB
										</p>
										{recordedAudioUrl && (
											<p className='text-xs text-muted-foreground font-mono mt-1'>
												Audio preview available
											</p>
										)}
									</div>
									<div className='flex gap-2'>
										{recordedAudioUrl && (
											<Button
												onClick={handlePlayPause}
												variant={isPlaying ? "default" : "outline"}
												size='sm'
												className={`font-mono ${
													isPlaying
														? "bg-accent hover:bg-accent/90 text-accent-foreground"
														: ""
												}`}
											>
												{isPlaying ? (
													<>
														<Pause className='mr-2 h-4 w-4' />
														PAUSE
													</>
												) : (
													<>
														<Play className='mr-2 h-4 w-4' />
														PREVIEW
													</>
												)}
											</Button>
										)}
										<Button
											onClick={handleRecognize}
											disabled={isRecognizing}
											className='font-mono bg-accent hover:bg-accent/90 text-accent-foreground'
										>
											{isRecognizing ? "ANALYZING..." : "RECOGNIZE"}
										</Button>
									</div>
								</div>

								{/* Hidden audio element for playback */}
								{recordedAudioUrl && (
									<audio
										ref={audioRef}
										src={recordedAudioUrl}
										onEnded={handleAudioEnded}
										onError={handleAudioError}
										className='hidden'
									/>
								)}
							</Card>
						)}

						{/* Success Results */}
						{result && (
							<Card className='p-8 bg-card border-2 border-accent'>
								<div className='flex items-center gap-4 mb-6'>
									<Disc3 className='h-8 w-8 text-accent' />
									<span className='font-mono text-accent font-bold'>
										MATCH FOUND
									</span>
								</div>
								<div className='text-left space-y-4'>
									<div>
										<p className='text-2xl font-bold font-mono'>
											{result.song.title}
										</p>
										<p className='text-lg text-muted-foreground font-mono'>
											by {result.song.artist}
										</p>
										{result.song.album && (
											<p className='text-sm text-muted-foreground font-mono'>
												from "{result.song.album}"
											</p>
										)}
									</div>

									{/* Match Statistics */}
									<div className='grid grid-cols-2 gap-4 pt-4 border-t border-border'>
										<div className='flex items-center gap-2'>
											<Target className='h-4 w-4 text-accent' />
											<div>
												<p className='text-xs font-mono text-muted-foreground'>
													CONFIDENCE
												</p>
												<p className='font-mono font-bold'>
													{(result.confidence * 100).toFixed(1)}%
												</p>
											</div>
										</div>
										<div className='flex items-center gap-2'>
											<Clock className='h-4 w-4 text-accent' />
											<div>
												<p className='text-xs font-mono text-muted-foreground'>
													PROCESSING TIME
												</p>
												<p className='font-mono font-bold'>
													{(result.processingTime.toFixed(2) as any as number) /
														1000}
													s
												</p>
											</div>
										</div>
									</div>
								</div>
							</Card>
						)}

						{/* No Match Results */}
						{noMatch && (
							<Card className='p-8 bg-card border-2 border-muted'>
								<div className='flex items-center gap-4 mb-4'>
									<AlertCircle className='h-8 w-8 text-muted-foreground' />
									<span className='font-mono text-muted-foreground font-bold'>
										NO MATCH FOUND
									</span>
								</div>
								<div className='text-left space-y-2'>
									<p className='font-mono text-sm text-muted-foreground'>
										This track is not in our database yet.
									</p>
									<p className='font-mono text-sm text-muted-foreground'>
										You can help by adding it to the collection!
									</p>
								</div>
							</Card>
						)}
					</div>
				</div>
			</main>
		</div>
	);
};

export default Index;

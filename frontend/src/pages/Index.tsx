import { useState, useRef } from "react";
import { FileUpload } from "@/components/FileUpload";
import { Turntable } from "@/components/Turntable";
import { FloatingNav } from "@/components/FloatingNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useShazam } from "@/hooks/use-shazam";
import { validateAudioFile } from "@/utils/api-test";
import { IdentifySongResponse } from "@/types/api";
import {
	Disc3,
	Volume2,
	AlertCircle,
	Clock,
	Target,
	Mic,
	Square,
} from "lucide-react";

const Index = () => {
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [result, setResult] = useState<IdentifySongResponse | null>(null);
	const [noMatch, setNoMatch] = useState(false);
	const [isRecording, setIsRecording] = useState(false);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const { toast } = useToast();
	const {
		identifySong,
		isLoading: isRecognizing,
		error,
		clearError,
	} = useShazam();

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
			clearError();

			const audioSettings = {
				audio: {
					sampleRate: 44100, // CD quality
					channelCount: 1, // Mono
					echoCancellation: false,
					noiseSuppression: false,
				},
			};
			const stream = await navigator.mediaDevices.getUserMedia(audioSettings);
			const mediaRecorder = new MediaRecorder(stream, {
				mimeType: "audio/webm",
			});
			const chunks: BlobPart[] = [];

			mediaRecorder.ondataavailable = (event) => {
				chunks.push(event.data);
			};

			mediaRecorder.onstop = async () => {
				const blob = new Blob(chunks, { type: "audio/webm" });
				const file = new File([blob], "recorded-audio.webm", {
					type: "audio/webm",
				});
				setSelectedFile(file);
				setIsRecording(false);

				// Stop all tracks
				stream.getTracks().forEach((track) => track.stop());

				toast({
					title: "Recording Complete",
					description: "Processing audio...",
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
			};

			mediaRecorderRef.current = mediaRecorder;
			mediaRecorder.start();
			setIsRecording(true);

			toast({
				title: "Recording Started",
				description:
					"Play music near your microphone - will auto-identify when stopped",
			});
		} catch (error) {
			console.error(error)
			toast({
				title: "Recording Failed",
				description: "Could not access microphone",
				variant: "destructive",
			});
		}
	};

	const handleStopRecording = () => {
		if (mediaRecorderRef.current && isRecording) {
			mediaRecorderRef.current.stop();
		}
	};

	return (
		<div className='min-h-screen bg-background'>
			<FloatingNav />

			<main className='container mx-auto px-4 py-8 pb-32'>
				<div className='max-w-2xl mx-auto text-center space-y-12'>
					{/* Header */}
					<div className='space-y-6'>
						<div className='flex justify-center'>
							<Turntable size='lg' spinning={isRecognizing} />
						</div>
						<div>
							<h1 className='text-6xl font-bold font-mono tracking-tight mb-4'>
								SONIC
							</h1>
							<p className='text-xl text-muted-foreground font-mono'>
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
									</div>
									<Button
										onClick={handleRecognize}
										disabled={isRecognizing}
										className='font-mono bg-accent hover:bg-accent/90 text-accent-foreground'
									>
										{isRecognizing ? "ANALYZING..." : "RECOGNIZE"}
									</Button>
								</div>
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
													{result.processingTime.toFixed(2) as any as number/1000}s
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

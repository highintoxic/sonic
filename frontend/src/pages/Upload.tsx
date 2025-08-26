import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { Turntable } from "@/components/Turntable";
import { FloatingNav } from "@/components/FloatingNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useShazam } from "@/hooks/use-shazam";
import { validateAudioFile } from "@/utils/api-test";
import { Upload as UploadIcon, Save, AlertCircle } from "lucide-react";

const Upload = () => {
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [title, setTitle] = useState("");
	const [artist, setArtist] = useState("");
	const [album, setAlbum] = useState("");
	const { toast } = useToast();
	const { addSong, isLoading: isUploading, error, clearError } = useShazam();

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
		clearError(); // Clear any previous errors
		toast({
			title: "File Selected",
			description: `${file.name} ready for upload`,
		});
	};

	const handleUpload = async () => {
		if (!selectedFile || !title || !artist) {
			toast({
				title: "Missing Information",
				description: "Please fill in all fields and select a file",
				variant: "destructive",
			});
			return;
		}

		try {
			const result = await addSong({
				audio: selectedFile,
				title: title.trim(),
				artist: artist.trim(),
				album: album.trim() || undefined,
			});

			if (result) {
				toast({
					title: "Upload Complete",
					description: `${result.title} by ${result.artist} has been added to the database`,
				});

				// Reset form
				setSelectedFile(null);
				setTitle("");
				setArtist("");
				setAlbum("");
			}
		} catch (err) {
			// Error is already handled by the hook
			console.error("Upload error:", err);
		}
	};

	return (
		<div className='min-h-screen bg-background'>
			<FloatingNav />

			<main className='container mx-auto px-4 py-8 pb-32'>
				<div className='max-w-2xl mx-auto space-y-12'>
					{/* Header */}
					<div className='text-center space-y-6'>
						<div className='flex justify-center'>
							<Turntable size='lg' spinning={isUploading} />
						</div>
						<div>
							<h1 className='text-4xl font-bold font-mono tracking-tight mb-4'>
								ADD TO COLLECTION
							</h1>
							<p className='text-lg text-muted-foreground font-mono'>
								BUILD THE DATABASE
							</p>
						</div>
					</div>

					{/* Error Display */}
					{error && (
						<Card className='p-4 bg-destructive/10 border-destructive'>
							<div className='flex items-center gap-3'>
								<AlertCircle className='h-5 w-5 text-destructive' />
								<div className='flex-1'>
									<p className='font-mono font-bold text-sm text-destructive'>
										Upload Failed
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

					{/* Upload Form */}
					<Card className='p-8 bg-card border-2 border-border'>
						<div className='space-y-6'>
							{/* File Upload */}
							<div>
								<Label className='font-mono font-bold'>AUDIO FILE</Label>
								<div className='mt-2'>
									<FileUpload onFileSelect={handleFileSelect} />
								</div>
							</div>

							{/* Form Fields */}
							<div className='space-y-6'>
								<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
									<div>
										<Label htmlFor='title' className='font-mono font-bold'>
											TRACK TITLE *
										</Label>
										<Input
											id='title'
											value={title}
											onChange={(e) => setTitle(e.target.value)}
											placeholder='Enter song title'
											className='mt-2 font-mono'
											disabled={isUploading}
										/>
									</div>

									<div>
										<Label htmlFor='artist' className='font-mono font-bold'>
											ARTIST NAME *
										</Label>
										<Input
											id='artist'
											value={artist}
											onChange={(e) => setArtist(e.target.value)}
											placeholder='Enter artist name'
											className='mt-2 font-mono'
											disabled={isUploading}
										/>
									</div>
								</div>

								<div>
									<Label htmlFor='album' className='font-mono font-bold'>
										ALBUM NAME
									</Label>
									<Input
										id='album'
										value={album}
										onChange={(e) => setAlbum(e.target.value)}
										placeholder='Enter album name (optional)'
										className='mt-2 font-mono'
										disabled={isUploading}
									/>
								</div>
							</div>

							{/* Selected File Info */}
							{selectedFile && (
								<Card className='p-4 bg-muted border border-border'>
									<div className='flex items-center gap-3'>
										<UploadIcon className='h-5 w-5 text-accent' />
										<div className='flex-1'>
											<p className='font-mono font-bold text-sm'>
												{selectedFile.name}
											</p>
											<p className='text-xs text-muted-foreground'>
												{(selectedFile.size / 1024 / 1024).toFixed(2)} MB
											</p>
										</div>
									</div>
								</Card>
							)}

							{/* Submit Button */}
							<Button
								onClick={handleUpload}
								disabled={isUploading || !selectedFile || !title || !artist}
								className='w-full font-mono bg-accent hover:bg-accent/90 text-accent-foreground'
								size='lg'
							>
								<Save className='mr-2 h-5 w-5' />
								{isUploading ? "UPLOADING..." : "SAVE TO DATABASE"}
							</Button>
						</div>
					</Card>
				</div>
			</main>
		</div>
	);
};

export default Upload;

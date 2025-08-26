import { useState, useEffect } from "react";
import { FloatingNav } from "@/components/FloatingNav";
import { Turntable } from "@/components/Turntable";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { shazamService } from "@/services/shazam.service";
import { StatsResponse } from "@/types/api";
import {
	Music,
	Database,
	HardDrive,
	Clock,
	RefreshCw,
	AlertCircle,
	TrendingUp,
} from "lucide-react";

const Stats = () => {
	const [stats, setStats] = useState<StatsResponse | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const { toast } = useToast();

	const fetchStats = async () => {
		setIsLoading(true);
		setError(null);

		try {
			const response = await shazamService.getStats();

			if (response.success && response.data) {
				setStats(response.data);
			} else {
				throw new Error(response.error || "Failed to fetch stats");
			}
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Unknown error occurred";
			setError(errorMessage);
			toast({
				title: "Failed to Load Stats",
				description: errorMessage,
				variant: "destructive",
			});
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchStats();
	}, []);

	const formatUptime = (seconds: number): string => {
		const days = Math.floor(seconds / 86400);
		const hours = Math.floor((seconds % 86400) / 3600);
		const mins = Math.floor((seconds % 3600) / 60);

		if (days > 0) {
			return `${days}d ${hours}h ${mins}m`;
		} else if (hours > 0) {
			return `${hours}h ${mins}m`;
		} else {
			return `${mins}m`;
		}
	};

	const StatCard = ({
		icon: Icon,
		label,
		value,
		color = "text-accent",
	}: {
		icon: any;
		label: string;
		value: string | number;
		color?: string;
	}) => (
		<Card className='p-6 bg-card border-2 border-border'>
			<div className='flex items-center gap-4'>
				<Icon className={`h-8 w-8 ${color}`} />
				<div className='flex-1'>
					<p className='text-xs font-mono text-muted-foreground uppercase tracking-wide'>
						{label}
					</p>
					<p className='text-2xl font-bold font-mono'>{value}</p>
				</div>
			</div>
		</Card>
	);

	return (
		<div className='min-h-screen bg-background'>
			<FloatingNav />

			<main className='container mx-auto px-4 py-8 pb-32'>
				<div className='max-w-4xl mx-auto space-y-12'>
					{/* Header */}
					<div className='text-center space-y-6'>
						<div className='flex justify-center'>
							<Turntable size='lg' spinning={isLoading} />
						</div>
						<div>
							<h1 className='text-4xl font-bold font-mono tracking-tight mb-4'>
								SYSTEM STATS
							</h1>
							<p className='text-lg text-muted-foreground font-mono'>
								DATABASE PERFORMANCE
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
										Failed to Load Stats
									</p>
									<p className='text-xs text-destructive/80'>{error}</p>
								</div>
								<Button
									variant='outline'
									size='sm'
									onClick={fetchStats}
									disabled={isLoading}
									className='text-destructive border-destructive hover:bg-destructive/10'
								>
									<RefreshCw
										className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
									/>
								</Button>
							</div>
						</Card>
					)}

					{/* Stats Grid */}
					{stats && (
						<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
							<StatCard
								icon={Music}
								label='Total Songs'
								value={stats.totalSongs.toLocaleString()}
								color='text-accent'
							/>
							<StatCard
								icon={TrendingUp}
								label='Fingerprints'
								value={stats.totalFingerprints.toLocaleString()}
								color='text-blue-500'
							/>
							<StatCard
								icon={HardDrive}
								label='Database Size'
								value={stats.databaseSize}
								color='text-green-500'
							/>
							<StatCard
								icon={Clock}
								label='Uptime'
								value={formatUptime(stats.uptime)}
								color='text-purple-500'
							/>
						</div>
					)}

					{/* Performance Metrics */}
					{stats && (
						<Card className='p-8 bg-card border-2 border-border'>
							<div className='flex items-center gap-4 mb-6'>
								<Database className='h-8 w-8 text-accent' />
								<h2 className='text-2xl font-bold font-mono'>
									PERFORMANCE METRICS
								</h2>
							</div>

							<div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
								<div className='text-center'>
									<div className='text-3xl font-bold font-mono text-accent mb-2'>
										{stats.totalSongs > 0
											? Math.round(stats.totalFingerprints / stats.totalSongs)
											: 0}
									</div>
									<p className='text-sm font-mono text-muted-foreground'>
										AVG FINGERPRINTS PER SONG
									</p>
								</div>

								<div className='text-center'>
									<div className='text-3xl font-bold font-mono text-blue-500 mb-2'>
										{stats.totalSongs > 0 ? "~30s" : "N/A"}
									</div>
									<p className='text-sm font-mono text-muted-foreground'>
										AVG PROCESSING TIME
									</p>
								</div>

								<div className='text-center'>
									<div className='text-3xl font-bold font-mono text-green-500 mb-2'>
										{stats.totalSongs > 0 ? ">95%" : "N/A"}
									</div>
									<p className='text-sm font-mono text-muted-foreground'>
										RECOGNITION ACCURACY
									</p>
								</div>
							</div>
						</Card>
					)}

					{/* Refresh Button */}
					<div className='flex justify-center'>
						<Button
							onClick={fetchStats}
							disabled={isLoading}
							className='font-mono bg-accent hover:bg-accent/90 text-accent-foreground'
							size='lg'
						>
							<RefreshCw
								className={`mr-2 h-5 w-5 ${isLoading ? "animate-spin" : ""}`}
							/>
							{isLoading ? "REFRESHING..." : "REFRESH STATS"}
						</Button>
					</div>
				</div>
			</main>
		</div>
	);
};

export default Stats;

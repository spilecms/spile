import {
	FileTextIcon,
	FilmIcon,
	HardDriveIcon,
	ImageIcon,
	MusicIcon,
} from "lucide-react";

interface MediaStatsHeaderProps {
	stats?: {
		totalCount: number;
		totalSize: number;
		imageCount: number;
		videoCount: number;
		audioCount: number;
		documentCount: number;
	};
	storageLimitBytes?: number; // default 10 GB
}

export function MediaStatsHeader({
	stats,
	storageLimitBytes = 10 * 1024 * 1024 * 1024,
}: MediaStatsHeaderProps) {
	if (!stats) return null;

	const formatBytes = (bytes: number) => {
		if (bytes === 0) return "0 B";
		const k = 1024;
		const sizes = ["B", "KB", "MB", "GB", "TB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${(bytes / k ** i).toFixed(1)} ${sizes[i]}`;
	};

	const usedPercentage = Math.min(
		100,
		Math.max(1, (stats.totalSize / storageLimitBytes) * 100),
	);

	return (
		<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
			{/* Total Storage Used */}
			<div className="rounded-lg border border-border bg-card p-3.5 flex flex-col justify-between">
				<div className="flex items-center justify-between text-muted-foreground">
					<span className="text-xs font-medium">Storage Quota</span>
					<HardDriveIcon className="size-4" />
				</div>
				<div className="mt-2">
					<div className="flex items-baseline justify-between text-xs">
						<span className="text-base font-bold text-foreground">
							{formatBytes(stats.totalSize)}
						</span>
						<span className="text-[11px] text-muted-foreground">
							of {formatBytes(storageLimitBytes)}
						</span>
					</div>
					<div className="w-full bg-muted/60 h-1.5 rounded-full mt-2 overflow-hidden">
						<div
							className="bg-primary h-full rounded-full transition-all duration-500"
							style={{ width: `${usedPercentage}%` }}
						/>
					</div>
				</div>
			</div>

			{/* Total Files Count */}
			<div className="rounded-lg border border-border bg-card p-3.5 flex flex-col justify-between">
				<div className="flex items-center justify-between text-muted-foreground">
					<span className="text-xs font-medium">Total Files</span>
					<span className="text-xs font-mono font-bold text-foreground">
						{stats.totalCount}
					</span>
				</div>
				<div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
					<span className="flex items-center gap-1">
						<ImageIcon className="size-3 text-sky-400" /> {stats.imageCount}{" "}
						imgs
					</span>
					<span className="flex items-center gap-1">
						<FilmIcon className="size-3 text-amber-400" /> {stats.videoCount}{" "}
						vids
					</span>
					<span className="flex items-center gap-1">
						<MusicIcon className="size-3 text-purple-400" /> {stats.audioCount}{" "}
						aud
					</span>
				</div>
			</div>

			{/* Images Count */}
			<div className="rounded-lg border border-border bg-card p-3.5 flex flex-col justify-between">
				<div className="flex items-center justify-between text-muted-foreground">
					<span className="text-xs font-medium">Images</span>
					<ImageIcon className="size-4 text-sky-400" />
				</div>
				<div className="mt-2 flex items-baseline justify-between">
					<span className="text-base font-bold text-foreground">
						{stats.imageCount}
					</span>
					<span className="text-[11px] text-muted-foreground">
						Photos & graphics
					</span>
				</div>
			</div>

			{/* Documents & Media */}
			<div className="rounded-lg border border-border bg-card p-3.5 flex flex-col justify-between">
				<div className="flex items-center justify-between text-muted-foreground">
					<span className="text-xs font-medium">Docs & Assets</span>
					<FileTextIcon className="size-4 text-emerald-400" />
				</div>
				<div className="mt-2 flex items-baseline justify-between">
					<span className="text-base font-bold text-foreground">
						{stats.documentCount}
					</span>
					<span className="text-[11px] text-muted-foreground">
						PDFs, CSVs & files
					</span>
				</div>
			</div>
		</div>
	);
}

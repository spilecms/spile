import {
	CheckIcon,
	CopyIcon,
	FileIcon,
	FileTextIcon,
	FilmIcon,
	MusicIcon,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { MediaItem } from "@/types/media";

interface MediaGridProps {
	items: MediaItem[];
	selectedIds: string[];
	onToggleSelect: (id: string) => void;
	onItemClick: (item: MediaItem) => void;
}

export function MediaGrid({
	items,
	selectedIds,
	onToggleSelect,
	onItemClick,
}: MediaGridProps) {
	const [copiedId, setCopiedId] = React.useState<string | null>(null);

	const handleCopy = (e: React.MouseEvent, item: MediaItem) => {
		e.stopPropagation();
		navigator.clipboard.writeText(item.url);
		setCopiedId(item.id);
		toast.success("URL copied");
		setTimeout(() => setCopiedId(null), 1500);
	};

	const formatBytes = (bytes: number) => {
		if (bytes === 0) return "0 B";
		const k = 1024;
		const sizes = ["B", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${(bytes / k ** i).toFixed(1)} ${sizes[i]}`;
	};

	return (
		<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
			{items.map((item) => {
				const isSelected = selectedIds.includes(item.id);
				const isImage = item.mimeType.startsWith("image/");
				const isVideo = item.mimeType.startsWith("video/");
				const isAudio = item.mimeType.startsWith("audio/");
				const isPdf = item.mimeType.includes("pdf");

				return (
					<div
						key={item.id}
						className={`group relative flex flex-col rounded-md border text-left transition-all overflow-hidden bg-card ${
							isSelected
								? "border-primary ring-2 ring-primary/20 bg-primary/5"
								: "border-border hover:border-foreground/30 hover:shadow-sm"
						}`}
					>
						{/* Clickable Area for opening details modal */}
						<button
							type="button"
							onClick={() => onItemClick(item)}
							className="absolute inset-0 z-0 cursor-pointer w-full h-full text-left"
							aria-label={`View details for ${item.name}`}
						/>

						{/* Thumbnail area */}
						<div className="relative aspect-square w-full bg-muted/40 overflow-hidden flex items-center justify-center">
							{isImage ? (
								<img
									src={item.thumbnailUrl || item.url}
									alt={item.altText || item.name}
									className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
									loading="lazy"
								/>
							) : isVideo ? (
								<div className="flex flex-col items-center justify-center text-muted-foreground group-hover:text-foreground">
									<FilmIcon className="size-10" />
									<span className="text-[10px] mt-1 font-mono uppercase font-semibold">
										Video
									</span>
								</div>
							) : isAudio ? (
								<div className="flex flex-col items-center justify-center text-muted-foreground group-hover:text-foreground">
									<MusicIcon className="size-10" />
									<span className="text-[10px] mt-1 font-mono uppercase font-semibold">
										Audio
									</span>
								</div>
							) : isPdf ? (
								<div className="flex flex-col items-center justify-center text-rose-500">
									<FileTextIcon className="size-10" />
									<span className="text-[10px] mt-1 font-mono uppercase font-semibold">
										PDF
									</span>
								</div>
							) : (
								<div className="flex flex-col items-center justify-center text-sky-500">
									<FileIcon className="size-10" />
									<span className="text-[10px] mt-1 font-mono uppercase font-semibold">
										DOC
									</span>
								</div>
							)}

							{/* Select Checkbox (top-left) */}
							<button
								type="button"
								className={`absolute top-2 left-2 z-10 transition-opacity p-0.5 rounded cursor-pointer ${
									isSelected
										? "opacity-100"
										: "opacity-0 group-hover:opacity-100"
								}`}
								onClick={(e) => {
									e.stopPropagation();
									onToggleSelect(item.id);
								}}
								aria-label={`Select ${item.name}`}
							>
								<Checkbox
									checked={isSelected}
									className="bg-background/90 border-border"
								/>
							</button>

							{/* Copy URL button (top-right) */}
							<button
								type="button"
								className="absolute top-2 right-2 z-10 size-7 rounded bg-background/80 hover:bg-background text-foreground shadow-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
								onClick={(e) => handleCopy(e, item)}
								title="Copy public CDN URL"
							>
								{copiedId === item.id ? (
									<CheckIcon className="size-3.5 text-emerald-500" />
								) : (
									<CopyIcon className="size-3.5" />
								)}
							</button>

							{/* Duration or dimensions badge (bottom-right) */}
							{item.dimensions && (
								<span className="absolute bottom-1.5 right-1.5 text-[9px] font-mono px-1 py-0.5 rounded bg-black/60 text-white/90 backdrop-blur-xs pointer-events-none">
									{item.dimensions.width}×{item.dimensions.height}
								</span>
							)}
							{item.duration && (
								<span className="absolute bottom-1.5 right-1.5 text-[9px] font-mono px-1 py-0.5 rounded bg-black/60 text-white/90 backdrop-blur-xs pointer-events-none">
									{Math.floor(item.duration / 60)}:
									{(item.duration % 60).toString().padStart(2, "0")}
								</span>
							)}
						</div>

						{/* Item info footer */}
						<div className="p-2.5 flex-1 flex flex-col justify-between pointer-events-none">
							<div className="space-y-0.5">
								<p
									className="text-xs font-medium truncate text-foreground"
									title={item.name}
								>
									{item.title || item.name}
								</p>
								<p className="text-[11px] text-muted-foreground flex items-center justify-between">
									<span>{formatBytes(item.size)}</span>
									<span className="font-mono text-[10px] uppercase">
										{item.mimeType.split("/")[1] || "file"}
									</span>
								</p>
							</div>

							{item.tags && item.tags.length > 0 && (
								<div className="flex flex-wrap gap-1 mt-2">
									{item.tags.slice(0, 2).map((tag) => (
										<Badge
											key={tag}
											variant="secondary"
											className="text-[9px] px-1 py-0 h-4"
										>
											{tag}
										</Badge>
									))}
									{item.tags.length > 2 && (
										<span className="text-[9px] text-muted-foreground">
											+{item.tags.length - 2}
										</span>
									)}
								</div>
							)}
						</div>
					</div>
				);
			})}
		</div>
	);
}

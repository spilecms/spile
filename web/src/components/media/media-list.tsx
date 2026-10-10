import {
	CheckIcon,
	CopyIcon,
	FileIcon,
	FileTextIcon,
	FilmIcon,
	MusicIcon,
	Trash2Icon,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { MediaItem } from "@/types/media";

interface MediaListProps {
	items: MediaItem[];
	selectedIds: string[];
	onToggleSelect: (id: string) => void;
	onSelectAll: () => void;
	onItemClick: (item: MediaItem) => void;
	onDeleteSingle: (id: string) => void;
	canDelete?: boolean;
}

export function MediaList({
	items,
	selectedIds,
	onToggleSelect,
	onSelectAll,
	onItemClick,
	onDeleteSingle,
	canDelete = true,
}: MediaListProps) {
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

	const allSelected = items.length > 0 && selectedIds.length === items.length;

	return (
		<div className="rounded-md border border-border bg-card overflow-hidden">
			<Table>
				<TableHeader>
					<TableRow className="hover:bg-transparent">
						<TableHead className="w-10">
							<Checkbox
								checked={allSelected}
								onCheckedChange={onSelectAll}
								aria-label="Select all assets"
							/>
						</TableHead>
						<TableHead className="w-14">Preview</TableHead>
						<TableHead>File Name</TableHead>
						<TableHead className="w-28">Type</TableHead>
						<TableHead className="w-24">Size</TableHead>
						<TableHead className="w-32 hidden md:table-cell">
							Uploaded
						</TableHead>
						<TableHead className="w-36 hidden lg:table-cell">Tags</TableHead>
						<TableHead className="w-24 text-right">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{items.map((item) => {
						const isSelected = selectedIds.includes(item.id);
						const isImage = item.mimeType.startsWith("image/");
						const isVideo = item.mimeType.startsWith("video/");
						const isAudio = item.mimeType.startsWith("audio/");
						const isPdf = item.mimeType.includes("pdf");

						return (
							<TableRow
								key={item.id}
								onClick={() => onItemClick(item)}
								className={`cursor-pointer transition-colors ${
									isSelected ? "bg-primary/5 hover:bg-primary/10" : ""
								}`}
							>
								{/* Select checkbox */}
								<TableCell
									onClick={(e) => {
										e.stopPropagation();
										onToggleSelect(item.id);
									}}
								>
									<Checkbox
										checked={isSelected}
										aria-label={`Select ${item.name}`}
									/>
								</TableCell>

								{/* Thumbnail */}
								<TableCell>
									<div className="size-10 rounded border border-border bg-muted/30 overflow-hidden flex items-center justify-center shrink-0">
										{isImage ? (
											<img
												src={item.thumbnailUrl || item.url}
												alt={item.name}
												className="size-full object-cover"
												loading="lazy"
											/>
										) : isVideo ? (
											<FilmIcon className="size-5 text-muted-foreground" />
										) : isAudio ? (
											<MusicIcon className="size-5 text-muted-foreground" />
										) : isPdf ? (
											<FileTextIcon className="size-5 text-rose-500" />
										) : (
											<FileIcon className="size-5 text-sky-500" />
										)}
									</div>
								</TableCell>

								{/* Name & Title */}
								<TableCell className="max-w-[240px]">
									<div className="min-w-0">
										<p className="text-xs font-semibold truncate text-foreground">
											{item.title || item.name}
										</p>
										<p className="text-[11px] font-mono text-muted-foreground truncate">
											{item.name}
										</p>
									</div>
								</TableCell>

								{/* Type & dimensions */}
								<TableCell>
									<div className="text-[11px]">
										<span className="font-mono uppercase font-semibold text-foreground">
											{item.mimeType.split("/")[1] || "file"}
										</span>
										{item.dimensions && (
											<p className="text-muted-foreground text-[10px]">
												{item.dimensions.width}×{item.dimensions.height}
											</p>
										)}
									</div>
								</TableCell>

								{/* Size */}
								<TableCell className="text-xs font-mono text-muted-foreground">
									{formatBytes(item.size)}
								</TableCell>

								{/* Uploaded date */}
								<TableCell className="text-xs text-muted-foreground hidden md:table-cell">
									{new Date(item.createdAt).toLocaleDateString()}
								</TableCell>

								{/* Tags */}
								<TableCell className="hidden lg:table-cell">
									<div className="flex flex-wrap gap-1 max-w-[180px]">
										{item.tags?.slice(0, 2).map((t) => (
											<Badge
												key={t}
												variant="secondary"
												className="text-[9px] px-1 py-0 h-4"
											>
												{t}
											</Badge>
										))}
										{item.tags && item.tags.length > 2 && (
											<span className="text-[9px] text-muted-foreground">
												+{item.tags.length - 2}
											</span>
										)}
									</div>
								</TableCell>

								{/* Action buttons */}
								<TableCell className="text-right">
									<div className="flex items-center justify-end gap-1">
										<Button
											type="button"
											variant="ghost"
											size="icon"
											className="size-7 text-muted-foreground hover:text-foreground"
											onClick={(e) => handleCopy(e, item)}
											title="Copy URL"
										>
											{copiedId === item.id ? (
												<CheckIcon className="size-3.5 text-emerald-500" />
											) : (
												<CopyIcon className="size-3.5" />
											)}
										</Button>

										{canDelete && (
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="size-7 text-muted-foreground hover:text-rose-500"
												onClick={(e) => {
													e.stopPropagation();
													onDeleteSingle(item.id);
												}}
												title="Delete asset"
											>
												<Trash2Icon className="size-3.5" />
											</Button>
										)}
									</div>
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</div>
	);
}

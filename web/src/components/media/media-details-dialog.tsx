import {
	CalendarIcon,
	CheckIcon,
	CopyIcon,
	DownloadIcon,
	ExternalLinkIcon,
	FileIcon,
	FileTextIcon,
	HardDriveIcon,
	Maximize2Icon,
	MusicIcon,
	Trash2Icon,
	UserIcon,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { MediaItem, MediaUpdatePayload } from "@/types/media";

interface MediaDetailsDialogProps {
	item: MediaItem | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onUpdate: (id: string, patch: MediaUpdatePayload) => Promise<void>;
	onDelete: (id: string) => Promise<void>;
	canEdit?: boolean;
	canDelete?: boolean;
}

export function MediaDetailsDialog({
	item,
	open,
	onOpenChange,
	onUpdate,
	onDelete,
	canEdit = true,
	canDelete = true,
}: MediaDetailsDialogProps) {
	const [name, setName] = React.useState("");
	const [title, setTitle] = React.useState("");
	const [altText, setAltText] = React.useState("");
	const [caption, setCaption] = React.useState("");
	const [tagsInput, setTagsInput] = React.useState("");
	const [copied, setCopied] = React.useState(false);
	const [isSaving, setIsSaving] = React.useState(false);
	const [isDeleting, setIsDeleting] = React.useState(false);

	React.useEffect(() => {
		if (item) {
			setName(item.name || "");
			setTitle(item.title || "");
			setAltText(item.altText || "");
			setCaption(item.caption || "");
			setTagsInput(item.tags ? item.tags.join(", ") : "");
		}
	}, [item]);

	if (!item) return null;

	const formatBytes = (bytes: number) => {
		if (bytes === 0) return "0 B";
		const k = 1024;
		const sizes = ["B", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${(bytes / k ** i).toFixed(1)} ${sizes[i]}`;
	};

	const copyUrl = () => {
		navigator.clipboard.writeText(item.url);
		setCopied(true);
		toast.success("Public CDN URL copied to clipboard");
		setTimeout(() => setCopied(false), 2000);
	};

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			setIsSaving(true);
			const tags = tagsInput
				.split(",")
				.map((t) => t.trim().toLowerCase())
				.filter(Boolean);

			await onUpdate(item.id, {
				name: name.trim() || item.name,
				title: title.trim() || undefined,
				altText: altText.trim() || undefined,
				caption: caption.trim() || undefined,
				tags,
			});
			toast.success("Media details updated");
			onOpenChange(false);
		} catch (_err) {
			toast.error("Failed to update media item");
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
			return;
		}
		try {
			setIsDeleting(true);
			await onDelete(item.id);
			toast.success("Media item deleted");
			onOpenChange(false);
		} catch (_err) {
			toast.error("Failed to delete media item");
		} finally {
			setIsDeleting(false);
		}
	};

	const isImage = item.mimeType.startsWith("image/");
	const isVideo = item.mimeType.startsWith("video/");
	const isAudio = item.mimeType.startsWith("audio/");
	const isPdf = item.mimeType.includes("pdf");

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-3xl sm:max-w-3xl p-0 gap-0 overflow-hidden bg-background text-foreground border border-border shadow-2xl">
				<form
					onSubmit={handleSave}
					className="flex flex-col h-full max-h-[85vh]"
				>
					<DialogHeader className="p-5 border-b border-border flex flex-row items-center justify-between">
						<div>
							<DialogTitle className="text-sm font-semibold truncate max-w-[500px]">
								{item.title || item.name}
							</DialogTitle>
							<DialogDescription className="text-xs text-muted-foreground">
								Asset details, dimensions, and metadata
							</DialogDescription>
						</div>
					</DialogHeader>

					<div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-y-auto">
						{/* Preview Column */}
						<div className="md:col-span-7 bg-muted/20 border-b md:border-b-0 md:border-r border-border p-6 flex flex-col items-center justify-center min-h-[300px]">
							{isImage ? (
								<div className="relative group max-h-[360px] w-full flex items-center justify-center">
									<img
										src={item.url}
										alt={item.altText || item.name}
										className="max-h-[340px] max-w-full rounded object-contain shadow-sm border border-border/50"
									/>
									<a
										href={item.url}
										target="_blank"
										rel="noreferrer"
										className="absolute bottom-2 right-2 p-1.5 rounded bg-background/80 hover:bg-background text-foreground shadow text-xs flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
									>
										<Maximize2Icon className="size-3.5" />
										<span>Original</span>
									</a>
								</div>
							) : isVideo ? (
								<div className="w-full">
									<video
										controls
										className="w-full max-h-[340px] rounded border border-border bg-black"
									>
										<source src={item.url} type={item.mimeType} />
										<track kind="captions" />
									</video>
								</div>
							) : isAudio ? (
								<div className="w-full p-8 flex flex-col items-center justify-center space-y-4">
									<div className="size-20 rounded-full bg-primary/10 text-primary flex items-center justify-center">
										<MusicIcon className="size-10" />
									</div>
									<audio controls className="w-full max-w-md">
										<source src={item.url} type={item.mimeType} />
										<track kind="captions" />
									</audio>
								</div>
							) : (
								<div className="flex flex-col items-center justify-center p-8 space-y-3 text-muted-foreground">
									{isPdf ? (
										<FileTextIcon className="size-20 text-rose-500" />
									) : (
										<FileIcon className="size-20 text-sky-500" />
									)}
									<p className="text-xs font-medium text-foreground">
										{item.name}
									</p>
									<a
										href={item.url}
										target="_blank"
										rel="noreferrer"
										className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
									>
										<span>Preview document</span>
										<ExternalLinkIcon className="size-3" />
									</a>
								</div>
							)}

							{/* URL Copy Bar */}
							<div className="w-full mt-4 flex items-center gap-2">
								<Input
									readOnly
									value={item.url}
									className="h-8 text-xs font-mono bg-background truncate flex-1"
								/>
								<Button
									type="button"
									size="sm"
									variant="outline"
									onClick={copyUrl}
									className="h-8 px-2.5 text-xs flex items-center gap-1.5 shrink-0"
								>
									{copied ? (
										<CheckIcon className="size-3.5 text-emerald-500" />
									) : (
										<CopyIcon className="size-3.5" />
									)}
									<span>{copied ? "Copied" : "Copy URL"}</span>
								</Button>
								<a
									href={item.url}
									download={item.name}
									target="_blank"
									rel="noreferrer"
									className="inline-flex items-center justify-center h-8 px-2.5 text-xs rounded border border-border bg-background hover:bg-muted text-foreground shrink-0 gap-1.5"
								>
									<DownloadIcon className="size-3.5" />
									<span>Download</span>
								</a>
							</div>
						</div>

						{/* Metadata & Edit Fields Column */}
						<div className="md:col-span-5 p-5 space-y-4 text-xs">
							<div className="space-y-1">
								<Label className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">
									File Metadata
								</Label>
								<div className="space-y-2 pt-1 border-t border-border">
									<div className="flex items-center justify-between text-muted-foreground">
										<span className="flex items-center gap-1.5">
											<HardDriveIcon className="size-3.5" /> File size
										</span>
										<span className="font-mono text-foreground font-medium">
											{formatBytes(item.size)}
										</span>
									</div>

									{item.dimensions && (
										<div className="flex items-center justify-between text-muted-foreground">
											<span>Dimensions</span>
											<span className="font-mono text-foreground font-medium">
												{item.dimensions.width} × {item.dimensions.height} px
											</span>
										</div>
									)}

									{item.duration && (
										<div className="flex items-center justify-between text-muted-foreground">
											<span>Duration</span>
											<span className="font-mono text-foreground font-medium">
												{Math.floor(item.duration / 60)}:
												{(item.duration % 60).toString().padStart(2, "0")} min
											</span>
										</div>
									)}

									<div className="flex items-center justify-between text-muted-foreground">
										<span>MIME Type</span>
										<span className="font-mono text-foreground truncate max-w-[150px]">
											{item.mimeType}
										</span>
									</div>

									<div className="flex items-center justify-between text-muted-foreground">
										<span className="flex items-center gap-1.5">
											<UserIcon className="size-3.5" /> Uploaded by
										</span>
										<span className="text-foreground">
											{item.uploadedBy.name}
										</span>
									</div>

									<div className="flex items-center justify-between text-muted-foreground">
										<span className="flex items-center gap-1.5">
											<CalendarIcon className="size-3.5" /> Upload date
										</span>
										<span className="text-foreground">
											{new Date(item.createdAt).toLocaleDateString()}
										</span>
									</div>
								</div>
							</div>

							<div className="space-y-3 pt-3 border-t border-border">
								<div className="space-y-1.5">
									<Label className="text-xs font-medium">File Name</Label>
									<Input
										value={name}
										onChange={(e) => setName(e.target.value)}
										disabled={!canEdit}
										className="h-8 text-xs font-mono"
									/>
								</div>

								<div className="space-y-1.5">
									<Label className="text-xs font-medium">Title</Label>
									<Input
										value={title}
										onChange={(e) => setTitle(e.target.value)}
										disabled={!canEdit}
										placeholder="Human-readable title"
										className="h-8 text-xs"
									/>
								</div>

								{isImage && (
									<div className="space-y-1.5">
										<Label className="text-xs font-medium">Alt Text</Label>
										<Input
											value={altText}
											onChange={(e) => setAltText(e.target.value)}
											disabled={!canEdit}
											placeholder="Describe image for screen readers"
											className="h-8 text-xs"
										/>
									</div>
								)}

								<div className="space-y-1.5">
									<Label className="text-xs font-medium">Caption</Label>
									<Textarea
										value={caption}
										onChange={(e) => setCaption(e.target.value)}
										disabled={!canEdit}
										placeholder="Optional caption"
										className="min-h-[50px] text-xs resize-none"
									/>
								</div>

								<div className="space-y-1.5">
									<Label className="text-xs font-medium">
										Tags (comma-separated)
									</Label>
									<Input
										value={tagsInput}
										onChange={(e) => setTagsInput(e.target.value)}
										disabled={!canEdit}
										placeholder="e.g. blog, banner, logo"
										className="h-8 text-xs"
									/>
								</div>
							</div>
						</div>
					</div>

					<DialogFooter className="p-4 px-6 border-t border-border bg-muted/10 flex items-center justify-between sm:justify-between">
						{canDelete ? (
							<Button
								type="button"
								variant="destructive"
								size="sm"
								onClick={handleDelete}
								disabled={isDeleting}
								className="gap-1.5 text-xs h-8"
							>
								<Trash2Icon className="size-3.5" />
								<span>{isDeleting ? "Deleting..." : "Delete Asset"}</span>
							</Button>
						) : (
							<div />
						)}

						<div className="flex items-center gap-2">
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => onOpenChange(false)}
								className="text-xs h-8"
							>
								Close
							</Button>
							{canEdit && (
								<Button
									type="submit"
									size="sm"
									disabled={isSaving}
									className="text-xs h-8"
								>
									{isSaving ? "Saving..." : "Save Changes"}
								</Button>
							)}
						</div>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

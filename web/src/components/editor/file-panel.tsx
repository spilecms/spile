import { FilePanelExtension } from "@blocknote/core/extensions";
import type { FilePanelProps } from "@blocknote/react";
import { useBlockNoteEditor, useExtension } from "@blocknote/react";
import { useQuery } from "@tanstack/react-query";
import {
	FolderOpen,
	Image as ImageIcon,
	Link as LinkIcon,
	Loader2,
	UploadCloud,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mockApi } from "@/lib/mock/api";
import { cn } from "@/lib/utils";

type TabType = "upload" | "embed" | "library";

function getFilenameFromUrl(url: string, fallback = "image"): string {
	try {
		const pathname = new URL(url).pathname;
		const name = pathname.split("/").pop();
		return name || fallback;
	} catch {
		return fallback;
	}
}

export function CustomFilePanel({ blockId }: FilePanelProps) {
	const editor = useBlockNoteEditor();
	const filePanel = useExtension(FilePanelExtension);
	const [activeTab, setActiveTab] = useState<TabType>("upload");
	const [embedUrl, setEmbedUrl] = useState("");
	const [isUploading, setIsUploading] = useState(false);
	const [isDragging, setIsDragging] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const block = editor.getBlock(blockId);
	const blockType = block?.type ?? "image";

	// Query media library for the "Library" tab
	const { data: mediaItems, isLoading: isLoadingMedia } = useQuery({
		queryKey: ["media", "list", { type: "image" }],
		queryFn: () => mockApi.media.list({ type: "image" }),
		enabled: activeTab === "library",
	});

	const handleApplyUrl = useCallback(
		(url: string, name?: string) => {
			if (!editor.getBlock(blockId)) return;

			editor.updateBlock(blockId, {
				props: {
					url,
					name: name || getFilenameFromUrl(url, blockType),
				} as Record<string, boolean | number | string>,
			});

			filePanel?.closeMenu();
			editor.focus();
		},
		[editor, blockId, blockType, filePanel],
	);

	const handleFileUpload = useCallback(
		async (file: File) => {
			setIsUploading(true);
			try {
				let url = "";
				if (editor.uploadFile) {
					const res = await editor.uploadFile(file, blockId);
					if (typeof res === "string") {
						url = res;
					} else if (res && typeof res === "object" && "props" in res) {
						url = (res as { props?: { url?: string } }).props?.url ?? "";
					}
				} else {
					// Fallback to direct mock API upload
					const formData = new FormData();
					formData.append("file", file);
					const uploaded = await mockApi.media.upload(formData);
					url = uploaded.url;
				}

				if (!url) {
					throw new Error("Failed to retrieve uploaded file URL");
				}

				handleApplyUrl(url, file.name);
				toast.success(`Uploaded ${file.name}`);
			} catch (err) {
				console.error("Upload error:", err);
				toast.error(
					"Upload failed: " +
						(err instanceof Error ? err.message : String(err)),
				);
			} finally {
				setIsUploading(false);
			}
		},
		[editor, blockId, handleApplyUrl],
	);

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			handleFileUpload(file);
		}
		e.target.value = "";
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
		const file = e.dataTransfer.files?.[0];
		if (file) {
			handleFileUpload(file);
		}
	};

	const handleEmbedSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const trimmed = embedUrl.trim();
		if (!trimmed) return;

		handleApplyUrl(trimmed);
	};

	const accept =
		blockType === "image"
			? "image/*"
			: blockType === "video"
				? "video/*"
				: blockType === "audio"
					? "audio/*"
					: "*/*";

	return (
		<div className="w-[340px] sm:w-[380px] rounded-xl border border-border/80 bg-popover/95 p-3 shadow-2xl backdrop-blur-md text-popover-foreground transition-all duration-150 animate-in fade-in-0 zoom-in-95">
			{/* Segmented Tab Switcher */}
			<div className="flex rounded-lg bg-muted/60 p-0.5 mb-3 border border-border/40">
				<button
					type="button"
					onClick={() => setActiveTab("upload")}
					className={cn(
						"flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer",
						activeTab === "upload"
							? "bg-background text-foreground shadow-xs font-semibold"
							: "text-muted-foreground hover:text-foreground",
					)}
				>
					<UploadCloud className="size-3.5" />
					<span>Upload</span>
				</button>
				<button
					type="button"
					onClick={() => setActiveTab("embed")}
					className={cn(
						"flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer",
						activeTab === "embed"
							? "bg-background text-foreground shadow-xs font-semibold"
							: "text-muted-foreground hover:text-foreground",
					)}
				>
					<LinkIcon className="size-3.5" />
					<span>Embed link</span>
				</button>
				<button
					type="button"
					onClick={() => setActiveTab("library")}
					className={cn(
						"flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer",
						activeTab === "library"
							? "bg-background text-foreground shadow-xs font-semibold"
							: "text-muted-foreground hover:text-foreground",
					)}
				>
					<FolderOpen className="size-3.5" />
					<span>Library</span>
				</button>
			</div>

			{/* Tab 1: Upload Dropzone */}
			{activeTab === "upload" && (
				<div>
					<input
						type="file"
						ref={fileInputRef}
						accept={accept}
						onChange={handleFileSelect}
						className="hidden"
						tabIndex={-1}
					/>
					<button
						type="button"
						onDragOver={(e) => {
							e.preventDefault();
							setIsDragging(true);
						}}
						onDragLeave={() => setIsDragging(false)}
						onDrop={handleDrop}
						onClick={() => !isUploading && fileInputRef.current?.click()}
						className={cn(
							"w-full group relative flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-all",
							isDragging
								? "border-primary bg-primary/10 scale-[1.01]"
								: "border-border/70 bg-muted/20 hover:border-primary/50 hover:bg-muted/40",
							isUploading && "pointer-events-none opacity-60",
						)}
					>
						{isUploading ? (
							<div className="flex flex-col items-center gap-2 py-2">
								<Loader2 className="size-7 animate-spin text-primary" />
								<span className="text-xs font-medium text-foreground">
									Uploading {blockType}…
								</span>
							</div>
						) : (
							<>
								<div className="rounded-full bg-muted/60 p-2.5 text-muted-foreground group-hover:text-primary transition-colors">
									<UploadCloud className="size-5" />
								</div>
								<div className="flex flex-col gap-0.5">
									<span className="text-xs font-medium text-foreground">
										Click to browse{" "}
										<span className="text-muted-foreground font-normal">
											or drag & drop
										</span>
									</span>
									<span className="text-[10px] text-muted-foreground">
										Supports PNG, JPG, GIF, WebP, SVG
									</span>
								</div>
							</>
						)}
					</button>
				</div>
			)}

			{/* Tab 2: Embed Link Input */}
			{activeTab === "embed" && (
				<form onSubmit={handleEmbedSubmit} className="flex flex-col gap-2.5">
					<div className="flex flex-col gap-1">
						<label
							htmlFor="embed-url-input"
							className="text-[11px] font-medium text-muted-foreground"
						>
							Image URL
						</label>
						<Input
							id="embed-url-input"
							type="url"
							placeholder="https://example.com/image.jpg"
							value={embedUrl}
							onChange={(e) => setEmbedUrl(e.target.value)}
							className="h-8 text-xs"
							autoFocus
						/>
					</div>
					<div className="flex justify-end gap-2">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="h-7 text-xs px-2 text-muted-foreground"
							onClick={() => filePanel?.closeMenu()}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							size="sm"
							disabled={!embedUrl.trim()}
							className="h-7 text-xs px-3 font-medium"
						>
							Embed {blockType}
						</Button>
					</div>
				</form>
			)}

			{/* Tab 3: Media Library Quick-Picker */}
			{activeTab === "library" && (
				<div className="flex flex-col gap-2">
					<div className="text-[11px] font-medium text-muted-foreground px-0.5">
						Choose from uploaded media
					</div>
					{isLoadingMedia ? (
						<div className="flex items-center justify-center py-8 text-muted-foreground">
							<Loader2 className="size-5 animate-spin" />
						</div>
					) : !mediaItems?.length ? (
						<div className="py-6 text-center text-xs text-muted-foreground">
							No media uploaded yet.
						</div>
					) : (
						<div className="grid grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1 editor-scroll">
							{mediaItems.map((item) => (
								<button
									key={item.id}
									type="button"
									onClick={() => handleApplyUrl(item.url, item.name)}
									className="group relative aspect-video overflow-hidden rounded-md border border-border/60 bg-muted/30 hover:border-primary transition-all cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary"
								>
									{item.mimeType.startsWith("image/") ? (
										<img
											src={item.url}
											alt={item.name}
											className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
										/>
									) : (
										<div className="flex h-full w-full items-center justify-center text-muted-foreground">
											<ImageIcon className="size-4" />
										</div>
									)}
									<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1">
										<p className="truncate text-[9px] text-white font-medium">
											{item.name}
										</p>
									</div>
								</button>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}

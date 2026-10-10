import { UploadCloudIcon, XIcon } from "lucide-react";
import * as React from "react";
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
import type { MediaUploadPayload } from "@/types/media";

interface MediaUploaderProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onUpload: (payload: MediaUploadPayload) => Promise<void>;
}

export function MediaUploader({
	open,
	onOpenChange,
	onUpload,
}: MediaUploaderProps) {
	const [isDragging, setIsDragging] = React.useState(false);
	const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
	const [title, setTitle] = React.useState("");
	const [altText, setAltText] = React.useState("");
	const [caption, setCaption] = React.useState("");
	const [tagsInput, setTagsInput] = React.useState("");
	const [isSubmitting, setIsSubmitting] = React.useState(false);

	const fileInputRef = React.useRef<HTMLInputElement | null>(null);

	const handleFileSelect = (file: File) => {
		setSelectedFile(file);
		setTitle(file.name.replace(/\.[^/.]+$/, ""));

		if (file.type.startsWith("image/")) {
			const objectUrl = URL.createObjectURL(file);
			setPreviewUrl(objectUrl);
		} else {
			setPreviewUrl(null);
		}
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(true);
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);

		const files = e.dataTransfer.files;
		if (files && files.length > 0) {
			handleFileSelect(files[0]);
		}
	};

	const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (files && files.length > 0) {
			handleFileSelect(files[0]);
		}
	};

	const resetForm = () => {
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
		}
		setSelectedFile(null);
		setPreviewUrl(null);
		setTitle("");
		setAltText("");
		setCaption("");
		setTagsInput("");
		setIsSubmitting(false);
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedFile) return;

		try {
			setIsSubmitting(true);

			const tags = tagsInput
				.split(",")
				.map((t) => t.trim().toLowerCase())
				.filter(Boolean);

			// In a browser environment, create an object URL or fallback mock CDN URL
			const mockCdnUrl = previewUrl || URL.createObjectURL(selectedFile);

			let dimensions: { width: number; height: number } | undefined;
			if (selectedFile.type.startsWith("image/")) {
				dimensions = await new Promise((resolve) => {
					const img = new Image();
					img.onload = () => {
						resolve({ width: img.naturalWidth, height: img.naturalHeight });
					};
					img.onerror = () => resolve({ width: 1200, height: 800 });
					img.src = mockCdnUrl;
				});
			}

			await onUpload({
				name: selectedFile.name,
				mimeType: selectedFile.type || "application/octet-stream",
				size: selectedFile.size,
				url: mockCdnUrl,
				thumbnailUrl: selectedFile.type.startsWith("image/")
					? mockCdnUrl
					: undefined,
				dimensions,
				altText: altText.trim() || undefined,
				caption: caption.trim() || undefined,
				tags,
			});

			resetForm();
			onOpenChange(false);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) resetForm();
				onOpenChange(next);
			}}
		>
			<DialogContent className="max-w-xl sm:max-w-xl p-0 gap-0 overflow-hidden bg-background text-foreground border border-border shadow-2xl">
				<form onSubmit={handleSubmit}>
					<DialogHeader className="p-6 pb-4 border-b border-border">
						<DialogTitle className="text-base font-semibold">
							Upload Media Asset
						</DialogTitle>
						<DialogDescription className="text-xs text-muted-foreground">
							Upload an image, video, audio clip, or document. Supports files up
							to 100MB.
						</DialogDescription>
					</DialogHeader>

					<div className="p-6 space-y-5">
						{!selectedFile ? (
							<button
								type="button"
								onDragOver={handleDragOver}
								onDragLeave={handleDragLeave}
								onDrop={handleDrop}
								onClick={() => fileInputRef.current?.click()}
								className={`w-full border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
									isDragging
										? "border-primary bg-primary/5"
										: "border-border hover:border-muted-foreground/40 hover:bg-muted/30"
								}`}
							>
								<div className="size-12 rounded-full bg-muted/50 flex items-center justify-center mb-3 text-muted-foreground">
									<UploadCloudIcon className="size-6" />
								</div>
								<p className="text-sm font-medium">
									Drag and drop files here, or{" "}
									<span className="text-primary hover:underline">browse</span>
								</p>
								<p className="text-xs text-muted-foreground mt-1">
									PNG, JPG, WebP, SVG, MP4, MP3, PDF, CSV up to 100MB
								</p>
								<input
									ref={fileInputRef}
									type="file"
									className="hidden"
									onChange={handleFileInputChange}
									accept="image/*,video/*,audio/*,.pdf,.csv,.txt"
								/>
							</button>
						) : (
							<div className="space-y-4">
								<div className="flex items-center justify-between p-3 rounded border border-border bg-muted/20">
									<div className="flex items-center space-x-3 min-w-0">
										{previewUrl ? (
											<img
												src={previewUrl}
												alt="Preview"
												className="size-12 rounded object-cover border border-border flex-shrink-0"
											/>
										) : (
											<div className="size-12 rounded bg-muted flex items-center justify-center text-xs font-semibold uppercase text-muted-foreground flex-shrink-0">
												{selectedFile.name.split(".").pop()}
											</div>
										)}
										<div className="min-w-0 flex-1">
											<p className="text-xs font-semibold truncate">
												{selectedFile.name}
											</p>
											<p className="text-[11px] text-muted-foreground">
												{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB •{" "}
												{selectedFile.type || "file"}
											</p>
										</div>
									</div>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="h-8 w-8 text-muted-foreground hover:text-foreground"
										onClick={() => {
											resetForm();
										}}
									>
										<XIcon className="size-4" />
									</Button>
								</div>

								<div className="grid grid-cols-1 gap-3.5 pt-1">
									<div className="space-y-1.5">
										<Label className="text-xs font-medium">
											Title / Display Name
										</Label>
										<Input
											value={title}
											onChange={(e) => setTitle(e.target.value)}
											placeholder="Hero banner image"
											className="h-8 text-xs"
										/>
									</div>

									{selectedFile.type.startsWith("image/") && (
										<div className="space-y-1.5">
											<Label className="text-xs font-medium">
												Alt Text (for accessibility)
											</Label>
											<Input
												value={altText}
												onChange={(e) => setAltText(e.target.value)}
												placeholder="Describe the image content..."
												className="h-8 text-xs"
											/>
										</div>
									)}

									<div className="space-y-1.5">
										<Label className="text-xs font-medium">Caption</Label>
										<Input
											value={caption}
											onChange={(e) => setCaption(e.target.value)}
											placeholder="Optional caption or credit..."
											className="h-8 text-xs"
										/>
									</div>

									<div className="space-y-1.5">
										<Label className="text-xs font-medium">
											Tags (comma-separated)
										</Label>
										<Input
											value={tagsInput}
											onChange={(e) => setTagsInput(e.target.value)}
											placeholder="marketing, hero, blog"
											className="h-8 text-xs"
										/>
									</div>
								</div>
							</div>
						)}
					</div>

					<DialogFooter className="p-4 px-6 border-t border-border bg-muted/10 sm:justify-end gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => onOpenChange(false)}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							size="sm"
							disabled={!selectedFile || isSubmitting}
						>
							{isSubmitting ? "Uploading..." : "Save Asset"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

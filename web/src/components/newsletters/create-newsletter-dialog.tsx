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

interface CreateNewsletterDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (data: {
		title: string;
		subject: string;
		previewText?: string;
	}) => void;
	isPending: boolean;
}

export function CreateNewsletterDialog({
	open,
	onOpenChange,
	onSubmit,
	isPending,
}: CreateNewsletterDialogProps) {
	const [subject, setSubject] = React.useState("");
	const [title, setTitle] = React.useState("");
	const [previewText, setPreviewText] = React.useState("");

	React.useEffect(() => {
		if (open) {
			setSubject("");
			setTitle("");
			setPreviewText("");
		}
	}, [open]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!subject.trim()) {
			toast.error("Subject line is required");
			return;
		}
		onSubmit({
			title: title.trim() || subject.trim(),
			subject: subject.trim(),
			previewText: previewText.trim() || undefined,
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>New Newsletter Issue</DialogTitle>
					<DialogDescription>
						Draft a new email dispatch to broadcast to your subscriber list.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4 py-2">
					<div className="space-y-1.5">
						<Label htmlFor="nl-subject">Subject line *</Label>
						<Input
							id="nl-subject"
							placeholder="e.g. Spile v2.0 is here: A new chapter in publishing"
							value={subject}
							onChange={(e) => setSubject(e.target.value)}
							required
							autoFocus
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="nl-preview">Preview text (Preheader)</Label>
						<Input
							id="nl-preview"
							placeholder="e.g. A quick look at what's new and our roadmap ahead..."
							value={previewText}
							onChange={(e) => setPreviewText(e.target.value)}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="nl-title">Internal campaign title</Label>
						<Input
							id="nl-title"
							placeholder="e.g. Product Update #24"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
						/>
					</div>
					<DialogFooter className="pt-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isPending}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isPending || !subject.trim()}>
							{isPending ? "Creating..." : "Create Draft"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

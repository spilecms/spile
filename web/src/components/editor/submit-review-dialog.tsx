import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { mockApi } from "@/lib/mock/api";
import { useEditorStore } from "@/lib/store/editor-store";

interface SubmitReviewDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	targetType: "post" | "doc";
	targetId: string;
	title: string;
	onSubmitted?: () => void;
}

export function SubmitReviewDialog({
	open,
	onOpenChange,
	targetType,
	targetId,
	title,
	onSubmitted,
}: SubmitReviewDialogProps) {
	const [summary, setSummary] = useState("");
	const [reviewerId, setReviewerId] = useState("");
	const qc = useQueryClient();

	const { data: users = [] } = useQuery({
		queryKey: ["users"],
		queryFn: () => mockApi.users.list(),
	});

	// Eligible reviewers are Admin, Editor, Owner
	const reviewers = users.filter(
		(u) => u.role === "admin" || u.role === "editor" || u.role === "owner",
	);

	const submitMutation = useMutation({
		mutationFn: async () => {
			const blocks = useEditorStore.getState().blocks;
			return mockApi.reviews.submit({
				targetType,
				targetId,
				targetTitle: title || "Untitled",
				content: blocks,
				summary: summary.trim(),
				reviewerId: reviewerId || undefined,
			});
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["reviews", targetId] });
			qc.invalidateQueries({ queryKey: ["revisions", targetId] });
			qc.invalidateQueries({ queryKey: ["notifications"] });
			onOpenChange(false);
			setSummary("");
			onSubmitted?.();
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!summary.trim()) return;
		submitMutation.mutate();
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Send className="size-4 text-primary" />
							Submit Changes for Review
						</DialogTitle>
						<DialogDescription>
							As a contributor, your changes require approval from an editor or
							admin before being published live.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 py-3">
						<div className="space-y-1.5">
							<Label htmlFor="review-title" className="text-xs font-semibold">
								Document
							</Label>
							<div className="rounded-md border bg-muted/30 px-3 py-1.5 text-xs text-foreground font-medium">
								{title || "Untitled"}
							</div>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor="change-summary" className="text-xs font-semibold">
								Change Summary <span className="text-rose-500">*</span>
							</Label>
							<Textarea
								id="change-summary"
								placeholder="e.g. Added section on JWT auth, updated curl code samples, fixed broken anchor links..."
								value={summary}
								onChange={(e) => setSummary(e.target.value)}
								rows={3}
								required
								className="text-xs resize-none"
							/>
						</div>

						<div className="space-y-1.5">
							<Label
								htmlFor="reviewer-select"
								className="text-xs font-semibold"
							>
								Assign Reviewer (Optional)
							</Label>
							<Select
								value={reviewerId}
								onValueChange={(val) => setReviewerId(val ?? "")}
							>
								<SelectTrigger className="w-full text-xs">
									<SelectValue placeholder="Auto-assign next available editor" />
								</SelectTrigger>
								<SelectContent>
									{reviewers.map((r) => (
										<SelectItem key={r.id} value={r.id} className="text-xs">
											{r.name} ({r.role})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<DialogFooter className="pt-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => onOpenChange(false)}
							disabled={submitMutation.isPending}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							size="sm"
							disabled={!summary.trim() || submitMutation.isPending}
							className="gap-1.5"
						>
							<Send className="size-3.5" />
							{submitMutation.isPending ? "Submitting..." : "Submit for Review"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

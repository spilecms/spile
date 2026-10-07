import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle, MessageSquare, Send } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { mockApi } from "@/lib/mock/api";
import type { ReviewRequest } from "@/types/domain";

interface ReviewActionBarProps {
	review: ReviewRequest;
	onApproved?: () => void;
}

export function ReviewActionBar({ review, onApproved }: ReviewActionBarProps) {
	const [changesModalOpen, setChangesModalOpen] = useState(false);
	const [feedback, setFeedback] = useState("");
	const qc = useQueryClient();

	const approveMutation = useMutation({
		mutationFn: () => mockApi.reviews.approve(review.id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["reviews", review.targetId] });
			qc.invalidateQueries({ queryKey: ["revisions", review.targetId] });
			qc.invalidateQueries({ queryKey: ["notifications"] });
			qc.invalidateQueries({ queryKey: ["posts"] });
			qc.invalidateQueries({ queryKey: ["docs"] });
			onApproved?.();
		},
	});

	const requestChangesMutation = useMutation({
		mutationFn: () =>
			mockApi.reviews.requestChanges(review.id, feedback.trim()),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["reviews", review.targetId] });
			qc.invalidateQueries({ queryKey: ["revisions", review.targetId] });
			qc.invalidateQueries({ queryKey: ["notifications"] });
			setChangesModalOpen(false);
			setFeedback("");
		},
	});

	return (
		<>
			<div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/20 bg-primary/10 px-4 py-2 text-xs transition-colors">
				<div className="flex items-center gap-2 min-w-0">
					<Badge
						variant="outline"
						className="border-primary/40 bg-primary/20 text-primary font-semibold text-[10px] uppercase"
					>
						Review Mode
					</Badge>
					<span className="text-muted-foreground truncate">
						Submitted by{" "}
						<strong className="text-foreground font-medium">
							{review.authorName}
						</strong>
						: &ldquo;{review.summary}&rdquo;
					</span>
				</div>

				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => setChangesModalOpen(true)}
						disabled={
							approveMutation.isPending || requestChangesMutation.isPending
						}
						className="h-7 gap-1.5 text-xs text-rose-500 border-rose-500/30 hover:bg-rose-500/10"
					>
						<MessageSquare className="size-3.5" />
						Request Changes
					</Button>

					<Button
						size="sm"
						onClick={() => approveMutation.mutate()}
						disabled={
							approveMutation.isPending || requestChangesMutation.isPending
						}
						className="h-7 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-semibold"
					>
						<CheckCircle className="size-3.5" />
						{approveMutation.isPending ? "Publishing..." : "Approve & Publish"}
					</Button>
				</div>
			</div>

			{/* Request Changes Modal */}
			<Dialog open={changesModalOpen} onOpenChange={setChangesModalOpen}>
				<DialogContent className="sm:max-w-md">
					<form
						onSubmit={(e) => {
							e.preventDefault();
							if (feedback.trim()) requestChangesMutation.mutate();
						}}
					>
						<DialogHeader>
							<DialogTitle className="flex items-center gap-2 text-rose-500">
								<AlertCircle className="size-4" />
								Request Changes
							</DialogTitle>
							<DialogDescription>
								Provide specific feedback to {review.authorName} explaining what
								needs to be updated before publication.
							</DialogDescription>
						</DialogHeader>

						<div className="space-y-3 py-3">
							<div className="space-y-1.5">
								<Label
									htmlFor="feedback-notes"
									className="text-xs font-semibold"
								>
									Review Feedback <span className="text-rose-500">*</span>
								</Label>
								<Textarea
									id="feedback-notes"
									placeholder="e.g. Please update the error code schema in the response tabs, and verify the token header format..."
									value={feedback}
									onChange={(e) => setFeedback(e.target.value)}
									rows={4}
									required
									className="text-xs resize-none"
								/>
							</div>
						</div>

						<DialogFooter className="pt-2">
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => setChangesModalOpen(false)}
								disabled={requestChangesMutation.isPending}
							>
								Cancel
							</Button>
							<Button
								type="submit"
								size="sm"
								disabled={!feedback.trim() || requestChangesMutation.isPending}
								className="gap-1.5 bg-rose-600 hover:bg-rose-500 text-white"
							>
								<Send className="size-3.5" />
								{requestChangesMutation.isPending
									? "Sending..."
									: "Send Feedback"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</>
	);
}

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, Lock, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockApi } from "@/lib/mock/api";
import type { ReviewRequest, User } from "@/types/domain";

interface ReviewLockBannerProps {
	review: ReviewRequest;
	currentUser?: User;
}

export function ReviewLockBanner({
	review,
	currentUser,
}: ReviewLockBannerProps) {
	const qc = useQueryClient();

	const withdrawMutation = useMutation({
		mutationFn: () => mockApi.reviews.withdraw(review.id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["reviews", review.targetId] });
			qc.invalidateQueries({ queryKey: ["revisions", review.targetId] });
			qc.invalidateQueries({ queryKey: ["notifications"] });
		},
	});

	const isAuthor = currentUser?.id === review.authorId;

	return (
		<div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-500 transition-colors">
			<div className="flex items-center gap-2.5 min-w-0">
				<Lock className="size-4 shrink-0 text-amber-500" />
				<div className="min-w-0">
					<p className="font-semibold text-foreground">
						Locked: Pending Editorial Review
					</p>
					<p className="text-[11px] text-muted-foreground truncate">
						Submitted by{" "}
						<span className="font-medium text-foreground">
							{review.authorName}
						</span>
						{review.reviewerName ? ` (assigned to ${review.reviewerName})` : ""}
						: &ldquo;{review.summary}&rdquo;
					</p>
				</div>
			</div>

			<div className="flex items-center gap-2">
				<span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
					<Clock className="size-3.5" />
					Read-only mode
				</span>

				{isAuthor && (
					<Button
						variant="outline"
						size="sm"
						onClick={() => withdrawMutation.mutate()}
						disabled={withdrawMutation.isPending}
						className="h-7 gap-1 border-amber-500/30 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
					>
						<Undo2 className="size-3" />
						{withdrawMutation.isPending ? "Withdrawing..." : "Withdraw Request"}
					</Button>
				)}
			</div>
		</div>
	);
}

import { useQuery } from "@tanstack/react-query";
import {
	AlertCircleIcon,
	ArrowRightIcon,
	CheckCircle2Icon,
	InboxIcon,
	UserIcon,
} from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeTime } from "@/lib/format";
import { mockApi } from "@/lib/mock/api";
import { usePermissions } from "@/lib/permissions";

export function PendingReviewsCard() {
	const { t } = useTranslation();

	const { can, user: currentUser } = usePermissions();

	const { data: reviews, isPending: reviewsPending } = useQuery({
		queryKey: ["reviews", "list"],
		queryFn: () => mockApi.reviews.list(),
	});

	const isReviewerRole = can("review:approve");

	const pendingReviews = React.useMemo(() => {
		if (!reviews) return [];

		if (isReviewerRole) {
			// Editors/Admins see items awaiting their review
			return reviews.filter((r) => r.status === "in_review");
		}
		// Contributors/Authors see drafts they submitted that are in review or have changes requested
		return reviews.filter(
			(r) =>
				r.authorId === currentUser?.id &&
				(r.status === "in_review" || r.status === "changes_requested"),
		);
	}, [reviews, isReviewerRole, currentUser]);

	const isLoading = !currentUser || reviewsPending;

	return (
		<Card className="flex flex-col">
			<CardHeader className="flex flex-row items-center justify-between pb-3">
				<div>
					<CardTitle className="text-base font-semibold flex items-center gap-2">
						<InboxIcon className="size-4 text-primary" />
						<span>
							{t("overview.pendingReviews.title", "Editorial Review Queue")}
						</span>
						{pendingReviews.length > 0 && (
							<Badge
								variant="secondary"
								className="text-xs px-2 py-0.5 rounded-full font-mono"
							>
								{pendingReviews.length}
							</Badge>
						)}
					</CardTitle>
					<CardDescription className="text-xs mt-1">
						{isReviewerRole
							? t(
									"overview.pendingReviews.reviewerDesc",
									"Drafts submitted by contributors awaiting editorial sign-off",
								)
							: t(
									"overview.pendingReviews.authorDesc",
									"Track the review status of your submitted drafts",
								)}
					</CardDescription>
				</div>
			</CardHeader>
			<CardContent className="flex-1 flex flex-col justify-between p-0">
				{isLoading ? (
					<div className="flex flex-col gap-2 p-6">
						<Skeleton className="h-14 w-full" />
						<Skeleton className="h-14 w-full" />
					</div>
				) : pendingReviews.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-10 px-6 text-center text-muted-foreground my-auto">
						<div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-2">
							<CheckCircle2Icon className="size-5" />
						</div>
						<p className="text-sm font-medium text-foreground">
							{t("overview.pendingReviews.emptyTitle", "All caught up")}
						</p>
						<p className="text-xs text-muted-foreground mt-0.5 max-w-xs">
							{isReviewerRole
								? t(
										"overview.pendingReviews.emptyReviewer",
										"No pending drafts awaiting review. You're ready to publish!",
									)
								: t(
										"overview.pendingReviews.emptyAuthor",
										"You have no drafts waiting in review.",
									)}
						</p>
					</div>
				) : (
					<div className="divide-y divide-border/60">
						{pendingReviews.slice(0, 5).map((review) => {
							const editorUrl =
								review.targetType === "doc"
									? `/editor/doc/${review.targetId}`
									: `/editor/${review.targetId}`;

							return (
								<div
									key={review.id}
									className="flex items-center justify-between gap-3 px-6 py-3.5 transition-colors hover:bg-muted/40"
								>
									<div className="flex min-w-0 flex-1 flex-col gap-1">
										<div className="flex items-center gap-2">
											<span className="truncate text-sm font-medium text-foreground">
												{review.targetTitle}
											</span>
											<Badge
												variant="outline"
												className="text-[10px] uppercase font-mono tracking-wider h-4 px-1"
											>
												{review.targetType}
											</Badge>
											{review.status === "changes_requested" ? (
												<Badge
													variant="destructive"
													className="text-[10px] h-4 px-1.5 flex items-center gap-1"
												>
													<AlertCircleIcon className="size-2.5" />
													<span>Changes Requested</span>
												</Badge>
											) : (
												<Badge
													variant="secondary"
													className="text-[10px] h-4 px-1.5 text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20"
												>
													In Review
												</Badge>
											)}
										</div>

										<p className="text-xs text-muted-foreground line-clamp-1 italic">
											&ldquo;{review.summary}&rdquo;
										</p>

										<div className="flex items-center gap-2 text-[11px] text-muted-foreground/80 mt-0.5">
											<span className="flex items-center gap-1">
												<UserIcon className="size-3" />
												<span>{review.authorName}</span>
											</span>
											<span>·</span>
											<span>{formatRelativeTime(review.createdAt)}</span>
										</div>
									</div>

									<Button
										render={<Link to={editorUrl} />}
										variant="outline"
										size="sm"
										className="h-8 text-xs gap-1.5 shrink-0"
									>
										<span>
											{isReviewerRole
												? t("overview.pendingReviews.actionReview", "Review")
												: t("overview.pendingReviews.actionOpen", "Open")}
										</span>
										<ArrowRightIcon className="size-3" />
									</Button>
								</div>
							);
						})}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

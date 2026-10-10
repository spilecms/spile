import { useQuery } from "@tanstack/react-query";
import {
	ActivityIcon,
	CircleCheckIcon,
	FilePlus2Icon,
	FileTextIcon,
	PenLineIcon,
	SendIcon,
	UserPlusIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { PendingReviewsCard } from "@/components/dashboard/overview/pending-reviews-card";
import { ScheduledPipelineCard } from "@/components/dashboard/overview/scheduled-pipeline-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	formatNumber,
	formatReadingTime,
	formatRelativeTime,
} from "@/lib/format";
import { mockApi } from "@/lib/mock/api";

const ACTIVITY_ICON = {
	published: CircleCheckIcon,
	created: FilePlus2Icon,
	updated: PenLineIcon,
	scheduled: SendIcon,
	member: UserPlusIcon,
};

export default function Overview() {
	const { t } = useTranslation();

	const { data: recentPosts, isPending: postsPending } = useQuery({
		queryKey: ["posts", "recent"],
		queryFn: () => mockApi.posts.list({ status: "all" }),
	});

	const { data: activity, isPending: activityPending } = useQuery({
		queryKey: ["overview", "activity"],
		queryFn: () => mockApi.overview.activity(),
	});

	return (
		<div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-6 @container/main">
			{/* Top Operational Row: Editorial Inbox & Upcoming Releases */}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<PendingReviewsCard />
				<ScheduledPipelineCard />
			</div>

			{/* Bottom Output Row: Recent Posts & Team Activity Stream */}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<Card className="flex flex-col">
					<CardHeader className="flex flex-row items-center justify-between pb-3">
						<div>
							<CardTitle className="text-base font-semibold flex items-center gap-2">
								<FileTextIcon className="size-4 text-primary" />
								<span>{t("overview.recentPosts.title", "Recent Content")}</span>
							</CardTitle>
							<CardDescription className="text-xs mt-1">
								{t(
									"overview.recentPosts.description",
									"Your latest drafts and publications",
								)}
							</CardDescription>
						</div>
						<Link
							to="/posts"
							className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
						>
							{t("common.viewAll", "View all")}
						</Link>
					</CardHeader>
					<CardContent className="flex flex-col gap-1 p-0">
						{postsPending
							? ["s1", "s2", "s3", "s4", "s5"].map((key) => (
									<Skeleton key={key} className="mx-6 h-12" />
								))
							: (recentPosts ?? []).slice(0, 6).map((post) => (
									<Link
										key={post.id}
										to={`/editor/${post.id}`}
										className="flex items-center gap-3 border-t px-6 py-3 transition-colors first:border-t-0 hover:bg-muted/50"
									>
										<div className="flex min-w-0 flex-1 flex-col gap-0.5">
											<span className="truncate text-sm font-medium">
												{post.title}
											</span>
											<span className="text-xs text-muted-foreground">
												{formatRelativeTime(post.updatedAt)} ·{" "}
												{formatReadingTime(post.readingTime)}
											</span>
										</div>
										<span className="text-xs tabular-nums text-muted-foreground">
											{t("overview.recentPosts.views", {
												count: formatNumber(post.views),
											})}
										</span>
										<StatusBadge status={post.status} />
									</Link>
								))}
					</CardContent>
				</Card>

				<Card className="flex flex-col">
					<CardHeader className="flex flex-row items-center justify-between pb-3">
						<div>
							<CardTitle className="text-base font-semibold flex items-center gap-2">
								<ActivityIcon className="size-4 text-primary" />
								<span>
									{t("overview.recentActivity.title", "Team Activity")}
								</span>
							</CardTitle>
							<CardDescription className="text-xs mt-1">
								{t(
									"overview.recentActivity.description",
									"Audit trail of team actions across your site",
								)}
							</CardDescription>
						</div>
					</CardHeader>
					<CardContent className="p-6 pt-3">
						{activityPending ? (
							<div className="flex flex-col gap-3">
								{["s1", "s2", "s3", "s4", "s5"].map((key) => (
									<Skeleton key={key} className="h-8" />
								))}
							</div>
						) : (
							<ol className="flex flex-col gap-4">
								{(activity ?? []).map((item) => {
									const Icon = ACTIVITY_ICON[item.type];
									return (
										<li key={item.id} className="flex items-start gap-3">
											<div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
												<Icon className="size-3.5 text-muted-foreground" />
											</div>
											<div className="flex min-w-0 flex-1 flex-col gap-0.5">
												<span className="text-sm">{item.text}</span>
												<span className="text-xs text-muted-foreground">
													{formatRelativeTime(item.at)}
												</span>
											</div>
										</li>
									);
								})}
							</ol>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

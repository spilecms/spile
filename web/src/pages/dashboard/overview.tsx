import { useQuery } from "@tanstack/react-query";
import {
	CircleCheckIcon,
	FilePlus2Icon,
	PenLineIcon,
	SendIcon,
	UserPlusIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ChartAreaInteractive } from "@/components/dashboard/chart-area-interactive";
import { SectionCards } from "@/components/dashboard/section-cards";
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
		queryFn: () => mockApi.posts.list({ type: "post", status: "all" }),
	});

	const { data: activity, isPending: activityPending } = useQuery({
		queryKey: ["overview", "activity"],
		queryFn: () => mockApi.overview.activity(),
	});

	return (
		<div className="flex flex-1 flex-col gap-6 py-6 @container/main">
			<SectionCards />

			<div className="px-4 lg:px-6">
				<ChartAreaInteractive />
			</div>

			<div className="grid grid-cols-1 gap-6 px-4 lg:grid-cols-2 lg:px-6">
				<Card>
					<CardHeader>
						<CardTitle>{t("overview.recentPosts.title")}</CardTitle>
						<CardDescription>
							{t("overview.recentPosts.description")}
						</CardDescription>
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

				<Card>
					<CardHeader>
						<CardTitle>{t("overview.recentActivity.title")}</CardTitle>
						<CardDescription>
							{t("overview.recentActivity.description")}
						</CardDescription>
					</CardHeader>
					<CardContent>
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

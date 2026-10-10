import { useQuery } from "@tanstack/react-query";
import {
	CalendarClockIcon,
	ChevronRightIcon,
	FileTextIcon,
	MailIcon,
	SendIcon,
} from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/format";
import { mockApi } from "@/lib/mock/api";

interface ScheduledItem {
	id: string;
	title: string;
	type: "post" | "newsletter";
	scheduledFor: number;
	url: string;
	details?: string;
}

function formatScheduledDate(timestamp: number): string {
	const date = new Date(timestamp);
	const now = new Date();
	const diffMs = timestamp - now.getTime();
	const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

	const timeStr = date.toLocaleTimeString(undefined, {
		hour: "numeric",
		minute: "2-digit",
	});

	if (diffDays === 0) {
		return `Today at ${timeStr}`;
	}
	if (diffDays === 1) {
		return `Tomorrow at ${timeStr}`;
	}
	if (diffDays > 1 && diffDays < 7) {
		const weekday = date.toLocaleDateString(undefined, { weekday: "short" });
		return `${weekday} at ${timeStr}`;
	}
	return date.toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

export function ScheduledPipelineCard() {
	const { t } = useTranslation();

	const { data: posts, isPending: postsPending } = useQuery({
		queryKey: ["posts", "scheduled"],
		queryFn: () => mockApi.posts.list({ status: "scheduled" }),
	});

	const { data: newsletters, isPending: newslettersPending } = useQuery({
		queryKey: ["newsletters", "scheduled"],
		queryFn: () => mockApi.newsletters.list({ status: "scheduled" }),
	});

	const scheduledItems = React.useMemo(() => {
		const items: ScheduledItem[] = [];

		for (const p of posts ?? []) {
			if (p.scheduledFor) {
				items.push({
					id: p.id,
					title: p.title,
					type: "post",
					scheduledFor: p.scheduledFor,
					url: `/editor/${p.id}`,
					details: p.readingTime ? `${p.readingTime} min read` : undefined,
				});
			}
		}

		for (const nl of newsletters ?? []) {
			if (nl.scheduledFor) {
				items.push({
					id: nl.id,
					title: nl.title || nl.subject,
					type: "newsletter",
					scheduledFor: nl.scheduledFor,
					url: `/editor/newsletter/${nl.id}`,
					details: nl.recipientsCount
						? `${formatNumber(nl.recipientsCount)} recipients`
						: undefined,
				});
			}
		}

		return items.sort((a, b) => a.scheduledFor - b.scheduledFor);
	}, [posts, newsletters]);

	const isLoading = postsPending || newslettersPending;

	return (
		<Card className="flex flex-col">
			<CardHeader className="flex flex-row items-center justify-between pb-3">
				<div>
					<CardTitle className="text-base font-semibold flex items-center gap-2">
						<CalendarClockIcon className="size-4 text-primary" />
						<span>
							{t("overview.scheduledPipeline.title", "Scheduled Releases")}
						</span>
						{scheduledItems.length > 0 && (
							<Badge
								variant="secondary"
								className="text-xs px-2 py-0.5 rounded-full font-mono"
							>
								{scheduledItems.length}
							</Badge>
						)}
					</CardTitle>
					<CardDescription className="text-xs mt-1">
						{t(
							"overview.scheduledPipeline.description",
							"Upcoming posts and email newsletters queued to publish",
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
				) : scheduledItems.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-10 px-6 text-center text-muted-foreground my-auto">
						<div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground mb-2">
							<SendIcon className="size-5" />
						</div>
						<p className="text-sm font-medium text-foreground">
							{t(
								"overview.scheduledPipeline.emptyTitle",
								"No scheduled releases",
							)}
						</p>
						<p className="text-xs text-muted-foreground mt-0.5 max-w-xs">
							{t(
								"overview.scheduledPipeline.emptyDesc",
								"When you schedule a post or newsletter broadcast, it will appear here.",
							)}
						</p>
					</div>
				) : (
					<div className="divide-y divide-border/60">
						{scheduledItems.slice(0, 5).map((item) => (
							<Link
								key={item.id}
								to={item.url}
								className="flex items-center justify-between gap-3 px-6 py-3.5 transition-colors hover:bg-muted/40"
							>
								<div className="flex min-w-0 flex-1 flex-col gap-1">
									<div className="flex items-center gap-2">
										<span className="truncate text-sm font-medium text-foreground hover:underline">
											{item.title}
										</span>
										<Badge
											variant="outline"
											className="text-[10px] uppercase font-mono tracking-wider h-4 px-1 gap-1"
										>
											{item.type === "post" ? (
												<FileTextIcon className="size-2.5 text-muted-foreground" />
											) : (
												<MailIcon className="size-2.5 text-muted-foreground" />
											)}
											<span>{item.type}</span>
										</Badge>
									</div>

									<div className="flex items-center gap-2 text-xs text-muted-foreground">
										<span className="font-medium text-primary/90">
											{formatScheduledDate(item.scheduledFor)}
										</span>
										{item.details && (
											<>
												<span>·</span>
												<span>{item.details}</span>
											</>
										)}
									</div>
								</div>

								<ChevronRightIcon className="size-4 text-muted-foreground shrink-0" />
							</Link>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

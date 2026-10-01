import { useQuery } from "@tanstack/react-query";
import {
	ClockIcon,
	EyeIcon,
	FileTextIcon,
	TrendingDownIcon,
	TrendingUpIcon,
	UsersIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardAction,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber, formatPercent } from "@/lib/format";
import { mockApi } from "@/lib/mock/api";

export function SectionCards() {
	const { data: stats, isPending } = useQuery({
		queryKey: ["overview", "stats"],
		queryFn: () => mockApi.overview.stats(),
	});

	if (isPending || !stats) {
		return (
			<div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
				{["views", "posts", "members", "read-time"].map((key) => (
					<Skeleton key={key} className="h-36 rounded-xl" />
				))}
			</div>
		);
	}

	const cards = [
		{
			label: "Total views",
			value: formatNumber(stats.totalViews),
			trend: stats.viewsTrend,
			footer: "Views across all published posts",
			icon: <EyeIcon className="size-4 text-muted-foreground" />,
		},
		{
			label: "Published posts",
			value: String(stats.published),
			trend: null,
			footer: `${stats.drafts} drafts waiting on you`,
			icon: <FileTextIcon className="size-4 text-muted-foreground" />,
		},
		{
			label: "Members",
			value: formatNumber(stats.members),
			trend: stats.membersTrend,
			footer: "Newsletter subscribers",
			icon: <UsersIcon className="size-4 text-muted-foreground" />,
		},
		{
			label: "Avg. read time",
			value: `${stats.avgReadTime} min`,
			trend: null,
			footer: "Across published posts",
			icon: <ClockIcon className="size-4 text-muted-foreground" />,
		},
	];

	return (
		<div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
			{cards.map((card) => (
				<Card key={card.label} className="@container/card">
					<CardHeader>
						<CardDescription className="flex items-center gap-1.5">
							{card.icon}
							{card.label}
						</CardDescription>
						<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
							{card.value}
						</CardTitle>
						{card.trend !== null && (
							<CardAction>
								<Badge variant="outline">
									{card.trend >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
									{formatPercent(card.trend)}
								</Badge>
							</CardAction>
						)}
					</CardHeader>
					<CardFooter className="flex-col items-start gap-1.5 text-sm">
						<div className="text-muted-foreground">{card.footer}</div>
					</CardFooter>
				</Card>
			))}
		</div>
	);
}

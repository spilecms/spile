import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatNumber } from "@/lib/format";
import { mockApi } from "@/lib/mock/api";
import type { ViewsRange } from "@/types/domain";

export function ChartAreaInteractive() {
	const { t } = useTranslation();
	const isMobile = useIsMobile();
	const [timeRange, setTimeRange] = React.useState<ViewsRange>("30d");

	const chartConfig = React.useMemo(
		() =>
			({
				views: {
					label: t("overview.chart.views"),
					color: "var(--primary)",
				},
				visitors: {
					label: t("overview.chart.visitors"),
					color: "var(--color-visitors)",
				},
			}) satisfies ChartConfig,
		[t],
	);

	const rangeLabels: Record<ViewsRange, string> = {
		"7d": t("overview.chart.last7Days"),
		"30d": t("overview.chart.last30Days"),
		"90d": t("overview.chart.last3Months"),
	};

	React.useEffect(() => {
		if (isMobile) {
			setTimeRange("7d");
		}
	}, [isMobile]);

	const { data, isPending } = useQuery({
		queryKey: ["overview", "views", timeRange],
		queryFn: () => mockApi.overview.views(timeRange),
	});

	const points = data ?? [];
	const totalViews = points.reduce((sum, p) => sum + p.views, 0);

	return (
		<Card className="@container/card">
			<CardHeader>
				<CardTitle>{t("overview.chart.title")}</CardTitle>
				<CardDescription>
					<span className="hidden @[540px]/card:block">
						{points.length > 0
							? t("overview.chart.totalForDays", { count: points.length })
							: t("overview.chart.loading")}
					</span>
					<span className="@[540px]/card:hidden">{rangeLabels[timeRange]}</span>
				</CardDescription>
				<CardAction>
					<ToggleGroup
						multiple={false}
						value={timeRange ? [timeRange] : []}
						onValueChange={(value) => {
							setTimeRange((value[0] as ViewsRange) ?? "30d");
						}}
						variant="outline"
						className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
					>
						<ToggleGroupItem value="90d">{rangeLabels["90d"]}</ToggleGroupItem>
						<ToggleGroupItem value="30d">{rangeLabels["30d"]}</ToggleGroupItem>
						<ToggleGroupItem value="7d">{rangeLabels["7d"]}</ToggleGroupItem>
					</ToggleGroup>
					<Select
						value={timeRange}
						onValueChange={(value) => {
							if (value !== null) {
								setTimeRange(value as ViewsRange);
							}
						}}
					>
						<SelectTrigger
							className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
							size="sm"
							aria-label={t("overview.chart.selectRangeAria")}
						>
							<SelectValue placeholder={rangeLabels["30d"]} />
						</SelectTrigger>
						<SelectContent className="rounded-xl">
							<SelectItem value="90d" className="rounded-lg">
								{rangeLabels["90d"]}
							</SelectItem>
							<SelectItem value="30d" className="rounded-lg">
								{rangeLabels["30d"]}
							</SelectItem>
							<SelectItem value="7d" className="rounded-lg">
								{rangeLabels["7d"]}
							</SelectItem>
						</SelectContent>
					</Select>
				</CardAction>
			</CardHeader>
			<CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
				{isPending ? (
					<Skeleton className="h-62.5 w-full" />
				) : (
					<ChartContainer
						config={chartConfig}
						className="aspect-auto h-62.5 w-full"
					>
						<AreaChart data={points}>
							<defs>
								<linearGradient id="fillViews" x1="0" y1="0" x2="0" y2="1">
									<stop
										offset="5%"
										stopColor="var(--color-views)"
										stopOpacity={1.0}
									/>
									<stop
										offset="95%"
										stopColor="var(--color-views)"
										stopOpacity={0.1}
									/>
								</linearGradient>
								<linearGradient id="fillVisitors" x1="0" y1="0" x2="0" y2="1">
									<stop
										offset="5%"
										stopColor="var(--color-visitors)"
										stopOpacity={0.8}
									/>
									<stop
										offset="95%"
										stopColor="var(--color-visitors)"
										stopOpacity={0.1}
									/>
								</linearGradient>
							</defs>
							<CartesianGrid vertical={false} />
							<XAxis
								dataKey="date"
								tickLine={false}
								axisLine={false}
								tickMargin={8}
								minTickGap={32}
								tickFormatter={(value) => {
									const date = new Date(value);
									return date.toLocaleDateString("en-US", {
										month: "short",
										day: "numeric",
									});
								}}
							/>
							<ChartTooltip
								cursor={false}
								content={
									<ChartTooltipContent
										labelFormatter={(value) => {
											return new Date(value).toLocaleDateString("en-US", {
												month: "short",
												day: "numeric",
											});
										}}
										indicator="dot"
									/>
								}
							/>
							<Area
								dataKey="visitors"
								type="natural"
								fill="url(#fillVisitors)"
								stroke="var(--color-visitors)"
								stackId="a"
							/>
							<Area
								dataKey="views"
								type="natural"
								fill="url(#fillViews)"
								stroke="var(--color-views)"
								stackId="a"
							/>
						</AreaChart>
					</ChartContainer>
				)}
				<div className="mt-2 text-xs text-muted-foreground">
					{t("overview.chart.viewsPeriod", { count: formatNumber(totalViews) })}
				</div>
			</CardContent>
		</Card>
	);
}

import { useQuery } from "@tanstack/react-query";
import {
	ArrowLeftIcon,
	BookOpenIcon,
	ClockIcon,
	ExternalLinkIcon,
	EyeIcon,
	FileTextIcon,
	FolderIcon,
	PercentIcon,
	SearchIcon,
	TrendingDownIcon,
	TrendingUpIcon,
	UsersIcon,
} from "lucide-react";
import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { AudienceMapCard } from "@/components/analytics/audience-map-card";
import { TrafficSourcesCard } from "@/components/analytics/traffic-sources-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
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
import { CountryFlag } from "@/components/ui/country-flag";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatNumber } from "@/lib/format";
import { mockApi } from "@/lib/mock/api";
import type {
	AnalyticsEntityType,
	AnalyticsTimeRange,
	DocPageAnalytics,
	PostAnalytics,
} from "@/types/analytics";

const chartConfig = {
	views: {
		label: "Page Views",
		color: "var(--primary)",
	},
	visitors: {
		label: "Unique Visitors",
		color: "var(--color-visitors, #3b82f6)",
	},
} satisfies ChartConfig;

const timeRangeOptions: { value: AnalyticsTimeRange; label: string }[] = [
	{ value: "24h", label: "Last 24 Hours" },
	{ value: "7d", label: "Last 7 Days" },
	{ value: "30d", label: "Last 30 Days" },
	{ value: "90d", label: "Last 90 Days" },
	{ value: "1y", label: "Last Year" },
];

export default function AnalyticsPage() {
	const isMobile = useIsMobile();
	const [searchParams, setSearchParams] = useSearchParams();

	// Check if viewing a specific item's analytics (Umami style)
	const entityType = searchParams.get("type") as AnalyticsEntityType | null;
	const entityId = searchParams.get("id");

	const [timeRange, setTimeRange] = React.useState<AnalyticsTimeRange>("30d");

	// State for directory selector
	const [catalogTab, setCatalogTab] = React.useState<"docs" | "posts">(
		entityType === "post" ? "posts" : "docs",
	);
	const [catalogSearch, setCatalogSearch] = React.useState<string>("");
	const [selectedProject, setSelectedProject] = React.useState<string>("all");

	// Queries
	const { data: projects } = useQuery({
		queryKey: ["docProjects", "list"],
		queryFn: () => mockApi.docs.listProjects(),
	});

	const { data: docPages, isLoading: docsLoading } = useQuery({
		queryKey: ["analytics", "docPages", selectedProject, catalogSearch],
		queryFn: () =>
			mockApi.analytics.getDocPages({
				projectId: selectedProject,
				query: catalogSearch,
			}),
	});

	const { data: posts, isLoading: postsLoading } = useQuery({
		queryKey: ["analytics", "posts"],
		queryFn: () => mockApi.analytics.getPosts(),
	});

	// If looking at an individual page
	const { data: detailData, isLoading: detailLoading } = useQuery({
		queryKey: ["analytics", "entityDetail", entityType, entityId, timeRange],
		queryFn: () =>
			mockApi.analytics.getEntityDetail(
				entityType as "post" | "doc",
				entityId as string,
				timeRange,
			),
		enabled: !!(entityType && entityId),
	});

	// Global queries if no entity is selected
	const { data: globalOverview, isLoading: globalOverviewLoading } = useQuery({
		queryKey: ["analytics", "overview", timeRange],
		queryFn: () => mockApi.analytics.getOverview(timeRange),
		enabled: !(entityType && entityId),
	});

	const { data: globalTimeSeries, isLoading: globalTimeSeriesLoading } =
		useQuery({
			queryKey: ["analytics", "timeSeries", timeRange],
			queryFn: () => mockApi.analytics.getTimeSeries(timeRange),
			enabled: !(entityType && entityId),
		});

	const overview = detailData ? detailData.overview : globalOverview;
	const overviewLoading = detailData ? detailLoading : globalOverviewLoading;
	const timeSeries = detailData ? detailData.timeSeries : globalTimeSeries;
	const chartLoading = detailData ? detailLoading : globalTimeSeriesLoading;

	const clearSelectedEntity = () => {
		const next = new URLSearchParams(searchParams);
		next.delete("type");
		next.delete("id");
		next.delete("project");
		setSearchParams(next);
	};

	const selectEntity = (type: AnalyticsEntityType, id: string) => {
		const next = new URLSearchParams(searchParams);
		next.set("type", type);
		next.set("id", id);
		setSearchParams(next);
	};

	const filteredPosts = React.useMemo(() => {
		if (!posts) return [];
		if (!catalogSearch.trim()) return posts;
		const q = catalogSearch.toLowerCase();
		return posts.filter(
			(p) =>
				p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q),
		);
	}, [posts, catalogSearch]);

	const localeFlagCode = (locale?: string) => {
		switch (locale) {
			case "en":
				return "US";
			case "es":
				return "ES";
			case "fr":
				return "FR";
			case "de":
				return "DE";
			case "am":
				return "ET";
			default:
				return (locale || "US").toUpperCase();
		}
	};

	return (
		<div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-6 @container/main">
			{/* Top Bar / Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					{entityId ? (
						<div className="flex items-center gap-3">
							<Button
								variant="outline"
								size="sm"
								onClick={clearSelectedEntity}
								className="h-8 gap-1.5 text-xs"
							>
								<ArrowLeftIcon className="size-3.5" />
								All Content
							</Button>
							<div>
								<div className="flex items-center gap-2">
									<Badge
										variant="secondary"
										className="font-mono text-[10px] uppercase"
									>
										{entityType === "doc" ? "Doc Article" : "Publication"}
									</Badge>
									<h1 className="text-lg font-bold tracking-tight truncate max-w-md">
										{detailData?.title ?? "Loading page..."}
									</h1>
								</div>
								<div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
									{detailData?.projectName && (
										<span className="font-medium text-foreground">
											{detailData.projectName} •
										</span>
									)}
									<span className="font-mono">/{detailData?.slug}</span>
									<Link
										to={
											entityType === "doc"
												? `/editor/doc/${entityId}`
												: `/editor/${entityId}`
										}
										className="inline-flex items-center gap-1 text-primary hover:underline ml-1"
									>
										Edit <ExternalLinkIcon className="size-3" />
									</Link>
								</div>
							</div>
						</div>
					) : (
						<div>
							<h1 className="text-xl font-bold tracking-tight">
								Analytics & Telemetry
							</h1>
							<p className="text-xs text-muted-foreground mt-0.5">
								Umami-style per-page analytics and privacy-first audience
								telemetry.
							</p>
						</div>
					)}
				</div>

				{/* Time Range Selector */}
				<div className="flex items-center gap-2">
					{isMobile ? (
						<Select
							value={timeRange}
							onValueChange={(val) => {
								if (val) setTimeRange(val as AnalyticsTimeRange);
							}}
						>
							<SelectTrigger className="w-35 text-xs">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{timeRangeOptions.map((opt) => (
									<SelectItem
										key={opt.value}
										value={opt.value}
										className="text-xs"
									>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					) : (
						<ToggleGroup
							multiple={false}
							value={timeRange ? [timeRange] : []}
							onValueChange={(val) => {
								if (val?.[0]) setTimeRange(val[0] as AnalyticsTimeRange);
							}}
							className="rounded-lg border p-0.5 bg-muted/40"
						>
							{timeRangeOptions.map((opt) => (
								<ToggleGroupItem
									key={opt.value}
									value={opt.value}
									className="px-2.5 py-1 text-xs data-[state=on]:bg-background data-[state=on]:shadow-xs"
								>
									{opt.value}
								</ToggleGroupItem>
							))}
						</ToggleGroup>
					)}
				</div>
			</div>

			{/* KPI Stats Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				{/* Views */}
				<Card className="shadow-none">
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-xs font-medium text-muted-foreground">
							{entityId ? "Page Views" : "Total Views"}
						</CardTitle>
						<EyeIcon className="size-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						{overviewLoading ? (
							<Skeleton className="h-7 w-24 mb-1" />
						) : (
							<div className="text-2xl font-bold font-mono">
								{formatNumber(overview?.totalViews ?? 0)}
							</div>
						)}
						<p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
							<span className="flex items-center text-emerald-600 dark:text-emerald-400 font-medium">
								<TrendingUpIcon className="size-3 mr-0.5" />+
								{overview?.viewsTrend}%
							</span>
							vs previous period
						</p>
					</CardContent>
				</Card>

				{/* Unique Visitors */}
				<Card className="shadow-none">
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-xs font-medium text-muted-foreground">
							Unique Visitors
						</CardTitle>
						<UsersIcon className="size-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						{overviewLoading ? (
							<Skeleton className="h-7 w-24 mb-1" />
						) : (
							<div className="text-2xl font-bold font-mono">
								{formatNumber(overview?.uniqueVisitors ?? 0)}
							</div>
						)}
						<p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
							<span className="flex items-center text-emerald-600 dark:text-emerald-400 font-medium">
								<TrendingUpIcon className="size-3 mr-0.5" />+
								{overview?.visitorsTrend}%
							</span>
							vs previous period
						</p>
					</CardContent>
				</Card>

				{/* Avg Read Time */}
				<Card className="shadow-none">
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-xs font-medium text-muted-foreground">
							Avg. Read Duration
						</CardTitle>
						<ClockIcon className="size-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						{overviewLoading ? (
							<Skeleton className="h-7 w-24 mb-1" />
						) : (
							<div className="text-2xl font-bold font-mono">
								{Math.floor((overview?.avgReadTimeSeconds ?? 0) / 60)}m{" "}
								{(overview?.avgReadTimeSeconds ?? 0) % 60}s
							</div>
						)}
						<p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
							<span className="flex items-center text-emerald-600 dark:text-emerald-400 font-medium">
								<TrendingUpIcon className="size-3 mr-0.5" />+
								{overview?.readTimeTrend}%
							</span>
							session engagement
						</p>
					</CardContent>
				</Card>

				{/* Bounce Rate */}
				<Card className="shadow-none">
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-xs font-medium text-muted-foreground">
							Bounce Rate
						</CardTitle>
						<PercentIcon className="size-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						{overviewLoading ? (
							<Skeleton className="h-7 w-24 mb-1" />
						) : (
							<div className="text-2xl font-bold font-mono">
								{overview?.bounceRate.toFixed(1)}%
							</div>
						)}
						<p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
							<span className="flex items-center text-emerald-600 dark:text-emerald-400 font-medium">
								<TrendingDownIcon className="size-3 mr-0.5" />
								{overview?.bounceRateTrend}%
							</span>
							retention rate
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Interactive Chart */}
			<Card className="shadow-none">
				<CardHeader className="border-b pb-4">
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="text-base font-semibold">
								{entityId
									? `Traffic Telemetry: ${detailData?.title ?? ""}`
									: "Aggregate Traffic & Audience Telemetry"}
							</CardTitle>
							<CardDescription className="text-xs">
								Time-series breakdown for views and unique reader visits.
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
					{chartLoading ? (
						<Skeleton className="h-62.5 w-full" />
					) : (
						<ChartContainer
							config={chartConfig}
							className="aspect-auto h-65 w-full"
						>
							<AreaChart data={timeSeries}>
								<defs>
									<linearGradient id="fillViews" x1="0" y1="0" x2="0" y2="1">
										<stop
											offset="5%"
											stopColor="var(--primary)"
											stopOpacity={0.7}
										/>
										<stop
											offset="95%"
											stopColor="var(--primary)"
											stopOpacity={0.05}
										/>
									</linearGradient>
									<linearGradient id="fillVisitors" x1="0" y1="0" x2="0" y2="1">
										<stop
											offset="5%"
											stopColor="var(--color-visitors, #3b82f6)"
											stopOpacity={0.5}
										/>
										<stop
											offset="95%"
											stopColor="var(--color-visitors, #3b82f6)"
											stopOpacity={0.02}
										/>
									</linearGradient>
								</defs>
								<CartesianGrid vertical={false} strokeDasharray="3 3" />
								<XAxis
									dataKey="date"
									tickLine={false}
									axisLine={false}
									tickMargin={8}
									minTickGap={timeRange === "24h" ? 24 : 32}
									tickFormatter={(value) => {
										if (timeRange === "24h") return value;
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
												if (timeRange === "24h") return `Time: ${value}`;
												return new Date(value).toLocaleDateString("en-US", {
													month: "short",
													day: "numeric",
													year: "numeric",
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
									stroke="var(--color-visitors, #3b82f6)"
									strokeWidth={1.5}
									stackId="a"
								/>
								<Area
									dataKey="views"
									type="natural"
									fill="url(#fillViews)"
									stroke="var(--primary)"
									strokeWidth={2}
									stackId="b"
								/>
							</AreaChart>
						</ChartContainer>
					)}
				</CardContent>
			</Card>

			{/* Umami Breakdown: Audience Map & Acquisition Details */}
			<div className="grid grid-cols-1 gap-6">
				{/* 1. Global Audience Map Card */}
				<AudienceMapCard
					countries={detailData ? detailData.countries : undefined}
					isLoading={detailLoading}
				/>

				{/* 2. Referrers & Devices */}
				<TrafficSourcesCard
					referrers={detailData ? detailData.referrers : undefined}
					devices={detailData ? detailData.devices : undefined}
					isLoading={detailLoading}
				/>
			</div>

			{/* Page Explorer / Content Picker: Quickly Switch between docs and posts */}
			<Card className="shadow-none border-t">
				<CardHeader className="border-b pb-4">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
						<div>
							<CardTitle className="text-base font-semibold">
								Content Directory Telemetry
							</CardTitle>
							<CardDescription className="text-xs">
								Select any doc page or publication to drill into its dedicated
								Umami-style telemetry.
							</CardDescription>
						</div>

						{/* Catalog Search & Project filter */}
						<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
							<div className="relative min-w-50">
								<SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
								<Input
									type="search"
									placeholder="Filter pages or slugs..."
									value={catalogSearch}
									onChange={(e) => setCatalogSearch(e.target.value)}
									className="h-8 pl-8 text-xs"
								/>
							</div>

							{catalogTab === "docs" && (
								<Select
									value={selectedProject}
									onValueChange={(val) => {
										if (val) setSelectedProject(val);
									}}
								>
									<SelectTrigger className="h-8 min-w-42.5 text-xs">
										<FolderIcon className="mr-1.5 size-3.5 text-muted-foreground" />
										<SelectValue placeholder="All Documentation" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all" className="text-xs">
											All Projects
										</SelectItem>
										{projects?.map((proj) => (
											<SelectItem
												key={proj.id}
												value={proj.id}
												className="text-xs"
											>
												{proj.title}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						</div>
					</div>
				</CardHeader>
				<CardContent className="p-0">
					<Tabs
						value={catalogTab}
						onValueChange={(v) => setCatalogTab(v as "docs" | "posts")}
						className="w-full"
					>
						<div className="px-4 py-2 border-b bg-muted/20">
							<TabsList className="h-8 bg-muted/60">
								<TabsTrigger value="docs" className="text-xs px-3">
									<BookOpenIcon className="size-3.5 mr-1.5" />
									Documentation Pages ({docPages?.length ?? 0})
								</TabsTrigger>
								<TabsTrigger value="posts" className="text-xs px-3">
									<FileTextIcon className="size-3.5 mr-1.5" />
									Publications ({filteredPosts.length})
								</TabsTrigger>
							</TabsList>
						</div>

						{/* Docs Tab */}
						<TabsContent value="docs" className="m-0">
							<div className="overflow-x-auto">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="w-75 text-xs">
												Doc Page
											</TableHead>
											<TableHead className="text-xs">Project</TableHead>
											<TableHead className="text-right text-xs">
												Views
											</TableHead>
											<TableHead className="text-right text-xs">
												Unique Visitors
											</TableHead>
											<TableHead className="text-right text-xs">
												Avg. Time
											</TableHead>
											<TableHead className="text-right text-xs">
												Bounce Rate
											</TableHead>
											<TableHead className="w-30 text-right text-xs">
												Action
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{docsLoading ? (
											["sk-cat-1", "sk-cat-2", "sk-cat-3", "sk-cat-4"].map(
												(skId) => (
													<TableRow key={skId}>
														<TableCell>
															<Skeleton className="h-4 w-40" />
														</TableCell>
														<TableCell>
															<Skeleton className="h-4 w-24" />
														</TableCell>
														<TableCell className="text-right">
															<Skeleton className="ml-auto h-4 w-12" />
														</TableCell>
														<TableCell className="text-right">
															<Skeleton className="ml-auto h-4 w-12" />
														</TableCell>
														<TableCell className="text-right">
															<Skeleton className="ml-auto h-4 w-10" />
														</TableCell>
														<TableCell className="text-right">
															<Skeleton className="ml-auto h-4 w-10" />
														</TableCell>
														<TableCell>
															<Skeleton className="ml-auto size-6" />
														</TableCell>
													</TableRow>
												),
											)
										) : docPages?.length === 0 ? (
											<TableRow>
												<TableCell
													colSpan={7}
													className="h-24 text-center text-xs text-muted-foreground"
												>
													No documentation pages found.
												</TableCell>
											</TableRow>
										) : (
											docPages?.map((page: DocPageAnalytics) => {
												const isCurrent =
													entityType === "doc" && entityId === page.pageId;
												return (
													<TableRow
														key={page.pageId}
														className={
															isCurrent ? "bg-primary/5 font-medium" : ""
														}
													>
														<TableCell className="text-xs">
															<div className="flex flex-col gap-0.5">
																<div className="flex items-center gap-1.5">
																	<CountryFlag
																		countryCode={localeFlagCode(page.locale)}
																		className="size-3.5"
																	/>
																	<span className="font-medium text-foreground">
																		{page.pageTitle}
																	</span>
																	{isCurrent && (
																		<Badge
																			variant="default"
																			className="h-4 px-1 text-[9px] uppercase font-mono"
																		>
																			Active
																		</Badge>
																	)}
																</div>
																<span className="text-[11px] font-mono text-muted-foreground">
																	/{page.slug}
																</span>
															</div>
														</TableCell>
														<TableCell className="text-xs text-muted-foreground">
															<Badge
																variant="outline"
																className="font-normal text-[11px] bg-muted/30"
															>
																{page.projectName}
															</Badge>
														</TableCell>
														<TableCell className="text-right font-mono text-xs font-medium">
															{formatNumber(page.views)}
														</TableCell>
														<TableCell className="text-right font-mono text-xs text-muted-foreground">
															{formatNumber(page.uniqueVisitors)}
														</TableCell>
														<TableCell className="text-right font-mono text-xs text-muted-foreground">
															{Math.floor(page.avgReadTimeSeconds / 60)}m{" "}
															{page.avgReadTimeSeconds % 60}s
														</TableCell>
														<TableCell className="text-right font-mono text-xs">
															<span
																className={
																	page.bounceRate > 30
																		? "text-amber-600 dark:text-amber-400"
																		: "text-emerald-600 dark:text-emerald-400"
																}
															>
																{page.bounceRate.toFixed(1)}%
															</span>
														</TableCell>
														<TableCell className="text-right">
															<Button
																variant={isCurrent ? "secondary" : "outline"}
																size="sm"
																onClick={() => selectEntity("doc", page.pageId)}
																className="h-7 text-xs"
															>
																{isCurrent ? "Viewing" : "Inspect"}
															</Button>
														</TableCell>
													</TableRow>
												);
											})
										)}
									</TableBody>
								</Table>
							</div>
						</TabsContent>

						{/* Posts Tab */}
						<TabsContent value="posts" className="m-0">
							<div className="overflow-x-auto">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="w-[320px] text-xs">
												Publication
											</TableHead>
											<TableHead className="text-right text-xs">
												Views
											</TableHead>
											<TableHead className="text-right text-xs">
												Visitors
											</TableHead>
											<TableHead className="text-right text-xs">
												Avg. Time
											</TableHead>
											<TableHead className="text-right text-xs">
												Bounce Rate
											</TableHead>
											<TableHead className="w-30 text-right text-xs">
												Action
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{postsLoading ? (
											["sk-post-c-1", "sk-post-c-2", "sk-post-c-3"].map(
												(skId) => (
													<TableRow key={skId}>
														<TableCell>
															<Skeleton className="h-4 w-48" />
														</TableCell>
														<TableCell className="text-right">
															<Skeleton className="ml-auto h-4 w-12" />
														</TableCell>
														<TableCell className="text-right">
															<Skeleton className="ml-auto h-4 w-12" />
														</TableCell>
														<TableCell className="text-right">
															<Skeleton className="ml-auto h-4 w-10" />
														</TableCell>
														<TableCell className="text-right">
															<Skeleton className="ml-auto h-4 w-10" />
														</TableCell>
														<TableCell>
															<Skeleton className="ml-auto size-6" />
														</TableCell>
													</TableRow>
												),
											)
										) : filteredPosts.length === 0 ? (
											<TableRow>
												<TableCell
													colSpan={6}
													className="h-24 text-center text-xs text-muted-foreground"
												>
													No publications found.
												</TableCell>
											</TableRow>
										) : (
											filteredPosts.map((p: PostAnalytics) => {
												const isCurrent =
													entityType === "post" && entityId === p.postId;
												return (
													<TableRow
														key={p.postId}
														className={
															isCurrent ? "bg-primary/5 font-medium" : ""
														}
													>
														<TableCell className="text-xs">
															<div className="flex flex-col gap-0.5">
																<div className="flex items-center gap-1.5">
																	<span className="font-medium text-foreground">
																		{p.title}
																	</span>
																	{isCurrent && (
																		<Badge
																			variant="default"
																			className="h-4 px-1 text-[9px] uppercase font-mono"
																		>
																			Active
																		</Badge>
																	)}
																</div>
																<span className="text-[11px] font-mono text-muted-foreground">
																	/{p.slug}
																</span>
															</div>
														</TableCell>
														<TableCell className="text-right font-mono text-xs font-medium">
															{formatNumber(p.views)}
														</TableCell>
														<TableCell className="text-right font-mono text-xs text-muted-foreground">
															{formatNumber(p.uniqueVisitors)}
														</TableCell>
														<TableCell className="text-right font-mono text-xs text-muted-foreground">
															{Math.floor(p.avgReadTimeSeconds / 60)}m{" "}
															{p.avgReadTimeSeconds % 60}s
														</TableCell>
														<TableCell className="text-right font-mono text-xs">
															<span
																className={
																	p.bounceRate > 30
																		? "text-amber-600 dark:text-amber-400"
																		: "text-emerald-600 dark:text-emerald-400"
																}
															>
																{p.bounceRate.toFixed(1)}%
															</span>
														</TableCell>
														<TableCell className="text-right">
															<Button
																variant={isCurrent ? "secondary" : "outline"}
																size="sm"
																onClick={() => selectEntity("post", p.postId)}
																className="h-7 text-xs"
															>
																{isCurrent ? "Viewing" : "Inspect"}
															</Button>
														</TableCell>
													</TableRow>
												);
											})
										)}
									</TableBody>
								</Table>
							</div>
						</TabsContent>
					</Tabs>
				</CardContent>
			</Card>
		</div>
	);
}

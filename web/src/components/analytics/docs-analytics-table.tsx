import { useQuery } from "@tanstack/react-query";
import { ExternalLinkIcon, FolderIcon, SearchIcon } from "lucide-react";
import * as React from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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
import { formatNumber } from "@/lib/format";
import { mockApi } from "@/lib/mock/api";
import type { DocPageAnalytics } from "@/types/analytics";

type SortField =
	| "views"
	| "uniqueVisitors"
	| "avgReadTimeSeconds"
	| "bounceRate";
type SortDirection = "asc" | "desc";

export function DocsAnalyticsTable() {
	const [selectedProject, setSelectedProject] = React.useState<string>("all");
	const [searchQuery, setSearchQuery] = React.useState<string>("");
	const [sortField, setSortField] = React.useState<SortField>("views");
	const [sortDir, setSortDir] = React.useState<SortDirection>("desc");

	const { data: projects } = useQuery({
		queryKey: ["docProjects", "list"],
		queryFn: () => mockApi.docs.listProjects(),
	});

	const { data: docPages, isLoading } = useQuery({
		queryKey: ["analytics", "docPages", selectedProject, searchQuery],
		queryFn: () =>
			mockApi.analytics.getDocPages({
				projectId: selectedProject,
				query: searchQuery,
			}),
	});

	const handleSort = (field: SortField) => {
		if (sortField === field) {
			setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
		} else {
			setSortField(field);
			setSortDir("desc");
		}
	};

	const sortedPages = React.useMemo(() => {
		if (!docPages) return [];
		return [...docPages].sort((a, b) => {
			const aVal = a[sortField];
			const bVal = b[sortField];
			if (sortDir === "asc") {
				return aVal > bVal ? 1 : -1;
			}
			return aVal < bVal ? 1 : -1;
		});
	}, [docPages, sortField, sortDir]);

	const localeFlagCode = (locale: string) => {
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
				return locale.toUpperCase();
		}
	};

	return (
		<Card className="shadow-none">
			<CardHeader className="gap-2 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
				<div>
					<CardTitle className="text-base font-semibold">
						Documentation Telemetry
					</CardTitle>
					<CardDescription className="text-xs">
						Granular per-page view statistics, visitor reach, and retention
						metrics.
					</CardDescription>
				</div>
				<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
					<div className="relative min-w-[200px]">
						<SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
						<Input
							type="search"
							placeholder="Filter pages or slugs..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="h-8 pl-8 text-xs"
						/>
					</div>

					<Select
						value={selectedProject}
						onValueChange={(val) => {
							if (val) setSelectedProject(val);
						}}
					>
						<SelectTrigger className="h-8 min-w-[170px] text-xs">
							<FolderIcon className="mr-1.5 size-3.5 text-muted-foreground" />
							<SelectValue placeholder="All Documentation" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all" className="text-xs">
								All Projects
							</SelectItem>
							{projects?.map((proj) => (
								<SelectItem key={proj.id} value={proj.id} className="text-xs">
									{proj.title}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</CardHeader>
			<CardContent className="p-0">
				<div className="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow className="hover:bg-transparent">
								<TableHead className="w-[300px] text-xs">
									Page / Route
								</TableHead>
								<TableHead className="text-xs">Project</TableHead>
								<TableHead
									className="cursor-pointer text-right text-xs select-none hover:text-foreground"
									onClick={() => handleSort("views")}
								>
									Views{" "}
									{sortField === "views"
										? sortDir === "desc"
											? "↓"
											: "↑"
										: ""}
								</TableHead>
								<TableHead
									className="cursor-pointer text-right text-xs select-none hover:text-foreground"
									onClick={() => handleSort("uniqueVisitors")}
								>
									Unique Visitors{" "}
									{sortField === "uniqueVisitors"
										? sortDir === "desc"
											? "↓"
											: "↑"
										: ""}
								</TableHead>
								<TableHead
									className="cursor-pointer text-right text-xs select-none hover:text-foreground"
									onClick={() => handleSort("avgReadTimeSeconds")}
								>
									Avg. Time{" "}
									{sortField === "avgReadTimeSeconds"
										? sortDir === "desc"
											? "↓"
											: "↑"
										: ""}
								</TableHead>
								<TableHead
									className="cursor-pointer text-right text-xs select-none hover:text-foreground"
									onClick={() => handleSort("bounceRate")}
								>
									Bounce Rate{" "}
									{sortField === "bounceRate"
										? sortDir === "desc"
											? "↓"
											: "↑"
										: ""}
								</TableHead>
								<TableHead className="w-[60px] text-right text-xs">
									Action
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading ? (
								[
									"sk-doc-1",
									"sk-doc-2",
									"sk-doc-3",
									"sk-doc-4",
									"sk-doc-5",
								].map((skId) => (
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
								))
							) : sortedPages.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={7}
										className="h-32 text-center text-xs text-muted-foreground"
									>
										No documentation pages matching the criteria.
									</TableCell>
								</TableRow>
							) : (
								sortedPages.map((page: DocPageAnalytics) => (
									<TableRow key={page.pageId} className="group">
										<TableCell className="font-medium text-xs">
											<div className="flex flex-col gap-0.5">
												<div className="flex items-center gap-1.5">
													<CountryFlag
														countryCode={localeFlagCode(page.locale)}
														className="size-3.5"
													/>
													<span className="font-medium text-foreground">
														{page.pageTitle}
													</span>
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
											<Link
												to={`/editor/doc/${page.pageId}`}
												title="Open in editor"
												className="inline-flex size-7 items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
											>
												<ExternalLinkIcon className="size-3.5" />
											</Link>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div>
			</CardContent>
		</Card>
	);
}

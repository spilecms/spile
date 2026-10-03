import { PlusCircleIcon } from "@heroicons/react/24/solid";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, SearchIcon } from "lucide-react";
import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { HeaderActions } from "@/components/dashboard/header-actions";
import { DocsTable } from "@/components/docs/docs-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockApi } from "@/lib/mock/api";
import { useTranslation } from "react-i18next";

const STATUS_TABS = ["all", "draft", "published"] as const;
type StatusTab = (typeof STATUS_TABS)[number];

export default function DocsPage() {
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const status = (searchParams.get("status") ?? "all") as StatusTab;
	const [query, setQuery] = React.useState("");
	const [debouncedQuery, setDebouncedQuery] = React.useState("");

	React.useEffect(() => {
		const timer = setTimeout(() => setDebouncedQuery(query), 200);
		return () => clearTimeout(timer);
	}, [query]);

	const {
		data: projects,
		isPending,
		refetch,
	} = useQuery({
		queryKey: ["docs-projects"],
		queryFn: () => mockApi.docs.listProjects(),
	});

	// Filter projects by status and search query
	const filteredProjects = React.useMemo(() => {
		if (!projects) return [];
		return projects.filter((project) => {
			if (status !== "all" && project.status !== status) return false;
			if (debouncedQuery) {
				const q = debouncedQuery.toLowerCase();
				const matchTitle = project.title.toLowerCase().includes(q);
				const matchSlug = project.slug.toLowerCase().includes(q);
				const matchDesc = (project.description || "").toLowerCase().includes(q);
				if (!matchTitle && !matchSlug && !matchDesc) return false;
			}
			return true;
		});
	}, [projects, status, debouncedQuery]);

	const counts = React.useMemo(() => {
		if (!projects) return { all: 0, draft: 0, published: 0 };
		return {
			all: projects.length,
			draft: projects.filter((p) => p.status === "draft").length,
			published: projects.filter((p) => p.status === "published").length,
		};
	}, [projects]);

	const handleStatusChange = (newStatus: string) => {
		const next = new URLSearchParams(searchParams);
		if (newStatus === "all") {
			next.delete("status");
		} else {
			next.set("status", newStatus);
		}
		setSearchParams(next, { replace: true });
	};

	const handleCreateNew = async () => {
		const title = window.prompt("Documentation Title:", "API Reference");
		if (!title) return;
		const desc = window.prompt("Description (optional):", "") || "";

		const { project, initialPage } = await mockApi.docs.createProject({
			title,
			description: desc,
		});
		refetch();
		navigate(`/editor/doc/${initialPage.id}?project=${project.id}`);
	};

	const handleDeleteProject = async (id: string) => {
		if (window.confirm("Are you sure you want to delete this documentation?")) {
			await mockApi.docs.deleteProject(id);
			refetch();
		}
	};

	const { t } = useTranslation();
	return (
		<div className="flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
			{/* Header Action Button mounted into SiteHeader */}
			<HeaderActions>
				<Button
					size="sm"
					className="flex items-center gap-2 text-sm font-semibold"
					onClick={handleCreateNew}
				>
					<PlusCircleIcon className="size-4" />
					{t("docs.postButton")}
				</Button>
			</HeaderActions>

			{/* Filters & Status Tabs */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<Tabs
					value={status}
					onValueChange={handleStatusChange}
					className="w-full sm:w-auto"
				>
					<TabsList className="grid w-full grid-cols-3 sm:w-auto">
						<TabsTrigger value="all" className="gap-1.5 text-xs">
							{t("docs.tabs.all")}
							<span className="ml-1 text-xs text-muted-foreground">
								{counts.all}
							</span>
						</TabsTrigger>
						<TabsTrigger value="draft" className="gap-1.5 text-xs">
							{t("docs.tabs.draft")}
							<span className="ml-1 text-xs text-muted-foreground">
								{counts.draft}
							</span>
						</TabsTrigger>
						<TabsTrigger value="published" className="gap-1.5 text-xs">
							{t("docs.tabs.published")}
							<span className="ml-1 text-xs text-muted-foreground">
								{counts.published}
							</span>
						</TabsTrigger>
					</TabsList>
				</Tabs>

				<div className="relative w-full sm:w-64">
					<SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						type="search"
						placeholder="Search documentation..."
						className="pl-8 text-xs"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
					/>
				</div>
			</div>

			{/* Content Table or Empty State */}
			{isPending ? (
				<div className="space-y-2">
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-14 w-full" />
					<Skeleton className="h-14 w-full" />
					<Skeleton className="h-14 w-full" />
				</div>
			) : filteredProjects.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
					<div className="rounded-full bg-muted p-4 mb-4">
						<BookOpen className="size-6 text-muted-foreground" />
					</div>
					<h3 className="font-semibold text-lg mb-1">No documentation found</h3>
					<p className="text-sm text-muted-foreground max-w-sm mb-4">
						{query
							? "No documentation matched your search filter."
							: "Create your first documentation collection, API reference, or knowledge base."}
					</p>
					<Button onClick={handleCreateNew} size="sm" className="gap-2">
						<PlusCircleIcon className="size-4" />
						Create Documentation
					</Button>
				</div>
			) : (
				<DocsTable data={filteredProjects} onDelete={handleDeleteProject} />
			)}
		</div>
	);
}

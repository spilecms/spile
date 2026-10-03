import { PlusCircleIcon } from "@heroicons/react/24/solid";
import { useQuery } from "@tanstack/react-query";
import { SearchIcon, SquarePenIcon } from "lucide-react";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { EmptyState } from "@/components/dashboard/empty-state";
import { HeaderActions } from "@/components/dashboard/header-actions";
import { PostsTable } from "@/components/dashboard/posts-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockApi } from "@/lib/mock/api";
import type { PostStatus } from "@/types/domain";

const STATUS_TAB_VALUES = [
	"all",
	"draft",
	"published",
	"scheduled",
	"trashed",
] as const;
type StatusTab = (typeof STATUS_TAB_VALUES)[number];

export default function PostsPage() {
	const navigate = useNavigate();
	const { t } = useTranslation();
	const [searchParams, setSearchParams] = useSearchParams();
	const status = (searchParams.get("status") ?? "all") as StatusTab;
	const [query, setQuery] = React.useState("");
	const [tagId, setTagId] = React.useState("all");
	const [authorId, setAuthorId] = React.useState("all");
	const [debouncedQuery, setDebouncedQuery] = React.useState("");

	const statusTabs = [
		{ value: "all" as const, label: t("posts.tabs.all") },
		{ value: "draft" as const, label: t("posts.tabs.draft") },
		{ value: "published" as const, label: t("posts.tabs.published") },
		{ value: "scheduled" as const, label: t("posts.tabs.scheduled") },
		{ value: "trashed" as const, label: t("posts.tabs.trashed") },
	];

	React.useEffect(() => {
		const timer = setTimeout(() => setDebouncedQuery(query), 250);
		return () => clearTimeout(timer);
	}, [query]);

	const listParams = {
		type: "post" as const,
		status: status as PostStatus | "all",
		query: debouncedQuery || undefined,
		tagId: tagId === "all" ? undefined : tagId,
		authorId: authorId === "all" ? undefined : authorId,
	};

	const { data: posts, isPending } = useQuery({
		queryKey: ["posts", "list", listParams],
		queryFn: () => mockApi.posts.list(listParams),
	});

	const { data: allPosts } = useQuery({
		queryKey: ["posts", "counts"],
		queryFn: () => mockApi.posts.list({ type: "post", status: "all" }),
	});

	const { data: users } = useQuery({
		queryKey: ["users", "list"],
		queryFn: () => mockApi.users.list(),
	});

	const { data: tags } = useQuery({
		queryKey: ["tags", "list"],
		queryFn: () => mockApi.tags.list(),
	});

	const counts = React.useMemo(() => {
		const map: Record<StatusTab, number> = {
			all: 0,
			draft: 0,
			published: 0,
			scheduled: 0,
			trashed: 0,
		};
		for (const post of allPosts ?? []) {
			map.all += 1;
			map[post.status] += 1;
		}
		return map;
	}, [allPosts]);

	const setStatus = (value: StatusTab) => {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				if (value === "all") next.delete("status");
				else next.set("status", value);
				return next;
			},
			{ replace: true },
		);
	};

	return (
		<div className="flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
			<HeaderActions>
				<Button
					size="sm"
					className="flex items-center gap-2 text-sm font-semibold"
					onClick={() => navigate("/editor/new")}
				>
					<PlusCircleIcon className="size-4" />
					{t("posts.postButton")}
				</Button>
			</HeaderActions>

			<Tabs
				value={status}
				onValueChange={(value) => setStatus(value as StatusTab)}
			>
				<div className="flex flex-wrap items-center gap-2">
					<TabsList>
						{statusTabs.map((tab) => (
							<TabsTrigger key={tab.value} value={tab.value}>
								{tab.label}
								<span className="ml-1 text-xs text-muted-foreground">
									{counts[tab.value]}
								</span>
							</TabsTrigger>
						))}
					</TabsList>

					<div className="ml-auto flex flex-wrap items-center gap-2">
						<div className="relative">
							<SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								placeholder={t("posts.searchPlaceholder")}
								className="w-56 pl-8"
								aria-label={t("posts.searchAria")}
							/>
						</div>
						<Select
							value={tagId}
							onValueChange={(value) => setTagId(value ?? "all")}
						>
							<SelectTrigger
								size="sm"
								className="w-36"
								aria-label={t("posts.filterTagAria")}
							>
								<SelectValue placeholder={t("posts.allTags")} />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									<SelectItem value="all">{t("posts.allTags")}</SelectItem>
									{(tags ?? []).map((tag) => (
										<SelectItem key={tag.id} value={tag.id}>
											{tag.name}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
						<Select
							value={authorId}
							onValueChange={(value) => setAuthorId(value ?? "all")}
						>
							<SelectTrigger
								size="sm"
								className="w-40"
								aria-label={t("posts.filterAuthorAria")}
							>
								<SelectValue placeholder={t("posts.allAuthors")} />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									<SelectItem value="all">{t("posts.allAuthors")}</SelectItem>
									{(users ?? []).map((user) => (
										<SelectItem key={user.id} value={user.id}>
											{user.name}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
					</div>
				</div>
			</Tabs>

			{isPending ? (
				<div className="flex flex-col gap-2">
					{["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"].map((key) => (
						<Skeleton key={key} className="h-14" />
					))}
				</div>
			) : (posts ?? []).length === 0 ? (
				<EmptyState
					icon={SquarePenIcon}
					title={
						query || tagId !== "all" || authorId !== "all"
							? t("posts.empty.noFilteredTitle")
							: t("posts.empty.noPostsTitle")
					}
					description={
						query || tagId !== "all" || authorId !== "all"
							? t("posts.empty.noFilteredDesc")
							: t("posts.empty.noPostsDesc")
					}
					action={
						<Button size="sm" onClick={() => navigate("/editor/new")}>
							<SquarePenIcon />
							{t("posts.empty.newPostAction")}
						</Button>
					}
				/>
			) : (
				<PostsTable
					data={posts ?? []}
					users={users ?? []}
					onDuplicate={(post) => {
						void mockApi.posts.duplicate(post.id);
					}}
					onDelete={(post) => {
						void mockApi.posts.remove(post.id);
					}}
				/>
			)}
		</div>
	);
}

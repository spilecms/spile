import { PlusCircleIcon } from "@heroicons/react/24/solid";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	FolderIcon,
	GridIcon,
	ListIcon,
	SearchIcon,
	Trash2Icon,
	UploadCloudIcon,
} from "lucide-react";
import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { EmptyState } from "@/components/dashboard/empty-state";
import { HeaderActions } from "@/components/dashboard/header-actions";
import { MediaDetailsDialog } from "@/components/media/media-details-dialog";
import { MediaGrid } from "@/components/media/media-grid";
import { MediaList } from "@/components/media/media-list";
import { MediaUploader } from "@/components/media/media-uploader";
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
import { usePermissions } from "@/lib/permissions";
import type {
	MediaItem,
	MediaType,
	MediaUpdatePayload,
	MediaUploadPayload,
} from "@/types/media";

const TYPE_TABS = [
	{ value: "all", label: "All Media" },
	{ value: "image", label: "Images" },
	{ value: "video", label: "Videos" },
	{ value: "audio", label: "Audio" },
	{ value: "document", label: "Documents" },
] as const;

const SKELETON_KEYS = [
	"sk-1",
	"sk-2",
	"sk-3",
	"sk-4",
	"sk-5",
	"sk-6",
	"sk-7",
	"sk-8",
];

export default function MediaPage() {
	const queryClient = useQueryClient();
	const { can } = usePermissions();

	const [searchParams, setSearchParams] = useSearchParams();
	const typeParam = (searchParams.get("type") ?? "all") as MediaType | "all";
	const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
	const [query, setQuery] = React.useState("");
	const [debouncedQuery, setDebouncedQuery] = React.useState("");
	const [selectedTag, setSelectedTag] = React.useState<string>("all");
	const [sortBy, setSortBy] = React.useState<"createdAt" | "name" | "size">(
		"createdAt",
	);

	// Multi-select state
	const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

	// Dialog states
	const [isUploaderOpen, setIsUploaderOpen] = React.useState(false);
	const [selectedDetailItem, setSelectedDetailItem] =
		React.useState<MediaItem | null>(null);

	React.useEffect(() => {
		const timer = setTimeout(() => setDebouncedQuery(query), 200);
		return () => clearTimeout(timer);
	}, [query]);

	const listParams = {
		type: typeParam,
		query: debouncedQuery || undefined,
		tag: selectedTag === "all" ? undefined : selectedTag,
		sortBy,
		sortOrder: "desc" as const,
	};

	// Queries
	const { data: mediaItems, isLoading } = useQuery({
		queryKey: ["media", "list", listParams],
		queryFn: () => mockApi.media.list(listParams),
	});

	const { data: allTags } = useQuery({
		queryKey: ["media", "tags"],
		queryFn: () => mockApi.media.getAllTags(),
	});

	// Mutations
	const uploadMutation = useMutation({
		mutationFn: (payload: MediaUploadPayload) => mockApi.media.upload(payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["media"] });
			toast.success("Media asset uploaded successfully");
		},
		onError: () => {
			toast.error("Failed to upload media asset");
		},
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, patch }: { id: string; patch: MediaUpdatePayload }) =>
			mockApi.media.update(id, patch),
		onSuccess: (updated) => {
			queryClient.invalidateQueries({ queryKey: ["media"] });
			setSelectedDetailItem(updated);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => mockApi.media.delete(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["media"] });
			setSelectedIds((prev) =>
				prev.filter((id) => id !== selectedDetailItem?.id),
			);
			setSelectedDetailItem(null);
		},
	});

	const bulkDeleteMutation = useMutation({
		mutationFn: (ids: string[]) => mockApi.media.bulkDelete(ids),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["media"] });
			setSelectedIds([]);
			toast.success(`Deleted ${selectedIds.length} items`);
		},
	});

	// Actions
	const handleTypeChange = (nextType: string) => {
		const next = new URLSearchParams(searchParams);
		if (nextType === "all") {
			next.delete("type");
		} else {
			next.set("type", nextType);
		}
		setSearchParams(next);
		setSelectedIds([]);
	};

	const handleToggleSelect = (id: string) => {
		setSelectedIds((prev) =>
			prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
		);
	};

	const handleSelectAll = () => {
		if (!mediaItems) return;
		if (selectedIds.length === mediaItems.length) {
			setSelectedIds([]);
		} else {
			setSelectedIds(mediaItems.map((m) => m.id));
		}
	};

	const handleBulkDelete = () => {
		if (selectedIds.length === 0) return;
		if (
			window.confirm(
				`Are you sure you want to delete ${selectedIds.length} selected assets?`,
			)
		) {
			bulkDeleteMutation.mutate(selectedIds);
		}
	};

	const canUpload = can("media:upload");
	const canEdit = can("media:edit");
	const canDelete = can("media:delete");

	const SORT_LABELS: Record<string, string> = {
		createdAt: "Newest first",
		name: "Name (A-Z)",
		size: "File size",
	};

	return (
		<div className="flex flex-1 flex-col gap-5 px-4 py-6 lg:px-6">
			{/* Top Bar Header Action via Portal */}
			{canUpload && (
				<HeaderActions>
					<Button
						size="sm"
						onClick={() => setIsUploaderOpen(true)}
						className="flex items-center gap-2 text-sm font-semibold"
					>
						<PlusCircleIcon className="size-4" />
						<span>Upload Asset</span>
					</Button>
				</HeaderActions>
			)}

			{/* Toolbar & Filters */}
			<div className="space-y-3">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
					{/* Type Tabs */}
					<Tabs value={typeParam} onValueChange={handleTypeChange}>
						<TabsList className="bg-muted/60 p-1">
							{TYPE_TABS.map((tab) => (
								<TabsTrigger
									key={tab.value}
									value={tab.value}
									className="text-xs"
								>
									{tab.label}
								</TabsTrigger>
							))}
						</TabsList>
					</Tabs>

					{/* View Toggle (Grid / List) */}
					<div className="flex items-center gap-2 self-end sm:self-auto">
						{selectedIds.length > 0 && canDelete && (
							<Button
								variant="destructive"
								size="sm"
								className="h-8 gap-1.5 text-xs"
								onClick={handleBulkDelete}
								disabled={bulkDeleteMutation.isPending}
							>
								<Trash2Icon className="size-3.5" />
								<span>Delete Selected ({selectedIds.length})</span>
							</Button>
						)}

						<div className="flex items-center rounded-md border border-border p-0.5 bg-muted/40">
							<Button
								variant={viewMode === "grid" ? "secondary" : "ghost"}
								size="icon"
								className="size-7 rounded-sm"
								onClick={() => setViewMode("grid")}
								title="Grid View"
							>
								<GridIcon className="size-3.5" />
							</Button>
							<Button
								variant={viewMode === "list" ? "secondary" : "ghost"}
								size="icon"
								className="size-7 rounded-sm"
								onClick={() => setViewMode("list")}
								title="Table List View"
							>
								<ListIcon className="size-3.5" />
							</Button>
						</div>
					</div>
				</div>

				{/* Search, Tag & Sort Bar */}
				<div className="flex flex-wrap items-center gap-2.5">
					<div className="relative flex-1 min-w-50">
						<SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
						<Input
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Search by file name, caption, alt text..."
							className="pl-8 h-8 text-xs"
						/>
					</div>

					{allTags && allTags.length > 0 && (
						<Select
							value={selectedTag}
							onValueChange={(val) => setSelectedTag(val ?? "all")}
						>
							<SelectTrigger className="h-8 text-xs w-35">
								<SelectValue placeholder="All tags">
									{selectedTag === "all" ? "All tags" : `#${selectedTag}`}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									<SelectItem value="all">All tags</SelectItem>
									{allTags.map((tag) => (
										<SelectItem key={tag} value={tag}>
											#{tag}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
					)}

					<Select
						value={sortBy}
						onValueChange={(val) =>
							setSortBy((val as "createdAt" | "name" | "size") ?? "createdAt")
						}
					>
						<SelectTrigger className="h-8 text-xs w-35">
							<SelectValue placeholder="Sort by">
								{SORT_LABELS[sortBy] || "Sort by"}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectItem value="createdAt">Newest first</SelectItem>
								<SelectItem value="name">Name (A-Z)</SelectItem>
								<SelectItem value="size">File size</SelectItem>
							</SelectGroup>
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* Main Content Area */}
			{isLoading ? (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
					{SKELETON_KEYS.map((key) => (
						<Skeleton key={key} className="aspect-square w-full rounded-md" />
					))}
				</div>
			) : !mediaItems || mediaItems.length === 0 ? (
				<EmptyState
					icon={FolderIcon}
					title="No media assets found"
					description={
						debouncedQuery || selectedTag !== "all"
							? "No media files match your current search or filters."
							: "Upload images, illustrations, audio, or PDF documents to your media library."
					}
					action={
						canUpload ? (
							<Button
								size="sm"
								onClick={() => setIsUploaderOpen(true)}
								className="gap-1.5"
							>
								<UploadCloudIcon className="size-4" />
								<span>Upload Asset</span>
							</Button>
						) : undefined
					}
				/>
			) : viewMode === "grid" ? (
				<MediaGrid
					items={mediaItems}
					selectedIds={selectedIds}
					onToggleSelect={handleToggleSelect}
					onItemClick={(item) => setSelectedDetailItem(item)}
				/>
			) : (
				<MediaList
					items={mediaItems}
					selectedIds={selectedIds}
					onToggleSelect={handleToggleSelect}
					onSelectAll={handleSelectAll}
					onItemClick={(item) => setSelectedDetailItem(item)}
					onDeleteSingle={(id) => deleteMutation.mutate(id)}
					canDelete={canDelete}
				/>
			)}

			{/* Upload Dialog */}
			<MediaUploader
				open={isUploaderOpen}
				onOpenChange={setIsUploaderOpen}
				onUpload={async (payload) => {
					await uploadMutation.mutateAsync(payload);
				}}
			/>

			{/* Detail / Inspector Dialog */}
			<MediaDetailsDialog
				item={selectedDetailItem}
				open={Boolean(selectedDetailItem)}
				onOpenChange={(open) => {
					if (!open) setSelectedDetailItem(null);
				}}
				onUpdate={async (id, patch) => {
					await updateMutation.mutateAsync({ id, patch });
				}}
				onDelete={async (id) => {
					await deleteMutation.mutateAsync(id);
				}}
				canEdit={canEdit}
				canDelete={canDelete}
			/>
		</div>
	);
}

import {
	columnFilteringFeature,
	columnVisibilityFeature,
	createColumnHelper,
	createFilteredRowModel,
	createPaginatedRowModel,
	createSortedRowModel,
	FlexRender,
	type PaginationState,
	type RowSelectionState,
	rowPaginationFeature,
	rowSelectionFeature,
	rowSortingFeature,
	type SortingState,
	tableFeatures,
	useTable,
} from "@tanstack/react-table";
import type { TFunction } from "i18next";
import {
	ChevronLeftIcon,
	ChevronRightIcon,
	EllipsisVerticalIcon,
	FileEditIcon,
	MailIcon,
} from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { formatNumber, formatRelativeTime } from "@/lib/format";
import type { Post, User } from "@/types/domain";
import { StatusBadge } from "./status-badge";

const features = tableFeatures({
	columnFilteringFeature,
	columnVisibilityFeature,
	rowPaginationFeature,
	rowSelectionFeature,
	rowSortingFeature,
	filteredRowModel: createFilteredRowModel(),
	paginatedRowModel: createPaginatedRowModel(),
	sortedRowModel: createSortedRowModel(),
});

const columnHelper = createColumnHelper<typeof features, Post>();

function initials(name: string): string {
	return name
		.split(/\s+/)
		.map((part) => part[0])
		.filter(Boolean)
		.slice(0, 2)
		.join("")
		.toUpperCase();
}

function buildColumns(
	t: TFunction,
	users: User[],
	onOpen: (post: Post) => void,
	onDuplicate: (post: Post) => void,
	onDelete: (post: Post) => void,
) {
	const userById = new Map(users.map((u) => [u.id, u]));

	return columnHelper.columns([
		columnHelper.display({
			id: "select",
			header: ({ table }) => (
				<div className="flex items-center justify-center">
					<Checkbox
						checked={table.getIsAllPageRowsSelected()}
						indeterminate={
							table.getIsSomePageRowsSelected() &&
							!table.getIsAllPageRowsSelected()
						}
						onCheckedChange={(value) =>
							table.toggleAllPageRowsSelected(!!value)
						}
						aria-label={t("posts.table.selectAll")}
					/>
				</div>
			),
			cell: ({ row }) => (
				<div className="flex items-center justify-center">
					<Checkbox
						checked={row.getIsSelected()}
						onCheckedChange={(value) => row.toggleSelected(!!value)}
						aria-label={t("posts.table.selectRow")}
					/>
				</div>
			),
			enableSorting: false,
			enableHiding: false,
		}),
		columnHelper.accessor("title", {
			header: t("posts.table.title"),
			enableHiding: false,
			cell: ({ row }) => (
				<button
					type="button"
					className="flex max-w-md flex-col items-start gap-0.5 text-left"
					onClick={() => onOpen(row.original)}
				>
					<span className="truncate font-medium hover:underline">
						{row.original.title}
					</span>
					{row.original.excerpt && (
						<span className="line-clamp-1 text-xs text-muted-foreground">
							{row.original.excerpt}
						</span>
					)}
				</button>
			),
		}),
		columnHelper.accessor("status", {
			header: t("posts.table.status"),
			cell: ({ row }) => (
				<div className="flex items-center gap-1.5 flex-wrap">
					<StatusBadge status={row.original.status} />
					{row.original.distribution?.newsletter && (
						<Badge
							variant="outline"
							className="gap-1 border-muted bg-primary/5 text-primary text-[10px] py-0 px-1.5 font-normal"
							title={
								row.original.distribution.newsletterSentAt
									? t("posts.delivery.newsletterSent", {
											date: new Date(
												row.original.distribution.newsletterSentAt,
											).toLocaleDateString(),
										})
									: t("posts.delivery.channelNewsletter")
							}
						>
							<MailIcon className="size-2.5" />
							{t("posts.delivery.channelNewsletter")}
						</Badge>
					)}
				</div>
			),
		}),
		columnHelper.accessor("authorIds", {
			header: t("posts.table.authors"),
			cell: ({ row }) => (
				<div className="flex -space-x-1.5">
					{row.original.authorIds.map((id) => {
						const user = userById.get(id);
						return (
							<Avatar key={id} className="size-6 border-2 border-background">
								<AvatarFallback className="text-[10px]">
									{user ? initials(user.name) : "?"}
								</AvatarFallback>
							</Avatar>
						);
					})}
				</div>
			),
		}),
		columnHelper.accessor("views", {
			header: () => <div className="text-right">{t("posts.table.views")}</div>,
			cell: ({ row }) => (
				<div className="text-right tabular-nums text-muted-foreground">
					{formatNumber(row.original.views)}
				</div>
			),
		}),
		columnHelper.accessor("updatedAt", {
			header: t("posts.table.updated"),
			cell: ({ row }) => (
				<span className="text-muted-foreground">
					{formatRelativeTime(row.original.updatedAt)}
				</span>
			),
		}),
		columnHelper.display({
			id: "actions",
			cell: ({ row }) => (
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<Button
								variant="ghost"
								className="flex size-8 text-muted-foreground data-open:bg-muted"
								size="icon"
							/>
						}
					>
						<EllipsisVerticalIcon />
						<span className="sr-only">{t("posts.table.actionsAria")}</span>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-36">
						<DropdownMenuItem onClick={() => onOpen(row.original)}>
							<FileEditIcon />
							{t("posts.table.edit")}
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => onDuplicate(row.original)}>
							{t("posts.table.duplicate")}
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							variant="destructive"
							onClick={() => onDelete(row.original)}
						>
							{t("posts.table.delete")}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			),
		}),
	]);
}

export function PostsTable({
	data,
	users,
	onDuplicate,
	onDelete,
}: {
	data: Post[];
	users: User[];
	onDuplicate: (post: Post) => void;
	onDelete: (post: Post) => void;
}) {
	const navigate = useNavigate();
	const { t } = useTranslation();
	const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
	const [sorting, setSorting] = React.useState<SortingState>([]);
	const [pagination, setPagination] = React.useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	});

	const columns = React.useMemo(
		() =>
			buildColumns(
				t,
				users,
				(post) => navigate(`/editor/${post.id}`),
				onDuplicate,
				onDelete,
			),
		[t, users, navigate, onDuplicate, onDelete],
	);

	const table = useTable({
		features,
		data,
		columns,
		state: {
			sorting,
			rowSelection,
			pagination,
		},
		getRowId: (row) => row.id,
		enableRowSelection: true,
		onRowSelectionChange: setRowSelection,
		onSortingChange: setSorting,
		onPaginationChange: setPagination,
	});

	const selectedCount = table.getFilteredSelectedRowModel().rows.length;

	return (
		<div className="flex flex-col gap-4">
			{selectedCount > 0 && (
				<div className="flex items-center gap-3 rounded-md border bg-muted/50 px-4 py-2 text-sm">
					<span className="font-medium">
						{t("posts.table.selectedCount", { count: selectedCount })}
					</span>
					<Button
						size="sm"
						variant="outline"
						onClick={() => {
							toast.info(t("posts.table.bulkComingSoon"));
						}}
					>
						{t("posts.table.changeStatus")}
					</Button>
					<Button
						size="sm"
						variant="destructive"
						onClick={() => {
							for (const row of table.getSelectedRowModel().rows) {
								onDelete(row.original);
							}
							setRowSelection({});
						}}
					>
						{t("posts.table.delete")}
					</Button>
				</div>
			)}

			<div className="overflow-hidden rounded-lg border">
				<Table>
					<TableHeader className="sticky top-0 z-10 bg-muted">
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<TableHead key={header.id} colSpan={header.colSpan}>
										{header.isPlaceholder ? null : (
											<FlexRender header={header} />
										)}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody className="**:data-[slot=table-cell]:first:w-8">
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									data-state={row.getIsSelected() && "selected"}
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>
											<FlexRender cell={cell} />
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center"
								>
									{t("posts.table.noResults")}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			<div className="flex items-center justify-between px-1">
				<div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
					{t("posts.table.postsCount", {
						count: table.getFilteredRowModel().rows.length,
					})}
				</div>
				<div className="flex items-center gap-4">
					<span className="text-sm text-muted-foreground">
						{t("posts.table.pageOf", {
							current: table.state.pagination.pageIndex + 1,
							total: Math.max(table.getPageCount(), 1),
						})}
					</span>
					<div className="flex items-center gap-1">
						<Button
							variant="outline"
							size="icon-sm"
							onClick={() => table.previousPage()}
							disabled={!table.getCanPreviousPage()}
						>
							<span className="sr-only">{t("posts.table.prevPage")}</span>
							<ChevronLeftIcon />
						</Button>
						<Button
							variant="outline"
							size="icon-sm"
							onClick={() => table.nextPage()}
							disabled={!table.getCanNextPage()}
						>
							<span className="sr-only">{t("posts.table.nextPage")}</span>
							<ChevronRightIcon />
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}

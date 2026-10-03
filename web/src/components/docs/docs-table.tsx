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
import {
	BookOpenIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	EllipsisVerticalIcon,
	ExternalLinkIcon,
	FileEditIcon,
	LayersIcon,
	Trash2Icon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
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
import { formatRelativeTime } from "@/lib/format";
import type { DocumentationProject } from "@/types/domain";

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

const columnHelper = createColumnHelper<
	typeof features,
	DocumentationProject
>();

function buildProjectColumns(
	navigate: (path: string) => void,
	onDelete: (id: string) => void,
	t: (key: string) => string,
) {
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
						onCheckedChange={(val) =>
							table.toggleAllPageRowsSelected(Boolean(val))
						}
						aria-label="Select all"
					/>
				</div>
			),
			cell: ({ row }) => (
				<div className="flex items-center justify-center">
					<Checkbox
						checked={row.getIsSelected()}
						onCheckedChange={(val) => row.toggleSelected(Boolean(val))}
						aria-label="Select row"
					/>
				</div>
			),
			enableSorting: false,
			enableHiding: false,
		}),
		columnHelper.accessor("title", {
			header: "Documentation",
			cell: ({ row }) => {
				const firstDocId = row.original.navigation.items[0]?.id || "new";
				return (
					<button
						type="button"
						className="flex max-w-md flex-col items-start gap-1 text-left"
						onClick={() =>
							navigate(`/editor/doc/${firstDocId}?project=${row.original.id}`)
						}
					>
						<div className="flex items-center gap-2">
							<BookOpenIcon className="h-4 w-4 shrink-0 text-primary" />
							<span className="truncate font-semibold hover:underline">
								{row.original.title}
							</span>
						</div>
						{row.original.description && (
							<span className="line-clamp-1 text-xs text-muted-foreground pl-6">
								{row.original.description}
							</span>
						)}
					</button>
				);
			},
		}),
		columnHelper.accessor("status", {
			header: "Status",
			cell: ({ row }) => (
				<Badge
					variant={
						row.original.status === "published" ? "default" : "secondary"
					}
					className="capitalize text-xs font-medium"
				>
					{row.original.status}
				</Badge>
			),
		}),
		columnHelper.accessor("pagesCount", {
			header: "Articles",
			cell: ({ row }) => (
				<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
					<LayersIcon className="size-3.5" />
					<span>{row.original.pagesCount} pages</span>
				</div>
			),
		}),
		columnHelper.accessor("slug", {
			header: "Slug",
			cell: ({ row }) => (
				<span className="font-mono text-xs text-muted-foreground">
					/docs/{row.original.slug}
				</span>
			),
		}),
		columnHelper.accessor("updatedAt", {
			header: "Updated",
			cell: ({ row }) => (
				<span className="text-xs text-muted-foreground">
					{formatRelativeTime(row.original.updatedAt)}
				</span>
			),
		}),
		columnHelper.display({
			id: "actions",
			cell: ({ row }) => {
				const firstDocId = row.original.navigation.items[0]?.id || "new";
				return (
					<div className="flex justify-end">
						<DropdownMenu>
							<DropdownMenuTrigger
								render={
									<Button
										variant="ghost"
										size="icon-sm"
										aria-label="Documentation actions"
									/>
								}
							>
								<EllipsisVerticalIcon className="size-4" />
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem
									onClick={() =>
										navigate(
											`/editor/doc/${firstDocId}?project=${row.original.id}`,
										)
									}
								>
									<FileEditIcon className="mr-2 size-4" />
									{t("common.edit")}
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() =>
										window.open(`/docs/${row.original.slug}`, "_blank")
									}
								>
									<ExternalLinkIcon className="mr-2 size-4" />
									Preview
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									className="text-destructive focus:text-destructive"
									onClick={() => onDelete(row.original.id)}
								>
									<Trash2Icon className="mr-2 size-4" />
									{t("common.delete")}
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				);
			},
		}),
	]);
}

export function DocsTable({
	data,
	onDelete,
}: {
	data: DocumentationProject[];
	onDelete: (id: string) => void;
}) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [sorting, setSorting] = useState<SortingState>([
		{ id: "updatedAt", desc: true },
	]);
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	});

	const columns = useMemo(
		() => buildProjectColumns(navigate, onDelete, t),
		[navigate, onDelete, t],
	);

	const table = useTable({
		features,
		data,
		columns,
		state: { sorting, rowSelection, pagination },
		onSortingChange: setSorting,
		onRowSelectionChange: setRowSelection,
		onPaginationChange: setPagination,
		getRowId: (row) => row.id,
		enableRowSelection: true,
	});

	return (
		<div className="space-y-4">
			<div className="overflow-hidden rounded-lg border bg-card">
				<Table>
					<TableHeader className="sticky top-0 z-10 bg-muted/60">
						{table.getHeaderGroups().map((group) => (
							<TableRow key={group.id}>
								{group.headers.map((header) => (
									<TableHead key={header.id} className="text-xs">
										{header.isPlaceholder ? null : (
											<FlexRender header={header} />
										)}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody className="**:data-[slot=table-cell]:first:w-8">
						{table.getRowModel().rows?.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-32 text-center text-sm text-muted-foreground"
								>
									No documentation projects found.
								</TableCell>
							</TableRow>
						) : (
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									data-state={row.getIsSelected() && "selected"}
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id} className="py-3">
											<FlexRender cell={cell} />
										</TableCell>
									))}
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			{/* Pagination Controls */}
			{table.getPageCount() > 1 && (
				<div className="flex items-center justify-between text-xs text-muted-foreground">
					<span>
						Page {pagination.pageIndex + 1} of {table.getPageCount()}
					</span>
					<div className="flex items-center gap-1">
						<Button
							variant="outline"
							size="sm"
							onClick={() => table.previousPage()}
							disabled={!table.getCanPreviousPage()}
						>
							<ChevronLeftIcon className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => table.nextPage()}
							disabled={!table.getCanNextPage()}
						>
							<ChevronRightIcon className="h-4 w-4" />
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}

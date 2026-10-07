import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQuery } from "@tanstack/react-query";
import {
	CheckIcon,
	ChevronDownIcon,
	ChevronRightIcon,
	FilePlusIcon,
	FilesIcon,
	FileTextIcon,
	Globe,
	GripVerticalIcon,
	PencilIcon,
	PlusIcon,
	Trash2Icon,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { mockApi } from "@/lib/mock/api";
import { cn } from "@/lib/utils";
import type {
	DocNavigationManifest,
	DocTreeItem,
	WorkspaceLocale,
} from "@/types/domain";

interface DocsTreeProps {
	manifest: DocNavigationManifest;
	selectedDocId: string | null;
	onSelectDoc: (id: string) => void;
	onUpdateManifest: (updated: DocNavigationManifest) => void;
	onAddDoc: (parentId?: string) => void;
	onDeleteDoc: (id: string) => void;
	onRenameDoc?: (id: string, newTitle: string) => void;
	selectedLocale?: string;
	onSelectLocale?: (locale: string) => void;
}

interface RecursiveTreeItemProps {
	item: DocTreeItem;
	selectedDocId: string | null;
	depth?: number;
	selectedLocale?: string;
	onSelectDoc: (id: string) => void;
	onAddChild: (parentId: string) => void;
	onDeleteDoc: (id: string) => void;
	onRenameDoc?: (id: string, newTitle: string) => void;
	onRequestTranslate?: (item: DocTreeItem) => void;
}

function RecursiveTreeItem({
	item,
	selectedDocId,
	depth = 0,
	selectedLocale,
	onSelectDoc,
	onAddChild,
	onDeleteDoc,
	onRenameDoc,
	onRequestTranslate,
}: RecursiveTreeItemProps) {
	const [collapsed, setCollapsed] = React.useState(false);
	const [isEditing, setIsEditing] = React.useState(false);
	const [editTitle, setEditTitle] = React.useState(item.title || "Untitled");
	const inputRef = React.useRef<HTMLInputElement>(null);

	const hasChildren = Boolean(item.children && item.children.length > 0);
	const isSelected = selectedDocId === item.id;
	const isUntranslated = Boolean(
		selectedLocale && selectedLocale !== "en" && item.hasTranslation === false,
	);

	React.useEffect(() => {
		setEditTitle(item.title || "Untitled");
	}, [item.title]);

	React.useEffect(() => {
		if (isEditing) {
			inputRef.current?.focus();
			inputRef.current?.select();
		}
	}, [isEditing]);

	const handleCommitRename = () => {
		const trimmed = editTitle.trim();
		const finalTitle = trimmed || "Untitled";
		if (finalTitle !== item.title && onRenameDoc) {
			onRenameDoc(item.id, finalTitle);
		}
		setIsEditing(false);
	};

	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: item.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		paddingLeft: `${Math.max(depth * 14 + 6, 6)}px`,
	};

	return (
		<div ref={setNodeRef} style={style} className="space-y-0.5">
			<div
				className={cn(
					"group flex items-center justify-between gap-1 rounded-md pr-1.5 py-1 text-xs font-medium transition-colors",
					isSelected
						? "bg-accent text-accent-foreground font-semibold"
						: "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
					isDragging && "opacity-50 z-50 bg-accent/50 shadow-md",
				)}
			>
				{/* Reorder grip */}
				<button
					type="button"
					aria-label="Reorder document"
					{...attributes}
					{...listeners}
					className="text-muted-foreground/30 hover:text-foreground cursor-grab active:cursor-grabbing p-0.5 rounded shrink-0"
				>
					<GripVerticalIcon className="h-3 w-3" />
				</button>

				{/* Expand/Collapse Chevron (if has children) or File Icon */}
				{hasChildren ? (
					<button
						type="button"
						onClick={() => setCollapsed((v) => !v)}
						className="p-0.5 text-muted-foreground hover:text-foreground shrink-0"
					>
						{collapsed ? (
							<ChevronRightIcon className="h-3 w-3" />
						) : (
							<ChevronDownIcon className="h-3 w-3" />
						)}
					</button>
				) : (
					<FileTextIcon
						className={cn(
							"h-3.5 w-3.5 shrink-0",
							isUntranslated
								? "text-amber-500/70 dark:text-amber-400/70"
								: "text-muted-foreground/60",
						)}
					/>
				)}

				{/* Document Title or Inline Edit Input */}
				{isEditing ? (
					<form
						onSubmit={(e) => {
							e.preventDefault();
							handleCommitRename();
						}}
						className="flex items-center gap-1 flex-1 min-w-0 pr-1"
					>
						<input
							ref={inputRef}
							type="text"
							value={editTitle}
							onChange={(e) => setEditTitle(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Escape") {
									setEditTitle(item.title || "Untitled");
									setIsEditing(false);
								}
							}}
							onBlur={handleCommitRename}
							className="flex-1 bg-background border border-primary/50 rounded px-1.5 py-0.5 text-xs text-foreground outline-none font-medium"
						/>
						<button
							type="submit"
							className="text-primary hover:text-primary/80 p-0.5"
							title="Save title"
							aria-label="Save title"
						>
							<CheckIcon className="h-3 w-3" />
						</button>
					</form>
				) : (
					<button
						type="button"
						onClick={() => {
							if (isUntranslated && onRequestTranslate) {
								onRequestTranslate(item);
							} else {
								onSelectDoc(item.id);
							}
						}}
						onDoubleClick={(e) => {
							e.stopPropagation();
							if (!isUntranslated) {
								setIsEditing(true);
							}
						}}
						className={cn(
							"flex-1 truncate text-left select-none",
							isUntranslated && "text-muted-foreground/75 italic",
						)}
					>
						<span className="truncate">{item.title || "Untitled"}</span>
					</button>
				)}

				{/* Status & Actions */}
				{!isEditing && (
					<div className="flex items-center gap-1 shrink-0">
						{isUntranslated ? (
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									onRequestTranslate?.(item);
								}}
								className="inline-flex items-center gap-0.5 rounded border border-amber-500/30 bg-amber-500/10 px-1 py-0 text-[9px] font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 cursor-pointer"
								title={`Translate into ${selectedLocale?.toUpperCase()}`}
							>
								<Globe className="size-2.5" />
								<span>+ {selectedLocale?.toUpperCase()}</span>
							</button>
						) : item.status === "draft" ? (
							<Badge
								variant="secondary"
								className="px-1 py-0 text-[9px] uppercase font-mono tracking-wider"
							>
								Draft
							</Badge>
						) : null}

						<div className="opacity-0 group-hover:opacity-100 flex items-center transition-opacity">
							{/* Inline Rename trigger (only for translated items) */}
							{!isUntranslated && (
								<Button
									variant="ghost"
									size="icon"
									className="h-5 w-5 text-muted-foreground hover:text-foreground"
									onClick={(e) => {
										e.stopPropagation();
										setIsEditing(true);
									}}
									title="Rename document"
								>
									<PencilIcon className="size-3" />
								</Button>
							)}

							{/* Add Child Page */}
							<Button
								variant="ghost"
								size="icon"
								className="h-5 w-5 text-muted-foreground hover:text-foreground"
								onClick={(e) => {
									e.stopPropagation();
									onAddChild(item.id);
									setCollapsed(false);
								}}
								title="Add child page"
							>
								<PlusIcon className="h-3 w-3" />
							</Button>

							{/* Delete Page */}
							<Button
								variant="ghost"
								size="icon"
								className="h-5 w-5 text-muted-foreground hover:text-destructive"
								onClick={(e) => {
									e.stopPropagation();
									onDeleteDoc(item.id);
								}}
								title="Delete document"
							>
								<Trash2Icon className="h-3 w-3" />
							</Button>
						</div>
					</div>
				)}
			</div>

			{/* Sub-pages / Nested children */}
			{hasChildren && !collapsed && (
				<div className="space-y-0.5 border-l border-border/40 ml-2">
					<SortableContext
						items={item.children ? item.children.map((child) => child.id) : []}
						strategy={verticalListSortingStrategy}
					>
						{item.children?.map((child) => (
							<RecursiveTreeItem
								key={child.id}
								item={child}
								selectedDocId={selectedDocId}
								selectedLocale={selectedLocale}
								depth={depth + 1}
								onSelectDoc={onSelectDoc}
								onAddChild={onAddChild}
								onDeleteDoc={onDeleteDoc}
								onRenameDoc={onRenameDoc}
								onRequestTranslate={onRequestTranslate}
							/>
						))}
					</SortableContext>
				</div>
			)}
		</div>
	);
}
function reorderTree(
	items: DocTreeItem[],
	activeId: string,
	overId: string,
): DocTreeItem[] {
	// 1. Try sibling reordering (at root or inside any children list)
	function reorderSiblings(list: DocTreeItem[]): {
		list: DocTreeItem[];
		reordered: boolean;
	} {
		const activeIndex = list.findIndex((i) => i.id === activeId);
		const overIndex = list.findIndex((i) => i.id === overId);

		if (activeIndex !== -1 && overIndex !== -1) {
			return {
				list: arrayMove(list, activeIndex, overIndex),
				reordered: true,
			};
		}

		let anyChildReordered = false;
		const nextList = list.map((item) => {
			if (item.children && item.children.length > 0) {
				const res = reorderSiblings(item.children);
				if (res.reordered) {
					anyChildReordered = true;
					return { ...item, children: res.list };
				}
			}
			return item;
		});

		return { list: nextList, reordered: anyChildReordered };
	}

	const siblingAttempt = reorderSiblings(items);
	if (siblingAttempt.reordered) {
		return siblingAttempt.list;
	}

	// 2. Cross-level move: extract active item, then insert adjacent to over item
	let extractedItem: DocTreeItem | null = null;

	function extract(list: DocTreeItem[]): DocTreeItem[] {
		const result: DocTreeItem[] = [];
		for (const it of list) {
			if (it.id === activeId) {
				extractedItem = it;
				continue;
			}
			if (it.children && it.children.length > 0) {
				result.push({ ...it, children: extract(it.children) });
			} else {
				result.push(it);
			}
		}
		return result;
	}

	const pruned = extract(items);
	if (!extractedItem) return items;

	function insert(list: DocTreeItem[]): DocTreeItem[] {
		const result: DocTreeItem[] = [];
		for (const it of list) {
			if (it.id === overId) {
				if (extractedItem) result.push(extractedItem);
				result.push(it);
			} else {
				if (it.children && it.children.length > 0) {
					result.push({ ...it, children: insert(it.children) });
				} else {
					result.push(it);
				}
			}
		}
		return result;
	}

	return insert(pruned);
}

export function DocsTree({
	manifest,
	selectedDocId,
	onSelectDoc,
	onUpdateManifest,
	onAddDoc,
	onDeleteDoc,
	onRenameDoc,
	selectedLocale = "en",
	onSelectLocale,
}: DocsTreeProps) {
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 5,
			},
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const { data: locales } = useQuery({
		queryKey: ["workspace", "locales"],
		queryFn: () => mockApi.locales.list(),
	});

	const currentLocale = selectedLocale || manifest.locale || "en";
	const currentLocaleObj: WorkspaceLocale = (locales ?? []).find(
		(l) => l.code === currentLocale,
	) ?? {
		code: currentLocale,
		name: currentLocale.toUpperCase(),
		flag: "🌐",
	};

	const [translateItem, setTranslateItem] = React.useState<DocTreeItem | null>(
		null,
	);
	const [isTranslating, setIsTranslating] = React.useState(false);

	const handleConfirmTranslate = async () => {
		if (!translateItem || !currentLocale) return;
		setIsTranslating(true);
		try {
			const sourceId = translateItem.sourceDocId || translateItem.id;
			const newDoc = await mockApi.docs.createTranslation(
				sourceId,
				currentLocale,
			);
			toast.success(
				`Created ${currentLocaleObj.name} translation for "${newDoc.title}"`,
			);
			setTranslateItem(null);
			onSelectDoc(newDoc.id);
		} catch (_err) {
			toast.error("Failed to create translation");
		} finally {
			setIsTranslating(false);
		}
	};

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		if (!over || active.id === over.id) return;

		const reordered = reorderTree(
			manifest.items,
			active.id as string,
			over.id as string,
		);
		onUpdateManifest({ ...manifest, items: reordered });
	};

	const itemIds = manifest.items.map((i) => i.id);

	return (
		<div className="flex flex-col h-full bg-sidebar/50 border-r border-border/60">
			{/* Tree Header Actions */}
			<div className="flex flex-col gap-2 p-2.5 border-b border-border/50">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-1.5">
						<FilesIcon className="h-3.5 w-3.5 text-primary" />
						<span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
							Documents
						</span>
					</div>
					<Button
						variant="ghost"
						size="sm"
						className="h-6 px-1.5 text-xs gap-1"
						onClick={() => onAddDoc()}
						title="Add root document"
					>
						<FilePlusIcon className="h-3 w-3" />
						<span>New Page</span>
					</Button>
				</div>

				{/* Workspace Language Switcher */}
				{locales && locales.length > 0 && onSelectLocale && (
					<div className="flex items-center justify-between gap-1 rounded-md border border-border/60 bg-background/50 px-2 py-1 text-xs">
						<div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
							<Globe className="h-3 w-3 shrink-0" />
							<span className="text-[11px] font-medium truncate">Language</span>
						</div>
						<DropdownMenu>
							<DropdownMenuTrigger
								render={
									<Button
										variant="ghost"
										size="xs"
										className="h-5 px-1.5 text-xs gap-1 font-normal hover:bg-muted"
									/>
								}
								aria-label={`Current language: ${currentLocaleObj.name}`}
							>
								<span>{currentLocaleObj.flag}</span>
								<span className="truncate max-w-[80px] font-medium text-[11px]">
									{currentLocaleObj.name}
								</span>
								<ChevronDownIcon className="h-3 w-3 opacity-60" />
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-44">
								{locales.map((loc) => (
									<DropdownMenuItem
										key={loc.code}
										onClick={() => onSelectLocale(loc.code)}
										className="flex items-center justify-between text-xs cursor-pointer"
									>
										<div className="flex items-center gap-2">
											<span>{loc.flag}</span>
											<span>{loc.name}</span>
										</div>
										{loc.code === currentLocale && (
											<CheckIcon className="h-3.5 w-3.5 text-primary" />
										)}
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				)}
			</div>

			{/* Tree List */}
			<div className="flex-1 overflow-y-auto p-2 space-y-1 editor-scroll">
				{manifest.items.length === 0 ? (
					<div className="flex flex-col items-center justify-center p-6 text-center text-xs text-muted-foreground">
						<p className="mb-2">No documents yet.</p>
						<Button
							variant="outline"
							size="sm"
							onClick={() => onAddDoc()}
							className="text-xs h-7 gap-1"
						>
							<PlusIcon className="h-3 w-3" />
							Create Root Page
						</Button>
					</div>
				) : (
					<DndContext
						sensors={sensors}
						collisionDetection={closestCenter}
						onDragEnd={handleDragEnd}
					>
						<SortableContext
							items={itemIds}
							strategy={verticalListSortingStrategy}
						>
							{manifest.items.map((item) => (
								<RecursiveTreeItem
									key={item.id}
									item={item}
									selectedDocId={selectedDocId}
									selectedLocale={currentLocale}
									onSelectDoc={onSelectDoc}
									onAddChild={(parentId) => onAddDoc(parentId)}
									onDeleteDoc={onDeleteDoc}
									onRenameDoc={onRenameDoc}
									onRequestTranslate={(it) => setTranslateItem(it)}
								/>
							))}
						</SortableContext>
					</DndContext>
				)}
			</div>

			{/* Quick Translate Dialog */}
			<Dialog
				open={Boolean(translateItem)}
				onOpenChange={(open) => !open && setTranslateItem(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 text-base">
							<span>{currentLocaleObj.flag}</span>
							<span>Create {currentLocaleObj.name} Translation</span>
						</DialogTitle>
						<DialogDescription>
							&ldquo;{translateItem?.title}&rdquo; does not have a{" "}
							{currentLocaleObj.name} translation yet. Would you like to create
							a localized draft with source content copied from English?
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="flex-col sm:flex-row gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								if (translateItem) {
									const sourceId =
										translateItem.sourceDocId || translateItem.id;
									setTranslateItem(null);
									onSelectLocale?.("en");
									onSelectDoc(sourceId);
								}
							}}
						>
							View English Original
						</Button>
						<Button
							size="sm"
							onClick={handleConfirmTranslate}
							disabled={isTranslating}
							className="gap-1.5"
						>
							{isTranslating
								? "Creating..."
								: `Create ${currentLocaleObj.name} Translation`}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

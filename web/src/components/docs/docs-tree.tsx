import {
	type CollisionDetection,
	closestCenter,
	DndContext,
	type DragEndEvent,
	type DragMoveEvent,
	type DragOverEvent,
	DragOverlay,
	type DragStartEvent,
	KeyboardSensor,
	type Over,
	PointerSensor,
	pointerWithin,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { DocumentTextIcon } from "@heroicons/react/24/outline";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ChartLineIcon,
	CheckIcon,
	ChevronDownIcon,
	ChevronRightIcon,
	FilePlusIcon,
	FileTextIcon,
	Globe,
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

export type DropPosition = "above" | "inside" | "below" | null;

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
	activeDragId: string | null;
	hoveredOverId: string | null;
	dropPosition: DropPosition;
	isAncestorDragging?: boolean;
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
	activeDragId,
	hoveredOverId,
	dropPosition,
	isAncestorDragging = false,
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
	const isSelected =
		selectedDocId === item.id ||
		(Boolean(item.localizedDocId) && selectedDocId === item.localizedDocId);
	const isUntranslated = Boolean(
		selectedLocale && selectedLocale !== "en" && item.hasTranslation === false,
	);

	const isDropTarget =
		hoveredOverId === item.id &&
		activeDragId !== item.id &&
		!isAncestorDragging;
	const isAboveTarget = isDropTarget && dropPosition === "above";
	const isInsideTarget = isDropTarget && dropPosition === "inside";
	const isBelowTarget = isDropTarget && dropPosition === "below";

	// Auto-expand if dropped inside
	React.useEffect(() => {
		if (isInsideTarget && collapsed) {
			setCollapsed(false);
		}
	}, [isInsideTarget, collapsed]);

	// Auto-expand when new children are added
	const prevChildrenCountRef = React.useRef(item.children?.length ?? 0);
	React.useEffect(() => {
		const currentCount = item.children?.length ?? 0;
		if (currentCount > prevChildrenCountRef.current) {
			setCollapsed(false);
		}
		prevChildrenCountRef.current = currentCount;
	}, [item.children?.length]);

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

	const { attributes, listeners, setNodeRef, isDragging } = useSortable({
		id: item.id,
	});

	return (
		<div
			style={{ paddingLeft: `${Math.max(depth * 14 + 6, 6)}px` }}
			className="space-y-0.5 relative select-none"
		>
			{/* Main draggable row */}
			<div
				ref={setNodeRef}
				{...attributes}
				{...listeners}
				role="treeitem"
				aria-selected={isSelected}
				tabIndex={0}
				onClick={() => {
					if (isUntranslated && onRequestTranslate) {
						onRequestTranslate(item);
					} else {
						onSelectDoc(item.localizedDocId || item.id);
					}
				}}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						if (isUntranslated && onRequestTranslate) {
							onRequestTranslate(item);
						} else {
							onSelectDoc(item.localizedDocId || item.id);
						}
					}
				}}
				onDoubleClick={(e) => {
					e.stopPropagation();
					if (!isUntranslated) {
						setIsEditing(true);
					}
				}}
				className={cn(
					"group relative flex items-center justify-between gap-1.5 rounded-md px-2 py-1 text-xs font-medium cursor-grab active:cursor-grabbing transition-colors outline-none",
					isSelected
						? "bg-accent text-accent-foreground font-semibold"
						: "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
					(isDragging || isAncestorDragging) &&
						"opacity-30 border border-dashed border-primary/50 pointer-events-none",
					isInsideTarget &&
						"bg-primary/10 text-primary border border-primary/40 ring-2 ring-primary/20",
				)}
			>
				{/* Top insertion line indicator */}
				{isAboveTarget && (
					<div className="absolute -top-0.5 left-0 right-0 h-0.5 bg-primary z-30 pointer-events-none rounded-full flex items-center">
						<div className="size-2 rounded-full bg-primary -ml-1 border-2 border-background" />
					</div>
				)}

				{/* Bottom insertion line indicator */}
				{isBelowTarget && (
					<div className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-primary z-30 pointer-events-none rounded-full flex items-center">
						<div className="size-2 rounded-full bg-primary -ml-1 border-2 border-background" />
					</div>
				)}

				{/* Expand/Collapse Chevron (if has children) or File Icon */}
				{hasChildren ? (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							setCollapsed((v) => !v);
						}}
						className="p-0.5 text-muted-foreground hover:text-foreground shrink-0 rounded hover:bg-accent/50 cursor-pointer"
					>
						{collapsed ? (
							<ChevronRightIcon className="h-3 w-3" />
						) : (
							<ChevronDownIcon className="h-3 w-3" />
						)}
					</button>
				) : (
					<DocumentTextIcon
						className={cn(
							"h-3.5 w-3.5 shrink-0 pointer-events-none",
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
						className="flex items-center gap-1 flex-1 min-w-0 pr-1 cursor-default"
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
					<div
						className={cn(
							"flex-1 truncate text-left pointer-events-none",
							isUntranslated && "text-muted-foreground/75 italic",
						)}
					>
						<span className="truncate">{item.title || "Untitled"}</span>
					</div>
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
								className="px-1 py-0 text-[9px] uppercase font-mono tracking-wider pointer-events-none"
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
									className="h-5 w-5 text-muted-foreground hover:text-foreground cursor-pointer"
									onClick={(e) => {
										e.stopPropagation();
										setIsEditing(true);
									}}
									title="Rename document"
								>
									<PencilIcon className="size-3" />
								</Button>
							)}

							{/* View Analytics */}
							{!isUntranslated && (
								<Button
									variant="ghost"
									size="icon"
									className="h-5 w-5 text-muted-foreground hover:text-foreground cursor-pointer"
									onClick={(e) => {
										e.stopPropagation();
										window.open(
											`/analytics?type=doc&id=${item.localizedDocId || item.id}`,
											"_blank",
										);
									}}
									title="View analytics"
								>
									<ChartLineIcon className="size-3" />
								</Button>
							)}

							{/* Add Child Page */}
							<Button
								variant="ghost"
								size="icon"
								className="h-5 w-5 text-muted-foreground hover:text-foreground cursor-pointer"
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
								className="h-5 w-5 text-muted-foreground hover:text-destructive cursor-pointer"
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
				<div
					className={cn(
						"space-y-0.5 border-l border-border/40 ml-2",
						(isDragging || isAncestorDragging) &&
							"opacity-30 pointer-events-none",
					)}
				>
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
								activeDragId={activeDragId}
								hoveredOverId={hoveredOverId}
								dropPosition={dropPosition}
								isAncestorDragging={isDragging || isAncestorDragging}
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

// Tree helper functions
function isDescendant(parent: DocTreeItem, targetId: string): boolean {
	if (!parent.children || parent.children.length === 0) return false;
	for (const child of parent.children) {
		if (child.id === targetId || isDescendant(child, targetId)) {
			return true;
		}
	}
	return false;
}

function findNode(list: DocTreeItem[], targetId: string): DocTreeItem | null {
	for (const item of list) {
		if (item.id === targetId) return item;
		if (item.children && item.children.length > 0) {
			const found = findNode(item.children, targetId);
			if (found) return found;
		}
	}
	return null;
}

// Reorders or nests items according to drop position: "above" | "inside" | "below"
function reorderTreeWithPosition(
	items: DocTreeItem[],
	activeId: string,
	overId: string,
	position: "above" | "inside" | "below",
): DocTreeItem[] {
	if (activeId === overId) return items;

	const activeNode = findNode(items, activeId);
	if (!activeNode) return items;

	// PREVENT DATA LOSS & CYCLES: Cannot drop a node into itself or any descendant
	if (isDescendant(activeNode, overId)) {
		return items;
	}

	let extractedItem: DocTreeItem | null = null;

	// 1. Extract activeItem from previous location
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

	// 2. Insert item according to position
	function insert(list: DocTreeItem[]): DocTreeItem[] {
		const result: DocTreeItem[] = [];
		for (const it of list) {
			if (it.id === overId) {
				if (position === "above") {
					if (extractedItem) result.push(extractedItem);
					result.push(it);
				} else if (position === "below") {
					result.push(it);
					if (extractedItem) result.push(extractedItem);
				} else if (position === "inside") {
					// Nest inside it.children!
					const updatedChildren = it.children ? [...it.children] : [];
					if (extractedItem) updatedChildren.push(extractedItem);
					result.push({
						...it,
						children: updatedChildren,
					});
				}
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
				distance: 6, // 6px movement threshold ensures clean clicks vs drags
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

	// Live pointer tracking for precision drop target calculation
	const pointerYRef = React.useRef<number>(0);

	React.useEffect(() => {
		const handlePointerMove = (e: PointerEvent) => {
			pointerYRef.current = e.clientY;
		};
		window.addEventListener("pointermove", handlePointerMove, {
			passive: true,
		});
		return () => {
			window.removeEventListener("pointermove", handlePointerMove);
		};
	}, []);

	// Dragging states
	const [activeDragId, setActiveDragId] = React.useState<string | null>(null);
	const [hoveredOverId, setHoveredOverId] = React.useState<string | null>(null);
	const [dropPosition, setDropPosition] = React.useState<DropPosition>(null);

	const activeItem = React.useMemo(() => {
		return activeDragId ? findNode(manifest.items, activeDragId) : null;
	}, [activeDragId, manifest.items]);

	const customCollisionDetection: CollisionDetection = React.useCallback(
		(args) => {
			const pointerCollisions = pointerWithin(args);
			if (pointerCollisions.length > 0) {
				return pointerCollisions;
			}
			return closestCenter(args);
		},
		[],
	);

	const queryClient = useQueryClient();
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
			const refreshedNav = await mockApi.docs.getNavigation(
				newDoc.projectId,
				currentLocale,
			);
			onUpdateManifest(refreshedNav);
			queryClient.invalidateQueries({ queryKey: ["docs-navigation"] });
			queryClient.invalidateQueries({ queryKey: ["docs-projects"] });
			setTranslateItem(null);
			onSelectDoc(newDoc.id);
		} catch (_err) {
			toast.error("Failed to create translation");
		} finally {
			setIsTranslating(false);
		}
	};

	const handleDragStart = (event: DragStartEvent) => {
		setActiveDragId(event.active.id as string);
	};

	const updateDropTarget = React.useCallback(
		(over: Over | null) => {
			if (!over || !activeDragId || over.id === activeDragId) {
				setHoveredOverId(null);
				setDropPosition(null);
				return;
			}

			const activeNode = findNode(manifest.items, activeDragId);
			if (activeNode && isDescendant(activeNode, over.id as string)) {
				setHoveredOverId(null);
				setDropPosition(null);
				return;
			}

			const overId = over.id as string;
			setHoveredOverId(overId);

			const overRect = over.rect;
			const pointerY = pointerYRef.current;

			if (overRect && overRect.height > 0) {
				const relativeY = (pointerY - overRect.top) / overRect.height;
				if (relativeY < 0.25) {
					setDropPosition("above");
				} else if (relativeY > 0.75) {
					setDropPosition("below");
				} else {
					setDropPosition("inside");
				}
			} else {
				setDropPosition("inside");
			}
		},
		[activeDragId, manifest.items],
	);

	const handleDragMove = (event: DragMoveEvent) => {
		updateDropTarget(event.over);
	};

	const handleDragOver = (event: DragOverEvent) => {
		updateDropTarget(event.over);
	};

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		const finalPosition = dropPosition || "below";

		setActiveDragId(null);
		setHoveredOverId(null);
		setDropPosition(null);

		if (!over || active.id === over.id) return;

		const activeNode = findNode(manifest.items, active.id as string);
		if (activeNode && isDescendant(activeNode, over.id as string)) {
			return;
		}

		const reordered = reorderTreeWithPosition(
			manifest.items,
			active.id as string,
			over.id as string,
			finalPosition,
		);
		onUpdateManifest({ ...manifest, items: reordered });
	};

	const handleDragCancel = () => {
		setActiveDragId(null);
		setHoveredOverId(null);
		setDropPosition(null);
	};

	const itemIds = manifest.items.map((i) => i.id);

	return (
		<div className="flex flex-col h-full bg-sidebar/50 border-r border-border/60">
			{/* Tree Header Actions (Side-by-side Language Selector and New Page Button) */}
			<div className="flex items-center justify-between gap-2 p-2.5 border-b border-border/50">
				{/* Workspace Language Switcher */}
				{locales && locales.length > 0 && onSelectLocale ? (
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button
									variant="outline"
									size="sm"
									className="h-7 px-2 text-xs gap-1.5 font-normal border-border/60 bg-background/50 hover:bg-muted cursor-pointer shrink-0"
								/>
							}
							aria-label={`Current language: ${currentLocaleObj.name}`}
						>
							<span className="text-sm leading-none">
								{currentLocaleObj.flag}
							</span>
							<span className="truncate max-w-[85px] font-medium text-[11px] text-foreground">
								{currentLocaleObj.name}
							</span>
							<ChevronDownIcon className="h-3 w-3 opacity-60 shrink-0" />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="w-44">
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
				) : (
					<div />
				)}

				{/* Add Root Document Button */}
				<Button
					variant="ghost"
					size="sm"
					className="h-7 px-2 text-xs gap-1.5 cursor-pointer ml-auto font-medium hover:bg-muted"
					onClick={() => onAddDoc()}
					title="Add root document"
				>
					<FilePlusIcon className="h-3.5 w-3.5 text-primary" />
					<span>New Page</span>
				</Button>
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
						collisionDetection={customCollisionDetection}
						onDragStart={handleDragStart}
						onDragMove={handleDragMove}
						onDragOver={handleDragOver}
						onDragEnd={handleDragEnd}
						onDragCancel={handleDragCancel}
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
									activeDragId={activeDragId}
									hoveredOverId={hoveredOverId}
									dropPosition={dropPosition}
									onSelectDoc={onSelectDoc}
									onAddChild={(parentId) => onAddDoc(parentId)}
									onDeleteDoc={onDeleteDoc}
									onRenameDoc={onRenameDoc}
									onRequestTranslate={(it) => setTranslateItem(it)}
								/>
							))}
						</SortableContext>

						{/* Floating Drag Overlay */}
						<DragOverlay>
							{activeItem ? (
								<div className="flex items-center gap-2 rounded-md bg-background px-2.5 py-1.5 text-xs font-medium text-foreground shadow-lg border border-primary/40 ring-1 ring-primary/20 max-w-56 truncate opacity-95">
									<FileTextIcon className="h-3.5 w-3.5 text-primary shrink-0" />
									<span className="truncate">
										{activeItem.title || "Untitled Document"}
									</span>
								</div>
							) : null}
						</DragOverlay>
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

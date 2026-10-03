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
import {
	CheckIcon,
	ChevronDownIcon,
	ChevronRightIcon,
	FilePlusIcon,
	FilesIcon,
	FileTextIcon,
	GripVerticalIcon,
	PencilIcon,
	PlusIcon,
	Trash2Icon,
} from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DocNavigationManifest, DocTreeItem } from "@/types/domain";

interface DocsTreeProps {
	manifest: DocNavigationManifest;
	selectedDocId: string | null;
	onSelectDoc: (id: string) => void;
	onUpdateManifest: (updated: DocNavigationManifest) => void;
	onAddDoc: (parentId?: string) => void;
	onDeleteDoc: (id: string) => void;
	onRenameDoc?: (id: string, newTitle: string) => void;
}

interface RecursiveTreeItemProps {
	item: DocTreeItem;
	selectedDocId: string | null;
	depth?: number;
	onSelectDoc: (id: string) => void;
	onAddChild: (parentId: string) => void;
	onDeleteDoc: (id: string) => void;
	onRenameDoc?: (id: string, newTitle: string) => void;
}

function RecursiveTreeItem({
	item,
	selectedDocId,
	depth = 0,
	onSelectDoc,
	onAddChild,
	onDeleteDoc,
	onRenameDoc,
}: RecursiveTreeItemProps) {
	const [collapsed, setCollapsed] = React.useState(false);
	const [isEditing, setIsEditing] = React.useState(false);
	const [editTitle, setEditTitle] = React.useState(item.title || "Untitled");
	const inputRef = React.useRef<HTMLInputElement>(null);

	const hasChildren = Boolean(item.children && item.children.length > 0);
	const isSelected = selectedDocId === item.id;

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
					<FileTextIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
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
						onClick={() => onSelectDoc(item.id)}
						onDoubleClick={(e) => {
							e.stopPropagation();
							setIsEditing(true);
						}}
						className="flex-1 truncate text-left select-none"
					>
						<span className="truncate">{item.title || "Untitled"}</span>
					</button>
				)}

				{/* Status & Actions */}
				{!isEditing && (
					<div className="flex items-center gap-0.5 shrink-0">
						{item.status === "draft" && (
							<Badge
								variant="secondary"
								className="px-1 py-0 text-[9px] uppercase font-mono tracking-wider"
							>
								Draft
							</Badge>
						)}

						<div className="opacity-0 group-hover:opacity-100 flex items-center transition-opacity">
							{/* Inline Rename trigger */}
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
					{item.children?.map((child) => (
						<RecursiveTreeItem
							key={child.id}
							item={child}
							selectedDocId={selectedDocId}
							depth={depth + 1}
							onSelectDoc={onSelectDoc}
							onAddChild={onAddChild}
							onDeleteDoc={onDeleteDoc}
							onRenameDoc={onRenameDoc}
						/>
					))}
				</div>
			)}
		</div>
	);
}

export function DocsTree({
	manifest,
	selectedDocId,
	onSelectDoc,
	onUpdateManifest,
	onAddDoc,
	onDeleteDoc,
	onRenameDoc,
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

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		if (!over || active.id === over.id) return;

		const oldIndex = manifest.items.findIndex((i) => i.id === active.id);
		const newIndex = manifest.items.findIndex((i) => i.id === over.id);

		if (oldIndex !== -1 && newIndex !== -1) {
			const reordered = arrayMove(manifest.items, oldIndex, newIndex);
			onUpdateManifest({ ...manifest, items: reordered });
		}
	};

	const itemIds = manifest.items.map((i) => i.id);

	return (
		<div className="flex flex-col h-full bg-sidebar/50 border-r border-border/60">
			{/* Tree Header Actions */}
			<div className="flex items-center justify-between p-3 border-b border-border/50">
				<div className="flex items-center gap-2">
					<FilesIcon className="h-4 w-4 text-primary" />
					<span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
						Documents
					</span>
				</div>
				<Button
					variant="ghost"
					size="sm"
					className="h-7 px-2 text-xs gap-1"
					onClick={() => onAddDoc()}
					title="Add root document"
				>
					<FilePlusIcon className="h-3.5 w-3.5" />
					<span>New Page</span>
				</Button>
			</div>

			{/* Tree List */}
			<div className="flex-1 overflow-y-auto p-2 space-y-1">
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
									onSelectDoc={onSelectDoc}
									onAddChild={(parentId) => onAddDoc(parentId)}
									onDeleteDoc={onDeleteDoc}
									onRenameDoc={onRenameDoc}
								/>
							))}
						</SortableContext>
					</DndContext>
				)}
			</div>
		</div>
	);
}

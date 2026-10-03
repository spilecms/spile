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
	ChevronDownIcon,
	ChevronRightIcon,
	FileTextIcon,
	FolderIcon,
	FolderPlusIcon,
	GripVerticalIcon,
	PlusIcon,
	Trash2Icon,
} from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DocNavigationManifest, DocTreeItem } from "@/types/domain";

interface DocsTreeProps {
	manifest: DocNavigationManifest;
	selectedDocId: string | null;
	onSelectDoc: (id: string) => void;
	onUpdateManifest: (updated: DocNavigationManifest) => void;
	onAddPage: (sectionId: string) => void;
	onAddSection: () => void;
	onDeleteSection: (sectionId: string) => void;
}

function SortableDocItem({
	item,
	isSelected,
	onSelect,
}: {
	item: DocTreeItem;
	isSelected: boolean;
	onSelect: () => void;
}) {
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
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={cn(
				"group flex items-center justify-between gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
				isSelected
					? "bg-accent text-accent-foreground font-semibold"
					: "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
				isDragging && "opacity-50 z-50 bg-accent/50 shadow-md",
			)}
		>
			<button
				type="button"
				aria-label="Reorder document"
				{...attributes}
				{...listeners}
				className="text-muted-foreground/40 hover:text-foreground cursor-grab active:cursor-grabbing p-0.5 rounded"
			>
				<GripVerticalIcon className="h-3 w-3" />
			</button>

			<button
				type="button"
				onClick={onSelect}
				className="flex items-center gap-1.5 min-w-0 flex-1 text-left"
			>
				<FileTextIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
				<span className="truncate">{item.title || "Untitled"}</span>
			</button>

			<div className="flex items-center gap-1">
				{item.status === "draft" && (
					<Badge
						variant="secondary"
						className="px-1.5 py-0 text-[10px] uppercase font-mono tracking-wider"
					>
						Draft
					</Badge>
				)}
			</div>
		</div>
	);
}

export function DocsTree({
	manifest,
	selectedDocId,
	onSelectDoc,
	onUpdateManifest,
	onAddPage,
	onAddSection,
	onDeleteSection,
}: DocsTreeProps) {
	const { t } = useTranslation();
	const [collapsedSections, setCollapsedSections] = React.useState<
		Record<string, boolean>
	>({});

	const toggleCollapse = (sectionId: string) => {
		setCollapsedSections((prev) => ({
			...prev,
			[sectionId]: !prev[sectionId],
		}));
	};

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

	const handleDragEnd = (event: DragEndEvent, sectionId: string) => {
		const { active, over } = event;
		if (!over || active.id === over.id) return;

		const targetSection = manifest.sections.find((s) => s.id === sectionId);
		if (!targetSection) return;

		const oldIndex = targetSection.items.findIndex((i) => i.id === active.id);
		const newIndex = targetSection.items.findIndex((i) => i.id === over.id);

		if (oldIndex !== -1 && newIndex !== -1) {
			const newItems = arrayMove(targetSection.items, oldIndex, newIndex);
			const updatedSections = manifest.sections.map((s) =>
				s.id === sectionId ? { ...s, items: newItems } : s,
			);
			onUpdateManifest({ ...manifest, sections: updatedSections });
		}
	};

	return (
		<div className="flex flex-col h-full bg-sidebar/50 border-r border-border/60">
			{/* Tree Header Actions */}
			<div className="flex items-center justify-between p-3 border-b border-border/50">
				<div className="flex items-center gap-2">
					<FolderIcon className="h-4 w-4 text-primary" />
					<span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
						Navigation Tree
					</span>
				</div>
				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="sm"
						className="h-7 px-2 text-xs gap-1"
						onClick={onAddSection}
						title={t("docs.addSection")}
					>
						<FolderPlusIcon className="h-3.5 w-3.5" />
						<span>Section</span>
					</Button>
				</div>
			</div>

			{/* Tree List */}
			<div className="flex-1 overflow-y-auto p-2 space-y-4">
				{manifest.sections.map((section) => {
					const isCollapsed = Boolean(collapsedSections[section.id]);
					const itemIds = section.items.map((i) => i.id);

					return (
						<div key={section.id} className="space-y-1">
							{/* Section Header */}
							<div className="group flex items-center justify-between px-2 py-1 rounded-md text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
								<button
									type="button"
									onClick={() => toggleCollapse(section.id)}
									className="flex items-center gap-1.5 flex-1 text-left truncate"
								>
									{isCollapsed ? (
										<ChevronRightIcon className="h-3.5 w-3.5 shrink-0" />
									) : (
										<ChevronDownIcon className="h-3.5 w-3.5 shrink-0" />
									)}
									<span className="truncate">{section.title}</span>
								</button>

								<div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
									<Button
										variant="ghost"
										size="icon"
										className="h-6 w-6 text-muted-foreground hover:text-foreground"
										onClick={() => onAddPage(section.id)}
										title={t("docs.addPage")}
									>
										<PlusIcon className="h-3.5 w-3.5" />
									</Button>
									{manifest.sections.length > 1 && (
										<Button
											variant="ghost"
											size="icon"
											className="h-6 w-6 text-muted-foreground hover:text-destructive"
											onClick={() => onDeleteSection(section.id)}
											title={t("docs.deleteSection")}
										>
											<Trash2Icon className="h-3 w-3" />
										</Button>
									)}
								</div>
							</div>

							{/* Sortable Pages inside Section */}
							{!isCollapsed && (
								<div className="pl-3 space-y-0.5">
									{section.items.length === 0 ? (
										<div className="px-2 py-2 text-[11px] text-muted-foreground/60 italic">
											{t("docs.emptySection")}
										</div>
									) : (
										<DndContext
											sensors={sensors}
											collisionDetection={closestCenter}
											onDragEnd={(e) => handleDragEnd(e, section.id)}
										>
											<SortableContext
												items={itemIds}
												strategy={verticalListSortingStrategy}
											>
												{section.items.map((item) => (
													<SortableDocItem
														key={item.id}
														item={item}
														isSelected={selectedDocId === item.id}
														onSelect={() => onSelectDoc(item.id)}
													/>
												))}
											</SortableContext>
										</DndContext>
									)}
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}

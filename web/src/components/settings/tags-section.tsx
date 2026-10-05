import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit2, Plus, Tag as TagIcon, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mockApi } from "@/lib/mock/api";
import type { Tag } from "@/types/domain";

const COLOR_PRESETS = [
	"#3b82f6", // Blue
	"#8b5cf6", // Purple
	"#ec4899", // Pink
	"#10b981", // Emerald
	"#f59e0b", // Amber
	"#06b6d4", // Cyan
	"#ef4444", // Red
	"#64748b", // Slate
];

export function TagsSection() {
	const queryClient = useQueryClient();
	const [dialogOpen, setDialogOpen] = React.useState(false);
	const [editingTag, setEditingTag] = React.useState<Tag | null>(null);
	const [tagName, setTagName] = React.useState("");
	const [tagSlug, setTagSlug] = React.useState("");
	const [tagColor, setTagColor] = React.useState(COLOR_PRESETS[0]);

	const { data: tags, isLoading } = useQuery({
		queryKey: ["tags", "list"],
		queryFn: () => mockApi.tags.list(),
	});

	const saveMutation = useMutation({
		mutationFn: async () => {
			if (editingTag) {
				return mockApi.tags.update(editingTag.id, {
					name: tagName,
					slug: tagSlug,
					color: tagColor,
				});
			}
			return mockApi.tags.create({
				name: tagName,
				slug: tagSlug,
				color: tagColor,
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tags", "list"] });
			toast.success(editingTag ? "Tag updated" : "Tag created");
			handleCloseDialog();
		},
		onError: () => toast.error("Failed to save tag"),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => mockApi.tags.delete(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tags", "list"] });
			toast.success("Tag deleted");
		},
		onError: () => toast.error("Failed to delete tag"),
	});

	const handleOpenCreate = () => {
		setEditingTag(null);
		setTagName("");
		setTagSlug("");
		setTagColor(COLOR_PRESETS[0]);
		setDialogOpen(true);
	};

	const handleOpenEdit = (tag: Tag) => {
		setEditingTag(tag);
		setTagName(tag.name);
		setTagSlug(tag.slug);
		setTagColor(tag.color);
		setDialogOpen(true);
	};

	const handleCloseDialog = () => {
		setDialogOpen(false);
		setEditingTag(null);
		setTagName("");
		setTagSlug("");
	};

	const handleNameChange = (val: string) => {
		setTagName(val);
		if (!editingTag) {
			setTagSlug(
				val
					.toLowerCase()
					.replace(/[^a-z0-9]+/g, "-")
					.replace(/(^-|-$)/g, ""),
			);
		}
	};

	return (
		<div className="flex flex-col gap-6">
			<Card>
				<CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
					<div>
						<CardTitle className="text-base font-semibold flex items-center gap-2">
							<TagIcon className="size-4 text-primary" />
							<span>Post Categories & Tags</span>
						</CardTitle>
						<CardDescription className="text-xs mt-1">
							Manage the taxonomy used to filter and categorize technical
							articles and blog posts.
						</CardDescription>
					</div>
					<Button
						size="sm"
						onClick={handleOpenCreate}
						className="gap-1.5 h-8 text-xs shrink-0"
					>
						<Plus className="size-3.5" />
						<span>New Tag</span>
					</Button>
				</CardHeader>
				<CardContent>
					<div className="rounded-lg border overflow-hidden">
						<table className="w-full text-xs">
							<thead>
								<tr className="border-b bg-muted/40 text-left text-muted-foreground">
									<th className="py-2.5 px-3 font-medium">Tag</th>
									<th className="py-2.5 px-3 font-medium">Slug</th>
									<th className="py-2.5 px-3 font-medium">Posts</th>
									<th className="py-2.5 px-3 text-right font-medium">
										Actions
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border/60">
								{isLoading ? (
									<tr>
										<td
											colSpan={4}
											className="py-6 text-center text-muted-foreground"
										>
											Loading tags…
										</td>
									</tr>
								) : (tags ?? []).length === 0 ? (
									<tr>
										<td
											colSpan={4}
											className="py-6 text-center text-muted-foreground"
										>
											No tags created yet.
										</td>
									</tr>
								) : (
									(tags ?? []).map((tag) => (
										<tr
											key={tag.id}
											className="hover:bg-muted/30 transition-colors"
										>
											<td className="py-2.5 px-3 font-medium">
												<Badge
													variant="outline"
													className="gap-1.5 text-xs font-normal border-border/80"
												>
													<span
														className="size-2 rounded-full shrink-0"
														style={{ backgroundColor: tag.color }}
													/>
													<span>{tag.name}</span>
												</Badge>
											</td>
											<td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">
												/{tag.slug}
											</td>
											<td className="py-2.5 px-3 text-muted-foreground">
												{tag.postCount ?? 0}{" "}
												{tag.postCount === 1 ? "post" : "posts"}
											</td>
											<td className="py-2.5 px-3 text-right">
												<div className="flex items-center justify-end gap-1">
													<Button
														variant="ghost"
														size="icon"
														className="size-7 text-muted-foreground hover:text-foreground"
														onClick={() => handleOpenEdit(tag)}
														title="Edit tag"
													>
														<Edit2 className="size-3.5" />
													</Button>
													<Button
														variant="ghost"
														size="icon"
														className="size-7 text-muted-foreground hover:text-destructive"
														onClick={() => {
															if (window.confirm(`Delete tag "${tag.name}"?`)) {
																deleteMutation.mutate(tag.id);
															}
														}}
														title="Delete tag"
													>
														<Trash2 className="size-3.5" />
													</Button>
												</div>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</CardContent>
			</Card>

			{/* Create / Edit Tag Dialog */}
			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<TagIcon className="size-4 text-primary" />
							<span>{editingTag ? "Edit Tag" : "Create New Tag"}</span>
						</DialogTitle>
						<DialogDescription className="text-xs">
							Tags help organize technical posts and allow readers to filter
							content.
						</DialogDescription>
					</DialogHeader>

					<div className="flex flex-col gap-4 py-2">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="tag-name" className="text-xs">
								Tag Name
							</Label>
							<Input
								id="tag-name"
								placeholder="e.g. Architecture"
								value={tagName}
								onChange={(e) => handleNameChange(e.target.value)}
								className="h-8 text-xs"
							/>
						</div>

						<div className="flex flex-col gap-1.5">
							<Label htmlFor="tag-slug" className="text-xs">
								Slug
							</Label>
							<Input
								id="tag-slug"
								placeholder="e.g. architecture"
								value={tagSlug}
								onChange={(e) => setTagSlug(e.target.value)}
								className="h-8 text-xs font-mono"
							/>
						</div>

						<div className="flex flex-col gap-2">
							<Label className="text-xs">Tag Color</Label>
							<div className="flex items-center gap-2">
								{COLOR_PRESETS.map((color) => {
									const isSelected = tagColor === color;
									return (
										<button
											key={color}
											type="button"
											onClick={() => setTagColor(color)}
											className={`size-6 rounded-full transition-transform ${
												isSelected
													? "scale-125 ring-2 ring-primary ring-offset-2"
													: "hover:scale-110"
											}`}
											style={{ backgroundColor: color }}
											aria-label={`Select ${color}`}
										/>
									);
								})}
							</div>
						</div>
					</div>

					<DialogFooter>
						<Button variant="outline" size="sm" onClick={handleCloseDialog}>
							Cancel
						</Button>
						<Button
							size="sm"
							onClick={() => saveMutation.mutate()}
							disabled={!tagName.trim() || saveMutation.isPending}
						>
							{saveMutation.isPending
								? "Saving…"
								: editingTag
									? "Save Changes"
									: "Create Tag"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

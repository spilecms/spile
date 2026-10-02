import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDownIcon, XIcon } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/format";
import { mockApi } from "@/lib/mock/api";
import { useEditorStore } from "@/lib/store/editor-store";
import type { PostSeo, PostStatus } from "@/types/domain";

export function PublishPanel({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const queryClient = useQueryClient();
	const postId = useEditorStore((s) => s.postId);
	const status = useEditorStore((s) => s.status);
	const slug = useEditorStore((s) => s.slug);
	const excerpt = useEditorStore((s) => s.excerpt);
	const tagIds = useEditorStore((s) => s.tagIds);
	const seo = useEditorStore((s) => s.seo);
	const scheduledFor = useEditorStore((s) => s.scheduledFor);
	const patchMeta = useEditorStore((s) => s.patchMeta);

	const { data: tags } = useQuery({
		queryKey: ["tags", "list"],
		queryFn: () => mockApi.tags.list(),
		enabled: open,
	});

	const [localStatus, setLocalStatus] = React.useState<PostStatus>(status);
	const [localSlug, setLocalSlug] = React.useState(slug);
	const [localExcerpt, setLocalExcerpt] = React.useState(excerpt);
	const [localTagIds, setLocalTagIds] = React.useState<string[]>(tagIds);
	const [scheduleAt, setScheduleAt] = React.useState(() =>
		scheduledFor ? toDateTimeLocal(scheduledFor) : "",
	);
	const [seoTitle, setSeoTitle] = React.useState(seo.metaTitle ?? "");
	const [seoDescription, setSeoDescription] = React.useState(
		seo.metaDescription ?? "",
	);

	React.useEffect(() => {
		if (open) {
			setLocalStatus(status);
			setLocalSlug(slug);
			setLocalExcerpt(excerpt);
			setLocalTagIds(tagIds);
			setScheduleAt(scheduledFor ? toDateTimeLocal(scheduledFor) : "");
			setSeoTitle(seo.metaTitle ?? "");
			setSeoDescription(seo.metaDescription ?? "");
		}
	}, [open, status, slug, excerpt, tagIds, scheduledFor, seo]);

	const handleSave = async () => {
		const seoPatch: PostSeo = {
			metaTitle: seoTitle || undefined,
			metaDescription: seoDescription || undefined,
		};
		patchMeta({
			status: localStatus,
			slug: localSlug,
			excerpt: localExcerpt,
			tagIds: localTagIds,
			scheduledFor:
				localStatus === "scheduled" && scheduleAt
					? new Date(scheduleAt).getTime()
					: null,
			seo: seoPatch,
		});
		if (postId) {
			try {
				await mockApi.posts.update(postId, {
					status: localStatus,
					slug: localSlug,
					excerpt: localExcerpt,
					tagIds: localTagIds,
					scheduledFor:
						localStatus === "scheduled" && scheduleAt
							? new Date(scheduleAt).getTime()
							: null,
					seo: seoPatch,
				});
				await queryClient.invalidateQueries({ queryKey: ["posts"] });
				toast.success(
					localStatus === "published"
						? "Post published"
						: localStatus === "scheduled"
							? "Post scheduled"
							: "Post updated",
				);
			} catch {
				toast.error("Couldn't save post settings");
				return;
			}
		}
		onOpenChange(false);
	};

	const toggleTag = (id: string) => {
		setLocalTagIds((prev) =>
			prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
		);
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="flex w-full flex-col gap-0 sm:max-w-md"
			>
				<SheetHeader>
					<SheetTitle>Post settings</SheetTitle>
					<SheetDescription>
						Status, visibility, and metadata for this post.
					</SheetDescription>
				</SheetHeader>

				<div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 pb-4">
					<div className="flex flex-col gap-2">
						<Label htmlFor="publish-status">Status</Label>
						<Select
							value={localStatus}
							onValueChange={(value) => setLocalStatus(value as PostStatus)}
						>
							<SelectTrigger id="publish-status" className="w-full">
								<SelectValue placeholder="Select a status" />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									<SelectItem value="draft">Draft</SelectItem>
									<SelectItem value="published">Published</SelectItem>
									<SelectItem value="scheduled">Scheduled</SelectItem>
								</SelectGroup>
							</SelectContent>
						</Select>
					</div>

					{localStatus === "scheduled" && (
						<div className="flex flex-col gap-2">
							<Label htmlFor="publish-schedule">Publish at</Label>
							<Input
								id="publish-schedule"
								type="datetime-local"
								value={scheduleAt}
								onChange={(e) => setScheduleAt(e.target.value)}
							/>
						</div>
					)}

					<div className="flex flex-col gap-2">
						<Label htmlFor="publish-slug">Slug</Label>
						<div className="flex items-center gap-1">
							<span className="text-xs text-muted-foreground">/</span>
							<Input
								id="publish-slug"
								value={localSlug}
								onChange={(e) => {
									const val = e.target.value
										.toLowerCase()
										.replace(/\s+/g, "-")
										.replace(/[^a-z0-9-]/g, "");
									setLocalSlug(val);
								}}
								onBlur={() => setLocalSlug(slugify(localSlug))}
								placeholder="post-url-slug"
							/>
						</div>
						{!localSlug && (
							<p className="text-xs text-muted-foreground">
								Slug is empty. Type a title in the editor to generate one.
							</p>
						)}
					</div>

					<div className="flex flex-col gap-2">
						<Label htmlFor="publish-excerpt">Excerpt</Label>
						<Textarea
							id="publish-excerpt"
							value={localExcerpt}
							onChange={(e) => setLocalExcerpt(e.target.value)}
							placeholder="A short summary shown in post lists and search results…"
							className="min-h-20"
						/>
					</div>

					<div className="flex flex-col gap-2">
						<Label>Tags</Label>
						<div className="flex flex-wrap gap-1.5">
							{(tags ?? []).map((tag) => {
								const selected = localTagIds.includes(tag.id);
								return (
									<button
										key={tag.id}
										type="button"
										onClick={() => toggleTag(tag.id)}
										className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
									>
										<Badge
											variant={selected ? "default" : "outline"}
											className="cursor-pointer gap-1"
										>
											<span
												className="size-2 rounded-full"
												style={{ backgroundColor: tag.color }}
												aria-hidden
											/>
											{tag.name}
											{selected && <XIcon className="size-3!" />}
										</Badge>
									</button>
								);
							})}
							{(tags ?? []).length === 0 && (
								<p className="text-xs text-muted-foreground">No tags yet.</p>
							)}
						</div>
					</div>

					<Collapsible>
						<CollapsibleTrigger
							render={
								<Button
									variant="ghost"
									size="sm"
									className="flex w-full items-center justify-between px-2"
								/>
							}
						>
							<span className="font-medium">SEO</span>
							<ChevronDownIcon className="size-4" />
						</CollapsibleTrigger>
						<CollapsibleContent className="flex flex-col gap-3 pt-3">
							<div className="flex flex-col gap-2">
								<Label htmlFor="seo-title">Meta title</Label>
								<Input
									id="seo-title"
									value={seoTitle}
									onChange={(e) => setSeoTitle(e.target.value)}
									placeholder="Defaults to the post title"
								/>
								<p className="text-xs text-muted-foreground">
									{seoTitle.length}/60 characters
								</p>
							</div>
							<div className="flex flex-col gap-2">
								<Label htmlFor="seo-description">Meta description</Label>
								<Textarea
									id="seo-description"
									value={seoDescription}
									onChange={(e) => setSeoDescription(e.target.value)}
									placeholder="Defaults to the post excerpt"
									className="min-h-16"
								/>
								<p className="text-xs text-muted-foreground">
									{seoDescription.length}/160 characters
								</p>
							</div>
						</CollapsibleContent>
					</Collapsible>
				</div>

				<SheetFooter>
					<Button onClick={handleSave}>
						{localStatus === "published"
							? "Publish"
							: localStatus === "scheduled"
								? "Schedule"
								: "Save"}
					</Button>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}

function toDateTimeLocal(timestamp: number): string {
	const d = new Date(timestamp);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

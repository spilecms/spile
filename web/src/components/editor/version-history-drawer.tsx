import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, History, RotateCcw, User } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { mockApi } from "@/lib/mock/api";
import { useEditorStore } from "@/lib/store/editor-store";
import type { ContentRevision } from "@/types/domain";

interface VersionHistoryDrawerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	targetType: "post" | "doc";
	targetId: string;
	currentTitle: string;
	onRestored?: () => void;
}

function timeAgo(timestamp: number): string {
	const diff = Date.now() - timestamp;
	const minutes = Math.floor(diff / 60000);
	if (minutes < 1) return "just now";
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}

function getStatusBadge(status: ContentRevision["status"]) {
	switch (status) {
		case "published":
			return (
				<Badge
					variant="outline"
					className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]"
				>
					Published
				</Badge>
			);
		case "in_review":
			return (
				<Badge
					variant="outline"
					className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px]"
				>
					In Review
				</Badge>
			);
		case "changes_requested":
			return (
				<Badge
					variant="outline"
					className="bg-rose-500/10 text-rose-500 border-rose-500/20 text-[10px]"
				>
					Needs Changes
				</Badge>
			);
		default:
			return (
				<Badge
					variant="outline"
					className="bg-muted text-muted-foreground text-[10px]"
				>
					Draft
				</Badge>
			);
	}
}

export function VersionHistoryDrawer({
	open,
	onOpenChange,
	targetType,
	targetId,
	onRestored,
}: VersionHistoryDrawerProps) {
	const qc = useQueryClient();

	const { data: revisions = [] } = useQuery({
		queryKey: ["revisions", targetId],
		queryFn: () => mockApi.revisions.list(targetType, targetId),
		enabled: open,
	});

	const restoreMutation = useMutation({
		mutationFn: async (rev: ContentRevision) => {
			await mockApi.revisions.restore(rev.id);
			const renderContent = useEditorStore.getState().renderContent;
			if (rev.content) {
				if (renderContent) {
					await renderContent(rev.content);
				} else {
					useEditorStore.getState().setBlocks(rev.content);
				}
			}
			if (rev.title) {
				useEditorStore.getState().setTitle(rev.title);
			}
			return rev;
		},
		onSuccess: (rev) => {
			qc.invalidateQueries({ queryKey: ["posts", targetId] });
			qc.invalidateQueries({ queryKey: ["docs", targetId] });
			qc.invalidateQueries({ queryKey: ["revisions", targetId] });
			toast.success(`Restored to ${rev.versionLabel}`);
			onOpenChange(false);
			onRestored?.();
		},
		onError: () => {
			toast.error("Failed to restore revision");
		},
	});

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="w-full sm:max-w-md p-0 flex flex-col"
			>
				<SheetHeader className="p-4 border-b">
					<SheetTitle className="flex items-center gap-2 text-base">
						<History className="size-4 text-primary" />
						Version History
					</SheetTitle>
					<SheetDescription className="text-xs">
						Inspect past document snapshots and rollback changes anytime.
					</SheetDescription>
				</SheetHeader>

				<div className="flex-1 overflow-y-auto divide-y divide-border/50">
					{revisions.length === 0 ? (
						<div className="p-8 text-center text-xs text-muted-foreground">
							No historical revisions recorded yet.
						</div>
					) : (
						revisions.map((rev, index) => {
							const isLatest = index === 0;
							return (
								<div
									key={rev.id}
									className="p-4 space-y-2 hover:bg-muted/20 transition-colors"
								>
									<div className="flex items-center justify-between gap-2">
										<div className="flex items-center gap-2">
											<span className="font-mono text-xs font-bold text-foreground">
												{rev.versionLabel}
											</span>
											{getStatusBadge(rev.status)}
											{isLatest && (
												<span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
													Current
												</span>
											)}
										</div>
										<span className="text-[10px] text-muted-foreground flex items-center gap-1">
											<Clock className="size-3" />
											{timeAgo(rev.createdAt)}
										</span>
									</div>

									<p className="text-xs text-foreground font-medium">
										{rev.summary || "Snapshot saved"}
									</p>

									<div className="flex items-center justify-between pt-1">
										<span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
											<User className="size-3 text-muted-foreground/70" />
											{rev.authorName}
										</span>

										{!isLatest && (
											<Button
												variant="outline"
												size="sm"
												onClick={() => restoreMutation.mutate(rev)}
												disabled={restoreMutation.isPending}
												className="h-7 gap-1 text-[11px]"
											>
												<RotateCcw className="size-3" />
												Restore
											</Button>
										)}
									</div>
								</div>
							);
						})
					)}
				</div>
			</SheetContent>
		</Sheet>
	);
}

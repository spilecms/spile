import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	AlertCircle,
	Bell,
	CheckCircle2,
	Clock,
	FileText,
	XCircle,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { mockApi } from "@/lib/mock/api";
import type { Notification } from "@/types/domain";

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

function getNotificationIcon(type: Notification["type"]) {
	switch (type) {
		case "review_requested":
			return <Clock className="size-4 text-amber-500 shrink-0" />;
		case "review_approved":
			return <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />;
		case "changes_requested":
			return <AlertCircle className="size-4 text-rose-500 shrink-0" />;
		case "review_withdrawn":
			return <XCircle className="size-4 text-zinc-500 shrink-0" />;
		default:
			return <FileText className="size-4 text-blue-500 shrink-0" />;
	}
}

export function NotificationsPopover() {
	const [open, setOpen] = useState(false);
	const navigate = useNavigate();
	const qc = useQueryClient();

	const { data: notifications = [] } = useQuery({
		queryKey: ["notifications"],
		queryFn: () => mockApi.notifications.list(),
	});

	const unreadCount = notifications.filter((n) => !n.read).length;

	const markReadMutation = useMutation({
		mutationFn: (id: string) => mockApi.notifications.markAsRead(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["notifications"] });
		},
	});

	const markAllMutation = useMutation({
		mutationFn: () => mockApi.notifications.markAllAsRead(),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["notifications"] });
		},
	});

	const handleItemClick = (n: Notification) => {
		if (!n.read) {
			markReadMutation.mutate(n.id);
		}
		setOpen(false);

		// Deep-link into editor with review param
		const reviewParam = n.reviewId ? `?review=${n.reviewId}` : "";
		if (n.targetType === "post") {
			navigate(`/editor/${n.targetId}${reviewParam}`);
		} else {
			navigate(`/editor/doc/${n.targetId}${reviewParam}`);
		}
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						className="relative size-8 rounded-md"
						aria-label="Notifications"
					>
						<Bell className="size-4" />
						{unreadCount > 0 && (
							<span className="absolute top-1 right-1 flex size-2">
								<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
								<span className="relative inline-flex size-2 rounded-full bg-rose-500" />
							</span>
						)}
					</Button>
				}
			/>
			<PopoverContent align="end" className="w-80 p-0 shadow-lg">
				<div className="flex items-center justify-between border-b px-4 py-2.5">
					<div className="flex items-center gap-1.5 font-semibold text-xs">
						<span>Notifications</span>
						{unreadCount > 0 && (
							<span className="rounded-full bg-rose-500/15 px-1.5 py-0.2 font-mono text-[10px] text-rose-500">
								{unreadCount}
							</span>
						)}
					</div>
					{unreadCount > 0 && (
						<button
							type="button"
							onClick={() => markAllMutation.mutate()}
							className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
						>
							Mark all as read
						</button>
					)}
				</div>

				<div className="max-h-72 overflow-y-auto divide-y divide-border/40">
					{notifications.length === 0 ? (
						<div className="p-6 text-center text-xs text-muted-foreground">
							No notifications yet
						</div>
					) : (
						notifications.map((item) => (
							<button
								key={item.id}
								type="button"
								onClick={() => handleItemClick(item)}
								className={`flex w-full items-start gap-2.5 p-3 text-left transition-colors hover:bg-muted/50 ${
									!item.read ? "bg-muted/20" : ""
								}`}
							>
								{getNotificationIcon(item.type)}
								<div className="flex-1 min-w-0">
									<div className="flex items-center justify-between gap-1">
										<p
											className={`text-xs truncate ${!item.read ? "font-semibold text-foreground" : "font-medium text-muted-foreground"}`}
										>
											{item.title}
										</p>
										<span className="text-[10px] text-muted-foreground/70 shrink-0">
											{timeAgo(item.createdAt)}
										</span>
									</div>
									<p className="line-clamp-2 text-[11px] text-muted-foreground mt-0.5">
										{item.message}
									</p>
								</div>
								{!item.read && (
									<span className="size-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
								)}
							</button>
						))
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}

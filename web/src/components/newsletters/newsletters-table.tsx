import {
	CopyIcon,
	EllipsisVerticalIcon,
	EyeIcon,
	FileEditIcon,
	MailIcon,
	MousePointerClickIcon,
	SendIcon,
	Trash2Icon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { formatDateTime, formatNumber, formatRelativeTime } from "@/lib/format";
import type { Newsletter, NewsletterStatus } from "@/types/domain";

export function newsletterBadge(status: NewsletterStatus) {
	switch (status) {
		case "sent":
			return (
				<Badge
					variant="outline"
					className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-normal"
				>
					Sent
				</Badge>
			);
		case "scheduled":
			return (
				<Badge
					variant="outline"
					className="border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-normal"
				>
					Scheduled
				</Badge>
			);
		case "sending":
			return (
				<Badge
					variant="outline"
					className="border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-normal"
				>
					Sending...
				</Badge>
			);
		case "draft":
			return (
				<Badge
					variant="outline"
					className="border-zinc-500/20 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 font-normal"
				>
					Draft
				</Badge>
			);
	}
}

interface NewslettersTableProps {
	data: Newsletter[];
	activeSubscriberCount: number;
	onSendTest: (nl: Newsletter) => void;
	onSendBroadcast: (nl: Newsletter) => void;
	onDuplicate: (id: string) => void;
	onDelete: (id: string) => void;
}

export function NewslettersTable({
	data,
	activeSubscriberCount,
	onSendTest,
	onSendBroadcast,
	onDuplicate,
	onDelete,
}: NewslettersTableProps) {
	const navigate = useNavigate();

	return (
		<div className="rounded-lg border bg-card shadow-xs overflow-hidden">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Campaign & Subject</TableHead>
						<TableHead className="w-28">Status</TableHead>
						<TableHead className="w-44">Audience & Date</TableHead>
						<TableHead className="w-48">Opens & Clicks</TableHead>
						<TableHead className="w-12 text-right" />
					</TableRow>
				</TableHeader>
				<TableBody>
					{data.map((nl) => {
						const openPct =
							nl.deliveredCount > 0
								? Math.round((nl.openedCount / nl.deliveredCount) * 100)
								: 0;
						const clickPct =
							nl.deliveredCount > 0
								? Math.round((nl.clickedCount / nl.deliveredCount) * 100)
								: 0;

						return (
							<TableRow
								key={nl.id}
								className="group cursor-pointer hover:bg-muted/50 transition-colors"
								onClick={() => navigate(`/editor/newsletter/${nl.id}`)}
							>
								<TableCell>
									<button
										type="button"
										className="flex max-w-md flex-col items-start gap-0.5 text-left"
										onClick={(e) => {
											e.stopPropagation();
											navigate(`/editor/newsletter/${nl.id}`);
										}}
									>
										<span className="font-medium text-sm text-foreground line-clamp-1 hover:underline">
											{nl.subject}
										</span>
										<div className="flex items-center gap-2 text-xs text-muted-foreground">
											<span className="font-mono text-[11px] font-medium text-foreground/80">
												{nl.title}
											</span>
											{nl.previewText && (
												<>
													<span>•</span>
													<span className="line-clamp-1 italic">
														{nl.previewText}
													</span>
												</>
											)}
										</div>
									</button>
								</TableCell>
								<TableCell>{newsletterBadge(nl.status)}</TableCell>
								<TableCell>
									<div className="flex flex-col text-xs text-muted-foreground">
										{nl.status === "sent" ? (
											<>
												<span className="font-medium text-foreground">
													{formatNumber(nl.deliveredCount)} recipients
												</span>
												<span>
													Sent{" "}
													{nl.sentAt
														? formatRelativeTime(nl.sentAt)
														: "recently"}
												</span>
											</>
										) : nl.status === "scheduled" && nl.scheduledFor ? (
											<>
												<span className="text-blue-600 dark:text-blue-400 font-medium">
													Scheduled
												</span>
												<span>{formatDateTime(nl.scheduledFor)}</span>
											</>
										) : (
											<>
												<span>Audience: ~{activeSubscriberCount} members</span>
												<span>Updated {formatRelativeTime(nl.updatedAt)}</span>
											</>
										)}
									</div>
								</TableCell>
								<TableCell>
									{nl.status === "sent" ? (
										<div className="flex items-center gap-4 text-xs">
											<div
												className="flex items-center gap-1.5"
												title="Open rate"
											>
												<EyeIcon className="size-3.5 text-muted-foreground" />
												<span className="font-medium font-mono text-foreground">
													{openPct}%
												</span>
												<span className="text-muted-foreground text-[11px]">
													({formatNumber(nl.openedCount)})
												</span>
											</div>
											<div
												className="flex items-center gap-1.5"
												title="Click rate"
											>
												<MousePointerClickIcon className="size-3.5 text-muted-foreground" />
												<span className="font-medium font-mono text-foreground">
													{clickPct}%
												</span>
												<span className="text-muted-foreground text-[11px]">
													({formatNumber(nl.clickedCount)})
												</span>
											</div>
										</div>
									) : (
										<span className="text-xs text-muted-foreground">—</span>
									)}
								</TableCell>
								<TableCell
									className="text-right"
									onClick={(e) => e.stopPropagation()}
								>
									<DropdownMenu>
										<DropdownMenuTrigger
											render={
												<Button
													variant="ghost"
													size="icon"
													className="size-7 text-muted-foreground"
												/>
											}
										>
											<EllipsisVerticalIcon className="size-4" />
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end" className="w-44">
											<DropdownMenuItem
												onClick={() => navigate(`/editor/newsletter/${nl.id}`)}
											>
												<FileEditIcon className="size-3.5 mr-2" />
												Edit issue
											</DropdownMenuItem>
											<DropdownMenuItem onClick={() => onSendTest(nl)}>
												<MailIcon className="size-3.5 mr-2" />
												Send test email
											</DropdownMenuItem>
											{nl.status !== "sent" && (
												<DropdownMenuItem
													onClick={() => onSendBroadcast(nl)}
													className="text-emerald-600 dark:text-emerald-400 font-medium"
												>
													<SendIcon className="size-3.5 mr-2" />
													Send broadcast now
												</DropdownMenuItem>
											)}
											<DropdownMenuItem onClick={() => onDuplicate(nl.id)}>
												<CopyIcon className="size-3.5 mr-2" />
												Duplicate
											</DropdownMenuItem>
											<DropdownMenuSeparator />
											<DropdownMenuItem
												variant="destructive"
												onClick={() => onDelete(nl.id)}
											>
												<Trash2Icon className="size-3.5 mr-2" />
												Delete
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</div>
	);
}

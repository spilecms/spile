import { PlusCircleIcon } from "@heroicons/react/24/solid";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	CopyIcon,
	EllipsisVerticalIcon,
	EyeIcon,
	FileEditIcon,
	MailIcon,
	MousePointerClickIcon,
	PlusIcon,
	SearchIcon,
	SendIcon,
	Trash2Icon,
} from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { EmptyState } from "@/components/dashboard/empty-state";
import { HeaderActions } from "@/components/dashboard/header-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateTime, formatNumber, formatRelativeTime } from "@/lib/format";
import { mockApi } from "@/lib/mock/api";
import type { Newsletter, NewsletterStatus } from "@/types/domain";

const STATUS_TABS: { value: NewsletterStatus | "all"; label: string }[] = [
	{ value: "all", label: "All Campaigns" },
	{ value: "draft", label: "Drafts" },
	{ value: "scheduled", label: "Scheduled" },
	{ value: "sent", label: "Sent" },
];

function newsletterBadge(status: NewsletterStatus) {
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

export default function NewslettersPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [status, setStatus] = React.useState<NewsletterStatus | "all">("all");
	const [query, setQuery] = React.useState("");
	const [debouncedQuery, setDebouncedQuery] = React.useState("");

	// Modals
	const [isCreateOpen, setIsCreateOpen] = React.useState(false);
	const [testTargetNl, setTestTargetNl] = React.useState<Newsletter | null>(
		null,
	);
	const [testEmail, setTestEmail] = React.useState("");
	const [sendConfirmNl, setSendConfirmNl] = React.useState<Newsletter | null>(
		null,
	);

	// New Issue form
	const [newSubject, setNewSubject] = React.useState("");
	const [newTitle, setNewTitle] = React.useState("");
	const [newPreviewText, setNewPreviewText] = React.useState("");

	React.useEffect(() => {
		const timer = setTimeout(() => setDebouncedQuery(query), 200);
		return () => clearTimeout(timer);
	}, [query]);

	const { data: newsletters = [], isPending } = useQuery({
		queryKey: ["newsletters", { status, query: debouncedQuery }],
		queryFn: () =>
			mockApi.newsletters.list({
				status,
				query: debouncedQuery || undefined,
			}),
	});

	const { data: allNewsletters = [] } = useQuery({
		queryKey: ["newsletters", "all"],
		queryFn: () => mockApi.newsletters.list({ status: "all" }),
	});

	const { data: members = [] } = useQuery({
		queryKey: ["members", "all"],
		queryFn: () => mockApi.members.list({ status: "all" }),
	});

	const activeSubscriberCount = React.useMemo(() => {
		return members.filter((m) => m.status === "active").length;
	}, [members]);

	const counts = React.useMemo(() => {
		const map: Record<string, number> = { all: allNewsletters.length };
		for (const n of allNewsletters) {
			map[n.status] = (map[n.status] || 0) + 1;
		}
		return map;
	}, [allNewsletters]);

	const stats = React.useMemo(() => {
		const sentIssues = allNewsletters.filter((n) => n.status === "sent");
		const totalSent = sentIssues.length;
		const totalDelivered = sentIssues.reduce(
			(acc, curr) => acc + curr.deliveredCount,
			0,
		);
		const totalOpened = sentIssues.reduce(
			(acc, curr) => acc + curr.openedCount,
			0,
		);
		const avgOpenRate = totalDelivered
			? Math.round((totalOpened / totalDelivered) * 100)
			: 0;

		return {
			totalSent,
			totalDelivered,
			avgOpenRate,
			draftCount: allNewsletters.filter((n) => n.status === "draft").length,
		};
	}, [allNewsletters]);

	const createMutation = useMutation({
		mutationFn: (data: {
			title: string;
			subject: string;
			previewText?: string;
		}) => mockApi.newsletters.create(data),
		onSuccess: (created) => {
			queryClient.invalidateQueries({ queryKey: ["newsletters"] });
			toast.success("Newsletter draft created");
			setIsCreateOpen(false);
			navigate(`/editor/newsletter/${created.id}`);
		},
		onError: () => toast.error("Failed to create newsletter"),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => mockApi.newsletters.remove(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["newsletters"] });
			toast.success("Newsletter removed");
		},
		onError: () => toast.error("Failed to remove newsletter"),
	});

	const duplicateMutation = useMutation({
		mutationFn: (id: string) => mockApi.newsletters.duplicate(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["newsletters"] });
			toast.success("Newsletter duplicated");
		},
		onError: () => toast.error("Failed to duplicate"),
	});

	const sendMutation = useMutation({
		mutationFn: (id: string) => mockApi.newsletters.send(id),
		onSuccess: (updated) => {
			queryClient.invalidateQueries({ queryKey: ["newsletters"] });
			toast.success(
				`Broadcast sent to ${updated.recipientsCount} subscribers!`,
			);
			setSendConfirmNl(null);
		},
		onError: () => toast.error("Failed to send broadcast"),
	});

	const handleSendTest = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!testTargetNl || !testEmail.trim()) {
			toast.error("Please enter a test email address");
			return;
		}
		try {
			const res = await mockApi.newsletters.sendTest(
				testTargetNl.id,
				testEmail.trim(),
			);
			toast.success(res.message);
			setTestTargetNl(null);
			setTestEmail("");
		} catch {
			toast.error("Failed to send test email");
		}
	};

	return (
		<div className="flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
			{/* Top Bar Action mounted into SiteHeader */}
			<HeaderActions>
				<Button
					size="sm"
					onClick={() => navigate("/editor/newsletter/new")}
					className="flex items-center gap-2 text-sm font-semibold"
				>
					<PlusCircleIcon className="size-4" />
					New Issue
				</Button>
			</HeaderActions>

			{/* Metric Stat Cards */}
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<Card className="shadow-xs">
					<CardContent className="p-4">
						<p className="text-xs font-medium text-muted-foreground">
							Broadcasts Sent
						</p>
						<p className="mt-1 text-2xl font-bold">{stats.totalSent}</p>
					</CardContent>
				</Card>
				<Card className="shadow-xs">
					<CardContent className="p-4">
						<p className="text-xs font-medium text-muted-foreground">
							Average Open Rate
						</p>
						<p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
							{stats.avgOpenRate}%
						</p>
					</CardContent>
				</Card>
				<Card className="shadow-xs">
					<CardContent className="p-4">
						<p className="text-xs font-medium text-muted-foreground">
							Emails Delivered
						</p>
						<p className="mt-1 text-2xl font-bold text-primary">
							{formatNumber(stats.totalDelivered)}
						</p>
					</CardContent>
				</Card>
				<Card className="shadow-xs">
					<CardContent className="p-4">
						<p className="text-xs font-medium text-muted-foreground">
							Active Drafts
						</p>
						<p className="mt-1 text-2xl font-bold text-muted-foreground">
							{stats.draftCount}
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Filter Tabs & Search */}
			<Tabs
				value={status}
				onValueChange={(v) => setStatus(v as NewsletterStatus | "all")}
				className="w-full space-y-4"
			>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<TabsList className="flex flex-wrap">
						{STATUS_TABS.map((tab) => (
							<TabsTrigger
								key={tab.value}
								value={tab.value}
								className="gap-1.5"
							>
								<span>{tab.label}</span>
								<span className="rounded-full bg-muted-foreground/15 px-1.5 py-0.2 text-[10px] font-medium text-muted-foreground">
									{counts[tab.value] ?? 0}
								</span>
							</TabsTrigger>
						))}
					</TabsList>

					<div className="relative w-full sm:w-64">
						<SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Search by subject or title..."
							className="pl-8 text-sm"
						/>
					</div>
				</div>

				{/* Newsletters Table */}
				{isPending ? (
					<div className="flex flex-col gap-2">
						{["n1", "n2", "n3"].map((k) => (
							<Skeleton key={k} className="h-16 w-full" />
						))}
					</div>
				) : newsletters.length === 0 ? (
					<EmptyState
						icon={MailIcon}
						title="No newsletter issues found"
						description={
							query
								? `No campaigns match "${query}". Try adjusting your search.`
								: "Start writing your first email broadcast for your audience."
						}
						action={
							<Button
								size="sm"
								onClick={() => navigate("/editor/newsletter/new")}
								className="gap-1.5"
							>
								<PlusIcon className="size-3.5" />
								New Issue
							</Button>
						}
					/>
				) : (
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
								{newsletters.map((nl) => {
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
															<span>
																Audience: ~{activeSubscriberCount} members
															</span>
															<span>
																Updated {formatRelativeTime(nl.updatedAt)}
															</span>
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
													<span className="text-xs text-muted-foreground">
														—
													</span>
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
															onClick={() =>
																navigate(`/editor/newsletter/${nl.id}`)
															}
														>
															<FileEditIcon className="size-3.5 mr-2" />
															Edit issue
														</DropdownMenuItem>
														<DropdownMenuItem
															onClick={() => setTestTargetNl(nl)}
														>
															<MailIcon className="size-3.5 mr-2" />
															Send test email
														</DropdownMenuItem>
														{nl.status !== "sent" && (
															<DropdownMenuItem
																onClick={() => setSendConfirmNl(nl)}
																className="text-emerald-600 dark:text-emerald-400 font-medium"
															>
																<SendIcon className="size-3.5 mr-2" />
																Send broadcast now
															</DropdownMenuItem>
														)}
														<DropdownMenuItem
															onClick={() => duplicateMutation.mutate(nl.id)}
														>
															<CopyIcon className="size-3.5 mr-2" />
															Duplicate
														</DropdownMenuItem>
														<DropdownMenuSeparator />
														<DropdownMenuItem
															variant="destructive"
															onClick={() => deleteMutation.mutate(nl.id)}
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
				)}
			</Tabs>

			{/* Create Newsletter Issue Dialog (optional fallback modal) */}
			<Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>New Newsletter Issue</DialogTitle>
						<DialogDescription>
							Draft a new email dispatch to broadcast to your subscriber list.
						</DialogDescription>
					</DialogHeader>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							if (!newSubject.trim()) {
								toast.error("Subject line is required");
								return;
							}
							createMutation.mutate({
								title: newTitle.trim() || newSubject.trim(),
								subject: newSubject.trim(),
								previewText: newPreviewText.trim() || undefined,
							});
						}}
						className="space-y-4 py-2"
					>
						<div className="space-y-1.5">
							<Label htmlFor="subject">Subject line *</Label>
							<Input
								id="subject"
								placeholder="e.g. Spile v2.0 is here: A new chapter in publishing"
								value={newSubject}
								onChange={(e) => setNewSubject(e.target.value)}
								required
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="preview">Preview text (Preheader)</Label>
							<Input
								id="preview"
								placeholder="e.g. A quick look at what's new and our roadmap ahead..."
								value={newPreviewText}
								onChange={(e) => setNewPreviewText(e.target.value)}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="title">Internal campaign title</Label>
							<Input
								id="title"
								placeholder="e.g. Product Update #24"
								value={newTitle}
								onChange={(e) => setNewTitle(e.target.value)}
							/>
						</div>
						<DialogFooter className="pt-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => setIsCreateOpen(false)}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={createMutation.isPending}>
								{createMutation.isPending ? "Creating..." : "Create Draft"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			{/* Send Test Email Dialog */}
			<Dialog
				open={Boolean(testTargetNl)}
				onOpenChange={(open) => !open && setTestTargetNl(null)}
			>
				{testTargetNl && (
					<DialogContent className="sm:max-w-md">
						<DialogHeader>
							<DialogTitle>Send Test Preview</DialogTitle>
							<DialogDescription>
								Send a test copy of "{testTargetNl.subject}" to your personal
								inbox to inspect formatting.
							</DialogDescription>
						</DialogHeader>
						<form onSubmit={handleSendTest} className="space-y-4 py-2">
							<div className="space-y-1.5">
								<Label htmlFor="test-email">Recipient email address</Label>
								<Input
									id="test-email"
									type="email"
									placeholder="your-email@example.com"
									value={testEmail}
									onChange={(e) => setTestEmail(e.target.value)}
									required
								/>
							</div>
							<DialogFooter className="pt-2">
								<Button
									type="button"
									variant="outline"
									onClick={() => setTestTargetNl(null)}
								>
									Cancel
								</Button>
								<Button type="submit" className="gap-1.5">
									<SendIcon className="size-3.5" />
									Send Test Email
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				)}
			</Dialog>

			{/* Send Broadcast Confirmation Dialog */}
			<Dialog
				open={Boolean(sendConfirmNl)}
				onOpenChange={(open) => !open && setSendConfirmNl(null)}
			>
				{sendConfirmNl && (
					<DialogContent className="sm:max-w-md">
						<DialogHeader>
							<DialogTitle className="flex items-center gap-2 text-primary">
								<SendIcon className="size-5" />
								Broadcast to Audience
							</DialogTitle>
							<DialogDescription className="space-y-2 pt-2">
								<p>
									You are about to broadcast{" "}
									<strong>"{sendConfirmNl.subject}"</strong> to{" "}
									<span className="font-semibold text-foreground">
										{activeSubscriberCount} active subscribers
									</span>
									.
								</p>
								<p className="text-amber-600 dark:text-amber-400 text-xs font-medium">
									Warning: Once dispatched, email delivery cannot be undone.
								</p>
							</DialogDescription>
						</DialogHeader>
						<DialogFooter className="pt-3">
							<Button
								type="button"
								variant="outline"
								onClick={() => setSendConfirmNl(null)}
							>
								Cancel
							</Button>
							<Button
								onClick={() => sendMutation.mutate(sendConfirmNl.id)}
								disabled={sendMutation.isPending}
								className="gap-1.5"
							>
								<SendIcon className="size-3.5" />
								{sendMutation.isPending
									? "Broadcasting..."
									: `Send to ${activeSubscriberCount} Members`}
							</Button>
						</DialogFooter>
					</DialogContent>
				)}
			</Dialog>
		</div>
	);
}

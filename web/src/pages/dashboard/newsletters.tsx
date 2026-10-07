import { PlusCircleIcon } from "@heroicons/react/24/solid";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	MailIcon,
	MousePointerClickIcon,
	PlusIcon,
	SearchIcon,
	SendIcon,
} from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { EmptyState } from "@/components/dashboard/empty-state";
import { HeaderActions } from "@/components/dashboard/header-actions";
import { CreateNewsletterDialog } from "@/components/newsletters/create-newsletter-dialog";
import { NewslettersTable } from "@/components/newsletters/newsletters-table";
import {
	BroadcastConfirmDialog,
	SendTestDialog,
} from "@/components/newsletters/send-newsletter-dialogs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatNumber } from "@/lib/format";
import { mockApi } from "@/lib/mock/api";
import type { Newsletter, NewsletterStatus } from "@/types/domain";

const STATUS_TABS: { value: NewsletterStatus | "all"; label: string }[] = [
	{ value: "all", label: "All Campaigns" },
	{ value: "draft", label: "Drafts" },
	{ value: "scheduled", label: "Scheduled" },
	{ value: "sent", label: "Sent" },
];

export default function NewslettersPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [status, setStatus] = React.useState<NewsletterStatus | "all">("all");
	const [query, setQuery] = React.useState("");
	const [debouncedQuery, setDebouncedQuery] = React.useState("");

	// Modals state
	const [isCreateOpen, setIsCreateOpen] = React.useState(false);
	const [testTargetNl, setTestTargetNl] = React.useState<Newsletter | null>(
		null,
	);
	const [sendConfirmNl, setSendConfirmNl] = React.useState<Newsletter | null>(
		null,
	);

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

	const handleSendTest = async (email: string) => {
		if (!testTargetNl) return;
		try {
			const res = await mockApi.newsletters.sendTest(testTargetNl.id, email);
			toast.success(res.message);
			setTestTargetNl(null);
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
					className="flex items-center gap-2 text-sm font-semibold"
					onClick={() => setIsCreateOpen(true)}
				>
					<PlusCircleIcon className="size-4" />
					New Issue
				</Button>
			</HeaderActions>

			{/* KPI Performance Highlights */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<Card className="shadow-xs border bg-card/50">
					<CardContent className="p-4 flex items-center justify-between">
						<div>
							<p className="text-xs font-medium text-muted-foreground">
								Subscribers
							</p>
							<h3 className="text-2xl font-bold tracking-tight mt-1">
								{formatNumber(activeSubscriberCount)}
							</h3>
						</div>
						<div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
							<MailIcon className="size-4.5" />
						</div>
					</CardContent>
				</Card>

				<Card className="shadow-xs border bg-card/50">
					<CardContent className="p-4 flex items-center justify-between">
						<div>
							<p className="text-xs font-medium text-muted-foreground">
								Campaigns Sent
							</p>
							<h3 className="text-2xl font-bold tracking-tight mt-1">
								{stats.totalSent}
							</h3>
						</div>
						<div className="size-9 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
							<SendIcon className="size-4.5" />
						</div>
					</CardContent>
				</Card>

				<Card className="shadow-xs border bg-card/50">
					<CardContent className="p-4 flex items-center justify-between">
						<div>
							<p className="text-xs font-medium text-muted-foreground">
								Avg. Open Rate
							</p>
							<h3 className="text-2xl font-bold tracking-tight mt-1">
								{stats.avgOpenRate}%
							</h3>
						</div>
						<div className="size-9 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
							<MousePointerClickIcon className="size-4.5" />
						</div>
					</CardContent>
				</Card>

				<Card className="shadow-xs border bg-card/50">
					<CardContent className="p-4 flex items-center justify-between">
						<div>
							<p className="text-xs font-medium text-muted-foreground">
								Drafts in Progress
							</p>
							<h3 className="text-2xl font-bold tracking-tight mt-1">
								{stats.draftCount}
							</h3>
						</div>
						<div className="size-9 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
							<PlusIcon className="size-4.5" />
						</div>
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
								onClick={() => setIsCreateOpen(true)}
								className="gap-1.5"
							>
								<PlusIcon className="size-3.5" />
								New Issue
							</Button>
						}
					/>
				) : (
					<NewslettersTable
						data={newsletters}
						activeSubscriberCount={activeSubscriberCount}
						onSendTest={(nl) => setTestTargetNl(nl)}
						onSendBroadcast={(nl) => setSendConfirmNl(nl)}
						onDuplicate={(id) => duplicateMutation.mutate(id)}
						onDelete={(id) => deleteMutation.mutate(id)}
					/>
				)}
			</Tabs>

			{/* Create Issue Dialog */}
			<CreateNewsletterDialog
				open={isCreateOpen}
				onOpenChange={setIsCreateOpen}
				onSubmit={(data) => createMutation.mutate(data)}
				isPending={createMutation.isPending}
			/>

			{/* Send Test Email Dialog */}
			<SendTestDialog
				target={testTargetNl}
				onClose={() => setTestTargetNl(null)}
				onSend={handleSendTest}
			/>

			{/* Send Broadcast Confirmation Dialog */}
			<BroadcastConfirmDialog
				target={sendConfirmNl}
				activeSubscriberCount={activeSubscriberCount}
				onClose={() => setSendConfirmNl(null)}
				onConfirm={() => {
					if (sendConfirmNl) {
						sendMutation.mutate(sendConfirmNl.id);
					}
				}}
				isPending={sendMutation.isPending}
			/>
		</div>
	);
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	CopyIcon,
	DownloadIcon,
	EllipsisVerticalIcon,
	PencilIcon,
	PlusIcon,
	SearchIcon,
	Trash2Icon,
	UserPlusIcon,
	UsersIcon,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/dashboard/empty-state";
import { HeaderActions } from "@/components/dashboard/header-actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
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
import { formatNumber, formatRelativeTime } from "@/lib/format";
import { mockApi } from "@/lib/mock/api";
import type { Member, MemberStatus } from "@/types/domain";

const STATUS_TABS: { value: MemberStatus | "all"; label: string }[] = [
	{ value: "all", label: "All Members" },
	{ value: "active", label: "Active" },
	{ value: "unconfirmed", label: "Unconfirmed" },
	{ value: "unsubscribed", label: "Unsubscribed" },
	{ value: "bounced", label: "Bounced" },
];

function statusBadge(status: MemberStatus) {
	switch (status) {
		case "active":
			return (
				<Badge
					variant="outline"
					className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-normal"
				>
					Active
				</Badge>
			);
		case "unconfirmed":
			return (
				<Badge
					variant="outline"
					className="border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-normal"
				>
					Unconfirmed
				</Badge>
			);
		case "unsubscribed":
			return (
				<Badge
					variant="outline"
					className="border-zinc-500/20 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 font-normal"
				>
					Unsubscribed
				</Badge>
			);
		case "bounced":
			return (
				<Badge
					variant="outline"
					className="border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-normal"
				>
					Bounced
				</Badge>
			);
	}
}

export default function MembersPage() {
	const queryClient = useQueryClient();
	const [status, setStatus] = React.useState<MemberStatus | "all">("all");
	const [query, setQuery] = React.useState("");
	const [debouncedQuery, setDebouncedQuery] = React.useState("");

	// Modals
	const [isAddOpen, setIsAddOpen] = React.useState(false);
	const [editingMember, setEditingMember] = React.useState<Member | null>(null);

	// New member state
	const [newEmail, setNewEmail] = React.useState("");
	const [newName, setNewName] = React.useState("");
	const [newStatus, setNewStatus] = React.useState<MemberStatus>("active");

	React.useEffect(() => {
		const timer = setTimeout(() => setDebouncedQuery(query), 200);
		return () => clearTimeout(timer);
	}, [query]);

	const { data: members = [], isPending } = useQuery({
		queryKey: ["members", { status, query: debouncedQuery }],
		queryFn: () =>
			mockApi.members.list({
				status,
				query: debouncedQuery || undefined,
			}),
	});

	const { data: allMembers = [] } = useQuery({
		queryKey: ["members", "all"],
		queryFn: () => mockApi.members.list({ status: "all" }),
	});

	const counts = React.useMemo(() => {
		const map: Record<string, number> = { all: allMembers.length };
		for (const m of allMembers) {
			map[m.status] = (map[m.status] || 0) + 1;
		}
		return map;
	}, [allMembers]);

	const stats = React.useMemo(() => {
		const total = allMembers.length;
		const active = allMembers.filter((m) => m.status === "active").length;
		const unconfirmed = allMembers.filter(
			(m) => m.status === "unconfirmed",
		).length;
		const left = allMembers.filter(
			(m) => m.status === "unsubscribed" || m.status === "bounced",
		).length;
		const openRates = allMembers
			.filter((m) => m.status === "active" && m.openRate !== undefined)
			.map((m) => m.openRate || 0);
		const avgOpenRate = openRates.length
			? Math.round(
					openRates.reduce((acc, curr) => acc + curr, 0) / openRates.length,
				)
			: 0;

		const activePct = total > 0 ? (active / total) * 100 : 0;
		const unconfirmedPct = total > 0 ? (unconfirmed / total) * 100 : 0;
		const leftPct = total > 0 ? (left / total) * 100 : 0;

		return {
			total,
			active,
			unconfirmed,
			left,
			avgOpenRate,
			activePct,
			unconfirmedPct,
			leftPct,
		};
	}, [allMembers]);

	const createMutation = useMutation({
		mutationFn: (data: {
			email: string;
			name?: string;
			status: MemberStatus;
		}) => mockApi.members.create(data),
		onSuccess: (newMember) => {
			queryClient.invalidateQueries({ queryKey: ["members"] });
			toast.success(`Member ${newMember.email} added successfully`);
			setIsAddOpen(false);
			setNewEmail("");
			setNewName("");
			setNewStatus("active");
		},
		onError: () => toast.error("Failed to add member"),
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, patch }: { id: string; patch: Partial<Member> }) =>
			mockApi.members.update(id, patch),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["members"] });
			toast.success("Member updated");
			setEditingMember(null);
		},
		onError: () => toast.error("Failed to update member"),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => mockApi.members.remove(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["members"] });
			toast.success("Member removed");
		},
		onError: () => toast.error("Failed to remove member"),
	});

	const handleExportCSV = () => {
		if (!allMembers.length) {
			toast.error("No members to export");
			return;
		}
		const headers = [
			"ID",
			"Email",
			"Name",
			"Status",
			"Open Rate (%)",
			"Subscribed At",
		];
		const rows = allMembers.map((m) => [
			m.id,
			`"${m.email}"`,
			`"${m.name || ""}"`,
			m.status,
			m.openRate ?? 0,
			new Date(m.subscribedAt).toISOString(),
		]);
		const csvContent = [
			headers.join(","),
			...rows.map((r) => r.join(",")),
		].join("\n");
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.setAttribute("href", url);
		link.setAttribute("download", `spile-members-${Date.now()}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		toast.success(`Exported ${allMembers.length} members to CSV`);
	};

	const copyEmail = (email: string) => {
		navigator.clipboard.writeText(email);
		toast.success("Copied email to clipboard");
	};

	return (
		<div className="flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
			<HeaderActions>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={handleExportCSV}
						className="gap-1.5"
					>
						<DownloadIcon className="size-3.5" />
						Export CSV
					</Button>
					<Button
						size="sm"
						onClick={() => setIsAddOpen(true)}
						className="gap-1.5"
					>
						<UserPlusIcon className="size-3.5" />
						Add Member
					</Button>
				</div>
			</HeaderActions>

			{/* Slim Summary Strip */}
			<div className="flex flex-col gap-2.5 rounded-lg border border-border/60 bg-muted/30 dark:bg-zinc-900/40 px-4 py-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between shadow-2xs">
				{/* Left: Total & Engagement */}
				<div className="flex flex-wrap items-center gap-2">
					<span className="font-semibold text-foreground text-sm">
						{formatNumber(stats.total)}{" "}
						{stats.total === 1 ? "member" : "members"}
					</span>
					<span className="text-muted-foreground/40">·</span>
					<span className="font-semibold text-foreground">
						{stats.avgOpenRate}%
					</span>
					<span>avg open rate</span>
					<span className="font-medium text-emerald-600 dark:text-emerald-400">
						+3%
					</span>
				</div>

				{/* Right: Segmented Distribution Bar & Breakdown */}
				<div className="flex flex-wrap items-center gap-3">
					<div className="flex h-2 w-28 sm:w-44 overflow-hidden rounded-full bg-muted dark:bg-zinc-800">
						{stats.activePct > 0 && (
							<div
								style={{ width: `${stats.activePct}%` }}
								className="h-full bg-emerald-500 transition-all duration-300"
								title={`Active: ${stats.active} (${Math.round(stats.activePct)}%)`}
							/>
						)}
						{stats.unconfirmedPct > 0 && (
							<div
								style={{ width: `${stats.unconfirmedPct}%` }}
								className="h-full bg-amber-500 transition-all duration-300"
								title={`Pending: ${stats.unconfirmed} (${Math.round(stats.unconfirmedPct)}%)`}
							/>
						)}
						{stats.leftPct > 0 && (
							<div
								style={{ width: `${stats.leftPct}%` }}
								className="h-full bg-zinc-400 dark:bg-zinc-600 transition-all duration-300"
								title={`Left: ${stats.left} (${Math.round(stats.leftPct)}%)`}
							/>
						)}
					</div>

					<div className="flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
						<span>
							<strong className="font-semibold text-foreground">
								{stats.active}
							</strong>{" "}
							active
						</span>
						<span className="text-muted-foreground/40">·</span>
						<span>
							<strong className="font-semibold text-foreground">
								{stats.unconfirmed}
							</strong>{" "}
							pending
						</span>
						<span className="text-muted-foreground/40">·</span>
						<span>
							<strong className="font-semibold text-foreground">
								{stats.left}
							</strong>{" "}
							left
						</span>
					</div>
				</div>
			</div>

			{/* Filters & Search */}
			<Tabs
				value={status}
				onValueChange={(v) => setStatus(v as MemberStatus | "all")}
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
							placeholder="Search by email or name..."
							className="pl-8 text-sm"
						/>
					</div>
				</div>

				{/* Table / List */}
				{isPending ? (
					<div className="flex flex-col gap-2">
						{["m1", "m2", "m3", "m4", "m5"].map((k) => (
							<Skeleton key={k} className="h-14 w-full" />
						))}
					</div>
				) : members.length === 0 ? (
					<EmptyState
						icon={UsersIcon}
						title="No members found"
						description={
							query
								? `No members match "${query}". Try adjusting your search or filter.`
								: "You don't have any subscribers in this status yet."
						}
						action={
							<Button
								size="sm"
								onClick={() => setIsAddOpen(true)}
								className="gap-1.5"
							>
								<PlusIcon className="size-3.5" />
								Add Member
							</Button>
						}
					/>
				) : (
					<div className="rounded-lg border bg-card shadow-xs overflow-hidden">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Subscriber</TableHead>
									<TableHead className="w-32">Status</TableHead>
									<TableHead className="w-40">Open Rate</TableHead>
									<TableHead className="w-36">Subscribed</TableHead>
									<TableHead className="w-12 text-right" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{members.map((member) => {
									const initials = (member.name || member.email)
										.slice(0, 2)
										.toUpperCase();
									return (
										<TableRow key={member.id} className="group">
											<TableCell>
												<div className="flex items-center gap-3">
													<Avatar className="size-8">
														<AvatarFallback className="text-xs font-medium">
															{initials}
														</AvatarFallback>
													</Avatar>
													<div className="flex flex-col">
														<span className="font-medium text-sm text-foreground">
															{member.name || member.email.split("@")[0]}
														</span>
														<span className="text-xs text-muted-foreground font-mono">
															{member.email}
														</span>
													</div>
												</div>
											</TableCell>
											<TableCell>{statusBadge(member.status)}</TableCell>
											<TableCell>
												{member.status === "active" &&
												member.openRate !== undefined ? (
													<div className="flex items-center gap-2">
														<div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
															<div
																className="h-full rounded-full bg-primary"
																style={{ width: `${member.openRate}%` }}
															/>
														</div>
														<span className="text-xs font-medium text-muted-foreground font-mono">
															{member.openRate}%
														</span>
													</div>
												) : (
													<span className="text-xs text-muted-foreground">
														—
													</span>
												)}
											</TableCell>
											<TableCell className="text-xs text-muted-foreground">
												{formatRelativeTime(member.subscribedAt)}
											</TableCell>
											<TableCell className="text-right">
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
													<DropdownMenuContent align="end" className="w-40">
														<DropdownMenuItem
															onClick={() => setEditingMember(member)}
														>
															<PencilIcon className="size-3.5 mr-2" />
															Edit details
														</DropdownMenuItem>
														<DropdownMenuItem
															onClick={() => copyEmail(member.email)}
														>
															<CopyIcon className="size-3.5 mr-2" />
															Copy email
														</DropdownMenuItem>
														<DropdownMenuSeparator />
														<DropdownMenuItem
															variant="destructive"
															onClick={() => deleteMutation.mutate(member.id)}
														>
															<Trash2Icon className="size-3.5 mr-2" />
															Remove
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

			{/* Add Member Dialog */}
			<Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Add New Member</DialogTitle>
						<DialogDescription>
							Manually subscribe someone to your publication.
						</DialogDescription>
					</DialogHeader>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							if (!newEmail.trim()) {
								toast.error("Email is required");
								return;
							}
							createMutation.mutate({
								email: newEmail.trim(),
								name: newName.trim() || undefined,
								status: newStatus,
							});
						}}
						className="space-y-4 py-2"
					>
						<div className="space-y-1.5">
							<Label htmlFor="email">Email address *</Label>
							<Input
								id="email"
								type="email"
								placeholder="reader@example.com"
								value={newEmail}
								onChange={(e) => setNewEmail(e.target.value)}
								required
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="name">Full name (optional)</Label>
							<Input
								id="name"
								placeholder="Jane Doe"
								value={newName}
								onChange={(e) => setNewName(e.target.value)}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="status">Initial Status</Label>
							<Select
								value={newStatus}
								onValueChange={(val) => setNewStatus(val as MemberStatus)}
							>
								<SelectTrigger id="status">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="active">Active (Subscribed)</SelectItem>
									<SelectItem value="unconfirmed">Unconfirmed</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<DialogFooter className="pt-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => setIsAddOpen(false)}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={createMutation.isPending}>
								{createMutation.isPending ? "Adding..." : "Add Member"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			{/* Edit Member Dialog */}
			<Dialog
				open={Boolean(editingMember)}
				onOpenChange={(open) => !open && setEditingMember(null)}
			>
				{editingMember && (
					<DialogContent className="sm:max-w-md">
						<DialogHeader>
							<DialogTitle>Edit Member</DialogTitle>
							<DialogDescription>
								Update subscriber status or personal details.
							</DialogDescription>
						</DialogHeader>
						<form
							onSubmit={(e) => {
								e.preventDefault();
								updateMutation.mutate({
									id: editingMember.id,
									patch: {
										name: editingMember.name,
										status: editingMember.status,
									},
								});
							}}
							className="space-y-4 py-2"
						>
							<div className="space-y-1.5">
								<Label>Email</Label>
								<Input
									value={editingMember.email}
									disabled
									className="bg-muted/50"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="edit-name">Name</Label>
								<Input
									id="edit-name"
									value={editingMember.name || ""}
									onChange={(e) =>
										setEditingMember({ ...editingMember, name: e.target.value })
									}
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="edit-status">Status</Label>
								<Select
									value={editingMember.status}
									onValueChange={(val) =>
										setEditingMember({
											...editingMember,
											status: val as MemberStatus,
										})
									}
								>
									<SelectTrigger id="edit-status">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="active">Active</SelectItem>
										<SelectItem value="unconfirmed">Unconfirmed</SelectItem>
										<SelectItem value="unsubscribed">Unsubscribed</SelectItem>
										<SelectItem value="bounced">Bounced</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<DialogFooter className="pt-2">
								<Button
									type="button"
									variant="outline"
									onClick={() => setEditingMember(null)}
								>
									Cancel
								</Button>
								<Button type="submit" disabled={updateMutation.isPending}>
									{updateMutation.isPending ? "Saving..." : "Save Changes"}
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				)}
			</Dialog>
		</div>
	);
}

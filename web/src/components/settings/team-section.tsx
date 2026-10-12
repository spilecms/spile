import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, UserPlus, Users } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { ROLE_LABELS } from "@/components/common/role-switcher";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { mockApi } from "@/lib/mock/api";
import type { User, UserRole } from "@/types/domain";

const ASSIGNABLE_ROLES: {
	value: UserRole;
	label: string;
	description: string;
}[] = [
	{
		value: "admin",
		label: "Admin",
		description: "Full access to settings, members, and publishing",
	},
	{
		value: "editor",
		label: "Editor",
		description: "Can write, edit, approve reviews, and publish posts & docs",
	},
	{
		value: "author",
		label: "Author",
		description: "Can write and publish their own posts and docs",
	},
	{
		value: "contributor",
		label: "Contributor",
		description:
			"Can draft edits and submit changes for review (cannot publish directly)",
	},
];

export function TeamSection() {
	const queryClient = useQueryClient();
	const [inviteOpen, setInviteOpen] = React.useState(false);
	const [inviteName, setInviteName] = React.useState("");
	const [inviteEmail, setInviteEmail] = React.useState("");
	const [invitePassword, setInvitePassword] = React.useState("");
	const [inviteRole, setInviteRole] = React.useState<UserRole>("contributor");

	const { data: currentUser } = useQuery({
		queryKey: ["users", "current"],
		queryFn: () => mockApi.users.current(),
	});

	const { data: users, isLoading } = useQuery({
		queryKey: ["users", "list"],
		queryFn: () => mockApi.users.list(),
	});

	const canManageTeam =
		currentUser?.role === "owner" || currentUser?.role === "admin";

	const inviteMutation = useMutation({
		mutationFn: () =>
			mockApi.users.invite(
				inviteEmail.trim(),
				inviteRole,
				inviteName.trim() || undefined,
				invitePassword.trim() || undefined,
			),
		onSuccess: (user) => {
			queryClient.invalidateQueries({ queryKey: ["users", "list"] });
			queryClient.invalidateQueries({ queryKey: ["users"] });
			toast.success(
				invitePassword.trim()
					? `Created ${user.email} (${user.role}) — ready to sign in`
					: `Invited ${user.email} as ${user.role}`,
			);
			setInviteOpen(false);
			setInviteName("");
			setInviteEmail("");
			setInvitePassword("");
		},
		onError: (err) =>
			toast.error(
				err instanceof Error ? err.message : "Failed to create team member",
			),
	});

	const roleMutation = useMutation({
		mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
			mockApi.users.updateRole(userId, role),
		onSuccess: (updated) => {
			queryClient.invalidateQueries({ queryKey: ["users", "list"] });
			queryClient.invalidateQueries({ queryKey: ["users"] });
			toast.success(`Updated ${updated.name}'s role to ${updated.role}`);
		},
		onError: (err) =>
			toast.error(err instanceof Error ? err.message : "Failed to update role"),
	});

	const removeMutation = useMutation({
		mutationFn: (userId: string) => mockApi.users.remove(userId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["users", "list"] });
			queryClient.invalidateQueries({ queryKey: ["users"] });
			toast.success("Team member removed");
		},
		onError: (err) =>
			toast.error(
				err instanceof Error ? err.message : "Failed to remove member",
			),
	});

	return (
		<div className="flex flex-col gap-6">
			<Card>
				<CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
					<div>
						<CardTitle className="text-base font-semibold flex items-center gap-2">
							<Users className="size-4 text-primary" />
							<span>Workspace Team & Roles</span>
						</CardTitle>
						<CardDescription className="text-xs mt-1">
							Manage who has access to write posts, submit documentation
							reviews, and publish content.
						</CardDescription>
					</div>
					{canManageTeam && (
						<Button
							size="sm"
							onClick={() => setInviteOpen(true)}
							className="gap-1.5 h-8 text-xs shrink-0"
						>
							<UserPlus className="size-3.5" />
							<span>Add Team Member</span>
						</Button>
					)}
				</CardHeader>
				<CardContent>
					<div className="rounded-lg border overflow-hidden">
						<table className="w-full text-xs">
							<thead>
								<tr className="border-b bg-muted/40 text-left text-muted-foreground">
									<th className="py-2.5 px-3 font-medium">User</th>
									<th className="py-2.5 px-3 font-medium">Email</th>
									<th className="py-2.5 px-3 font-medium">Role</th>
									<th className="py-2.5 px-3 font-medium">Status</th>
									{canManageTeam && (
										<th className="py-2.5 px-3 font-medium text-right">
											Actions
										</th>
									)}
								</tr>
							</thead>
							<tbody className="divide-y divide-border/60">
								{isLoading ? (
									<tr>
										<td
											colSpan={canManageTeam ? 5 : 4}
											className="py-6 text-center text-muted-foreground"
										>
											Loading team members…
										</td>
									</tr>
								) : (users ?? []).length === 0 ? (
									<tr>
										<td
											colSpan={canManageTeam ? 5 : 4}
											className="py-6 text-center text-muted-foreground"
										>
											No team members found.
										</td>
									</tr>
								) : (
									(users ?? []).map((user: User) => {
										const roleMeta =
											ROLE_LABELS[user.role] ?? ROLE_LABELS.author;
										const isOwner = user.role === "owner";
										const isSelf = user.id === currentUser?.id;

										return (
											<tr
												key={user.id}
												className="hover:bg-muted/30 transition-colors"
											>
												<td className="py-2.5 px-3 font-medium">
													<div className="flex items-center gap-2">
														<Avatar className="size-6">
															<AvatarImage src={user.avatar} alt={user.name} />
															<AvatarFallback className="text-[10px]">
																{user.name.slice(0, 2).toUpperCase()}
															</AvatarFallback>
														</Avatar>
														<span className="text-foreground">{user.name}</span>
														{isSelf && (
															<span className="text-[10px] text-muted-foreground">
																(you)
															</span>
														)}
													</div>
												</td>
												<td className="py-2.5 px-3 text-muted-foreground">
													{user.email}
												</td>
												<td className="py-2.5 px-3">
													{canManageTeam && !isOwner ? (
														<Select
															value={user.role}
															onValueChange={(val) => {
																if (val && val !== user.role) {
																	roleMutation.mutate({
																		userId: user.id,
																		role: val as UserRole,
																	});
																}
															}}
														>
															<SelectTrigger className="h-7 w-34 text-xs">
																<SelectValue />
															</SelectTrigger>
															<SelectContent>
																{ASSIGNABLE_ROLES.map((r) => (
																	<SelectItem
																		key={r.value}
																		value={r.value}
																		className="text-xs"
																	>
																		{r.label}
																	</SelectItem>
																))}
															</SelectContent>
														</Select>
													) : (
														<Badge
															variant="outline"
															className={`text-[10px] h-5 px-1.5 font-semibold uppercase tracking-wider ${roleMeta.color}`}
														>
															{roleMeta.badge}
														</Badge>
													)}
												</td>
												<td className="py-2.5 px-3">
													<span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
														<span className="size-1.5 rounded-full bg-emerald-500" />
														<span>Active</span>
													</span>
												</td>
												{canManageTeam && (
													<td className="py-2.5 px-3 text-right">
														{!isOwner && !isSelf && (
															<Button
																variant="ghost"
																size="icon-sm"
																aria-label={`Remove ${user.name}`}
																onClick={() => removeMutation.mutate(user.id)}
																disabled={removeMutation.isPending}
																className="text-muted-foreground hover:text-destructive"
															>
																<Trash2 className="size-3.5" />
															</Button>
														)}
													</td>
												)}
											</tr>
										);
									})
								)}
							</tbody>
						</table>
					</div>
				</CardContent>
			</Card>

			{/* Add / Invite Member Dialog */}
			<Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<UserPlus className="size-4 text-primary" />
							<span>Add Workspace Member</span>
						</DialogTitle>
						<DialogDescription className="text-xs">
							Create a team account with a specific role (such as Contributor or
							Editor) to collaborate on Spile.
						</DialogDescription>
					</DialogHeader>

					<div className="flex flex-col gap-3 py-2">
						<div className="flex flex-col gap-1.5">
							<Label className="text-xs">Full Name</Label>
							<Input
								type="text"
								placeholder="e.g. Oliyad (Contributor)"
								value={inviteName}
								onChange={(e) => setInviteName(e.target.value)}
								className="h-8 text-xs"
							/>
						</div>

						<div className="flex flex-col gap-1.5">
							<Label className="text-xs">
								Email Address <span className="text-rose-500">*</span>
							</Label>
							<Input
								type="email"
								placeholder="colleague@yourcompany.com"
								value={inviteEmail}
								onChange={(e) => setInviteEmail(e.target.value)}
								className="h-8 text-xs"
							/>
						</div>

						<div className="flex flex-col gap-1.5">
							<Label className="text-xs">
								Initial Password{" "}
								<span className="text-muted-foreground font-normal">
									(optional, min 6 chars for direct login)
								</span>
							</Label>
							<Input
								type="password"
								placeholder="Set a password to sign in directly..."
								value={invitePassword}
								onChange={(e) => setInvitePassword(e.target.value)}
								className="h-8 text-xs"
							/>
						</div>

						<div className="flex flex-col gap-1.5">
							<Label className="text-xs">Role & Permissions</Label>
							<Select
								value={inviteRole}
								onValueChange={(val) => setInviteRole(val as UserRole)}
							>
								<SelectTrigger className="h-8 text-xs">
									<SelectValue placeholder="Select role" />
								</SelectTrigger>
								<SelectContent>
									{ASSIGNABLE_ROLES.map((r) => (
										<SelectItem
											key={r.value}
											value={r.value}
											className="text-xs"
										>
											{r.label} — {r.description}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<DialogFooter>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setInviteOpen(false)}
						>
							Cancel
						</Button>
						<Button
							size="sm"
							onClick={() => inviteMutation.mutate()}
							disabled={!inviteEmail.trim() || inviteMutation.isPending}
						>
							{inviteMutation.isPending ? "Creating…" : "Create Member"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

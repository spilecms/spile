import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Users } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
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
import type { User } from "@/types/domain";

export function TeamSection() {
	const queryClient = useQueryClient();
	const [inviteOpen, setInviteOpen] = React.useState(false);
	const [inviteEmail, setInviteEmail] = React.useState("");
	const [inviteRole, setInviteRole] = React.useState<User["role"]>("editor");

	const { data: users, isLoading } = useQuery({
		queryKey: ["users", "list"],
		queryFn: () => mockApi.users.list(),
	});

	const inviteMutation = useMutation({
		mutationFn: () => mockApi.users.invite(inviteEmail, inviteRole),
		onSuccess: (user) => {
			queryClient.invalidateQueries({ queryKey: ["users", "list"] });
			toast.success(`Invited ${user.email} as ${user.role}`);
			setInviteOpen(false);
			setInviteEmail("");
		},
		onError: () => toast.error("Failed to send invitation"),
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
							Manage who has access to write posts, broadcast newsletters, and
							edit documentation.
						</CardDescription>
					</div>
					<Button
						size="sm"
						onClick={() => setInviteOpen(true)}
						className="gap-1.5 h-8 text-xs shrink-0"
					>
						<UserPlus className="size-3.5" />
						<span>Invite Colleague</span>
					</Button>
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
								</tr>
							</thead>
							<tbody className="divide-y divide-border/60">
								{isLoading ? (
									<tr>
										<td
											colSpan={4}
											className="py-6 text-center text-muted-foreground"
										>
											Loading team members…
										</td>
									</tr>
								) : (
									(users ?? []).map((user) => (
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
												</div>
											</td>
											<td className="py-2.5 px-3 text-muted-foreground">
												{user.email}
											</td>
											<td className="py-2.5 px-3">
												<Badge
													variant={
														user.role === "admin" ? "default" : "secondary"
													}
													className="text-[10px] h-5 px-1.5 font-normal capitalize"
												>
													{user.role}
												</Badge>
											</td>
											<td className="py-2.5 px-3">
												<span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
													<span className="size-1.5 rounded-full bg-emerald-500" />
													<span>Active</span>
												</span>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</CardContent>
			</Card>

			{/* Invite Dialog */}
			<Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<UserPlus className="size-4 text-primary" />
							<span>Invite Workspace Member</span>
						</DialogTitle>
						<DialogDescription className="text-xs">
							Send an invite email with access credentials to collaborate on
							Spile.
						</DialogDescription>
					</DialogHeader>

					<div className="flex flex-col gap-3 py-2">
						<div className="flex flex-col gap-1.5">
							<Label className="text-xs">Email Address</Label>
							<Input
								type="email"
								placeholder="colleague@yourcompany.com"
								value={inviteEmail}
								onChange={(e) => setInviteEmail(e.target.value)}
								className="h-8 text-xs"
							/>
						</div>

						<div className="flex flex-col gap-1.5">
							<Label className="text-xs">Role & Permissions</Label>
							<Select
								value={inviteRole}
								onValueChange={(val) => setInviteRole(val as User["role"])}
							>
								<SelectTrigger className="h-8 text-xs">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="admin" className="text-xs">
										Admin (Full access to settings, members, and publishing)
									</SelectItem>
									<SelectItem value="editor" className="text-xs">
										Editor (Can write, edit, and publish posts and docs)
									</SelectItem>
									<SelectItem value="author" className="text-xs">
										Author (Can write and save drafts only)
									</SelectItem>
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
							{inviteMutation.isPending ? "Inviting…" : "Send Invite"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

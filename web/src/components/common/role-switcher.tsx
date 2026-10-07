import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { mockApi } from "@/lib/mock/api";
import type { UserRole } from "@/types/domain";

export const ROLE_LABELS: Record<
	UserRole,
	{ label: string; badge: string; color: string }
> = {
	owner: {
		label: "Owner (Mara)",
		badge: "Owner",
		color:
			"bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
	},
	admin: {
		label: "Admin (Jonas)",
		badge: "Admin",
		color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
	},
	editor: {
		label: "Editor (Priya)",
		badge: "Editor",
		color:
			"bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
	},
	author: {
		label: "Author (Diego)",
		badge: "Author",
		color:
			"bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
	},
	contributor: {
		label: "Contributor (Oliyad)",
		badge: "Contributor",
		color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
	},
};

export function UserPersonaSubmenu() {
	const qc = useQueryClient();
	const { data: user } = useQuery({
		queryKey: ["users", "current"],
		queryFn: () => mockApi.users.current(),
	});

	const switchMutation = useMutation({
		mutationFn: (role: UserRole) => mockApi.users.switchRole(role),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["users", "current"] });
			qc.invalidateQueries({ queryKey: ["reviews"] });
			qc.invalidateQueries({ queryKey: ["notifications"] });
		},
	});

	const currentRole = user?.role || "owner";

	return (
		<DropdownMenuSub>
			<DropdownMenuSubTrigger>
				<Users className="size-4" />
				<span>Switch Persona (Dev)</span>
			</DropdownMenuSubTrigger>
			<DropdownMenuSubContent className="w-52">
				<DropdownMenuGroup>
					<DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
						Simulate Role
					</DropdownMenuLabel>
					<DropdownMenuSeparator />
					{(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => {
						const item = ROLE_LABELS[role];
						const isSelected = currentRole === role;
						return (
							<DropdownMenuItem
								key={role}
								onClick={() => switchMutation.mutate(role)}
								className="flex items-center justify-between text-xs cursor-pointer"
							>
								<span>{item.label}</span>
								{isSelected && <Check className="size-3.5 text-primary" />}
							</DropdownMenuItem>
						);
					})}
				</DropdownMenuGroup>
			</DropdownMenuSubContent>
		</DropdownMenuSub>
	);
}

export function RoleSwitcher() {
	const qc = useQueryClient();
	const { data: user } = useQuery({
		queryKey: ["users", "current"],
		queryFn: () => mockApi.users.current(),
	});

	const switchMutation = useMutation({
		mutationFn: (role: UserRole) => mockApi.users.switchRole(role),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["users", "current"] });
			qc.invalidateQueries({ queryKey: ["reviews"] });
			qc.invalidateQueries({ queryKey: ["notifications"] });
		},
	});

	const currentRole = user?.role || "owner";
	const info = ROLE_LABELS[currentRole] || ROLE_LABELS.owner;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant="ghost"
						size="sm"
						className="h-8 gap-1.5 px-2 text-xs font-normal"
					/>
				}
			>
				<span className="hidden sm:inline text-muted-foreground text-[11px]">
					Role:
				</span>
				<Badge
					variant="outline"
					className={`h-5 px-1.5 text-[10px] font-semibold uppercase tracking-wider ${info.color}`}
				>
					{info.badge}
				</Badge>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuGroup>
					<DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
						Switch Persona (Dev Simulation)
					</DropdownMenuLabel>
					<DropdownMenuSeparator />
					{(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => {
						const item = ROLE_LABELS[role];
						const isSelected = currentRole === role;
						return (
							<DropdownMenuItem
								key={role}
								onClick={() => switchMutation.mutate(role)}
								className="flex items-center justify-between text-xs cursor-pointer"
							>
								<span>{item.label}</span>
								{isSelected && <Check className="size-3.5 text-primary" />}
							</DropdownMenuItem>
						);
					})}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

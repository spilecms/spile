import { useQuery } from "@tanstack/react-query";
import {
	CircleUserRoundIcon,
	EllipsisVerticalIcon,
	LogOutIcon,
	Settings2Icon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
	ROLE_LABELS,
	UserPersonaSubmenu,
} from "@/components/common/role-switcher";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { mockApi } from "@/lib/mock/api";

function initials(name: string): string {
	return name
		.split(/\s+/)
		.map((part) => part[0])
		.filter(Boolean)
		.slice(0, 2)
		.join("")
		.toUpperCase();
}

export function NavUser() {
	const { isMobile } = useSidebar();
	const navigate = useNavigate();
	const { t } = useTranslation();
	const { data: user } = useQuery({
		queryKey: ["users", "current"],
		queryFn: () => mockApi.users.current(),
	});

	const name = user?.name ?? "…";
	const email = user?.email ?? "";
	const role = user?.role || "owner";
	const roleInfo = ROLE_LABELS[role] || ROLE_LABELS.owner;

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />
						}
					>
						<Avatar className="size-8  flex items-center justify-center ">
							<AvatarFallback className="rounded-lg ">
								{user ? initials(name) : "?"}
							</AvatarFallback>
						</Avatar>
						<div className="grid flex-1 text-left text-sm leading-tight">
							<div className="flex items-center gap-1.5 min-w-0">
								<span className="truncate font-medium">{name}</span>
								<Badge
									variant="outline"
									className={`h-4 px-1 text-[9px] font-semibold uppercase tracking-wider shrink-0 ${roleInfo.color}`}
								>
									{roleInfo.badge}
								</Badge>
							</div>
							<span className="truncate text-xs text-foreground/70">
								{email}
							</span>
						</div>
						<EllipsisVerticalIcon className="ml-auto size-4" />
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="min-w-56"
						side={isMobile ? "bottom" : "right"}
						align="end"
						sideOffset={4}
					>
						<DropdownMenuGroup>
							<DropdownMenuLabel className="p-0 font-normal">
								<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
									<Avatar className="size-8">
										<AvatarFallback className="rounded-lg">
											{user ? initials(name) : "?"}
										</AvatarFallback>
									</Avatar>
									<div className="grid flex-1 text-left text-sm leading-tight">
										<div className="flex items-center gap-1.5 min-w-0">
											<span className="truncate font-medium">{name}</span>
											<Badge
												variant="outline"
												className={`h-4 px-1 text-[9px] font-semibold uppercase tracking-wider shrink-0 ${roleInfo.color}`}
											>
												{roleInfo.badge}
											</Badge>
										</div>
										<span className="truncate text-xs text-muted-foreground">
											{email}
										</span>
									</div>
								</div>
							</DropdownMenuLabel>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem>
								<CircleUserRoundIcon />
								{t("userMenu.profile")}
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => navigate("/settings")}>
								<Settings2Icon />
								{t("userMenu.settings")}
							</DropdownMenuItem>
							<UserPersonaSubmenu />
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuItem>
							<LogOutIcon />
							{t("userMenu.signOut")}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}

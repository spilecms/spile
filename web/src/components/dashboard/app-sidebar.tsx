import {
	FileTextIcon,
	FolderIcon,
	Gauge,
	MailIcon,
	Settings2Icon,
	TagIcon,
	UsersIcon,
} from "lucide-react";
import type * as React from "react";
import { Link, useLocation } from "react-router-dom";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NavMain } from "./nav-main";
import { NavSecondary } from "./nav-secondary";
import { NavUser } from "./nav-user";

const navMain = [
	{ title: "Dashboard", url: "/", icon: <Gauge />},
	{ title: "Posts", url: "/posts", icon: <FileTextIcon /> },
	{ title: "Tags", url: "/tags", icon: <TagIcon /> },
	{ title: "Media", url: "/media", icon: <FolderIcon /> },
	{ title: "Members", url: "/members", icon: <UsersIcon /> },
	{ title: "Newsletters", url: "/newsletters", icon: <MailIcon /> },
];

const navSecondary = [
	{ title: "Settings", url: "/settings", icon: <Settings2Icon /> },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const { pathname } = useLocation();

	return (
		<Sidebar collapsible="offcanvas" {...props} variant="inset">
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							className="data-[slot=sidebar-menu-button]:p-1.5! flex items-center gap-2 mb-2.5"
							render={<Link to="/" />}
						>
							<div className="flex size-7 items-center justify-center rounded-md ">
								<img src="src/assets/logo.png" alt="Spile Logo"  />
							</div>
							<span className="text-lg font-semibold">Spile</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={navMain} currentPath={pathname} />
				<NavSecondary
					items={navSecondary}
					currentPath={pathname}
					className="mt-auto"
				/>
			</SidebarContent>
			<SidebarFooter>
				<NavUser />
			</SidebarFooter>
		</Sidebar>
	);
}

import {
	ChartBarIcon,
	DocumentTextIcon,
	QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import {
	BookOpen,
	FolderIcon,
	Gauge,
	MailIcon,
	SettingsIcon,
	UsersIcon,
} from "lucide-react";
import type * as React from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import logoImg from "@/assets/logo4.png";
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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const { pathname } = useLocation();
	const { t } = useTranslation();
	const navMain = [
		{ title: t("dashboard.overview"), url: "/", icon: <Gauge /> },
		{ title: t("dashboard.posts"), url: "/posts", icon: <DocumentTextIcon /> },
		{
			title: t("dashboard.newsletters", "Newsletters"),
			url: "/newsletters",
			icon: <MailIcon />,
		},
		{ title: t("dashboard.members"), url: "/members", icon: <UsersIcon /> },
		{ title: t("dashboard.docs"), url: "/docs", icon: <BookOpen /> },
		{ title: t("dashboard.media"), url: "/media", icon: <FolderIcon /> },
		{
			title: t("dashboard.analytics"),
			url: "/analytics",
			icon: <ChartBarIcon />,
		},
	];

	const navSecondary = [
		{
			title: t("dashboard.settings"),
			url: "/settings",
			icon: <SettingsIcon />,
		},
		{
			title: t("dashboard.help"),
			url: "https://docs.spile.dev",
			icon: <QuestionMarkCircleIcon />,
			outlink: true,
		},
	];

	return (
		<Sidebar collapsible="offcanvas" {...props} variant="inset">
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							className="data-[slot=sidebar-menu-button]:p-1.5! flex items-center gap-2 mb-2.5"
							render={<Link to="/" />}
						>
							<div className="flex size-8 items-center justify-center rounded-md ">
								<img src={logoImg} alt="Spile Logo" />
							</div>
							<span className="text-lg font-bold">Spile</span>
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

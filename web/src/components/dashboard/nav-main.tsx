import { Link } from "react-router-dom";
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";

export interface NavItem {
	title: string;
	url: string;
	icon?: React.ReactNode;
	outlink?: boolean;
}

export function NavMain({
	items,
	currentPath,
}: {
	items: NavItem[];
	currentPath: string;
}) {
	return (
		<SidebarGroup>
			<SidebarGroupContent className="flex flex-col gap-2">
				<SidebarMenu>
					{items.map((item) => (
						<SidebarMenuItem key={item.title}>
							<SidebarMenuButton
								tooltip={item.title}
								isActive={currentPath === item.url}
								render={<Link to={item.url} />}
								className="flex items-center gap-2 text-[0.75rem] font-semibold"
							>
								{item.icon}
								<span>{item.title}</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					))}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	);
}

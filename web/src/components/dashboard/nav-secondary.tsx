import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { NavItem } from "./nav-main";

export function NavSecondary({
	items,
	currentPath,
	...props
}: {
	items: NavItem[];
	currentPath: string;
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
	return (
		<SidebarGroup {...props}>
			<SidebarGroupContent>
				<SidebarMenu>
					{items.map((item) => (
						<SidebarMenuItem key={item.title}>
							<SidebarMenuButton
								isActive={currentPath === item.url}
								render={
									item.outlink ? (
										// biome-ignore lint/a11y/useAnchorContent: Children are provided by SidebarMenuButton
										<a
											href={item.url}
											target="_blank"
											rel="noopener noreferrer"
										/>
									) : (
										<Link to={item.url} />
									)
								}
								className="flex items-center gap-2 text-[0.75rem] font-semibold"
							>
								{item.icon}
								<span>{item.title}</span>
								{item.outlink && (
									<span className="ml-auto font-bold">
										<ArrowTopRightOnSquareIcon />
									</span>
								)}
							</SidebarMenuButton>
						</SidebarMenuItem>
					))}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	);
}

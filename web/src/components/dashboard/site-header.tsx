import { useLocation } from "react-router-dom";
import { ModeToggle } from "@/components/theme/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

const PAGE_TITLES: Record<string, string> = {
	"/": "Dashboard",
	"/posts": "Posts",
	"/tags": "Tags",
	"/media": "Media",
	"/members": "Members",
	"/newsletters": "Newsletters",
	"/analytics": "Analytics",
	"/team": "Team",
	"/settings": "Settings",
	"/integrations": "Integrations",
	"/help": "Get help",
};

function titleForPath(pathname: string): string {
	if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
	const match = Object.keys(PAGE_TITLES)
		.filter((key) => key !== "/")
		.find((key) => pathname.startsWith(`${key}/`));
	return match ? PAGE_TITLES[match] : "Spile";
}

export function SiteHeader({
	onActionsRef,
}: {
	onActionsRef: (el: HTMLElement | null) => void;
}) {
	const { pathname } = useLocation();

	return (
		<header className="flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
			<div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
				<SidebarTrigger className="-ml-1" />
				<Separator
					orientation="vertical"
					className="mx-2 h-4 data-vertical:self-auto"
				/>
				<h1 className="text-base font-medium">{titleForPath(pathname)}</h1>
				<div className="ml-auto flex items-center gap-2" ref={onActionsRef} />
				<ModeToggle />
			</div>
		</header>
	);
}

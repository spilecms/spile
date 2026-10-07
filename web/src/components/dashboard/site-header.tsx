import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { NotificationsPopover } from "@/components/notifications/notifications-popover";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import LanguageSelector from "../i18n/language-selector";

const PATH_TITLE_KEYS: Record<string, string> = {
	"/": "dashboard.title",
	"/posts": "dashboard.posts",
	"/docs": "dashboard.docs",
	"/tags": "dashboard.tags",
	"/media": "dashboard.media",
	"/members": "dashboard.members",
	"/newsletters": "dashboard.newsletters",
	"/analytics": "dashboard.analytics",
	"/team": "dashboard.team",
	"/settings": "dashboard.settings",
	"/integrations": "dashboard.integrations",
	"/help": "dashboard.help",
};

export function SiteHeader({
	onActionsRef,
}: {
	onActionsRef: (el: HTMLElement | null) => void;
}) {
	const { pathname } = useLocation();
	const { t } = useTranslation();

	function titleForPath(path: string): string {
		const matchedKey =
			PATH_TITLE_KEYS[path] ||
			PATH_TITLE_KEYS[
				Object.keys(PATH_TITLE_KEYS)
					.filter((key) => key !== "/")
					.find((key) => path.startsWith(`${key}/`)) ?? ""
			];

		return matchedKey ? t(matchedKey) : "Spile";
	}

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
				<NotificationsPopover />
				<LanguageSelector />
			</div>
		</header>
	);
}

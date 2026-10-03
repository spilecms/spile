import { ConstructionIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { EmptyState } from "@/components/dashboard/empty-state";
import { HeaderActions } from "@/components/dashboard/header-actions";
import { Button } from "@/components/ui/button";

const ROUTE_KEYS: Record<string, string> = {
	"/tags": "tags",
	"/media": "media",
	"/members": "members",
	"/newsletters": "newsletters",
	"/analytics": "analytics",
	"/team": "team",
	"/settings": "settings",
	"/integrations": "integrations",
	"/help": "help",
};

export default function PlaceholderPage() {
	const { pathname } = useLocation();
	const { t } = useTranslation();

	const routeKey = ROUTE_KEYS[pathname];
	const title = routeKey
		? t(`placeholders.${routeKey}.title`)
		: t("placeholders.fallbackTitle");
	const description = routeKey
		? t(`placeholders.${routeKey}.description`)
		: t("placeholders.fallbackDesc");

	return (
		<div className="flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
			<HeaderActions>
				<Button size="sm" variant="outline" disabled>
					{t("placeholders.comingSoon")}
				</Button>
			</HeaderActions>
			<EmptyState
				icon={ConstructionIcon}
				title={title}
				description={description}
			/>
		</div>
	);
}

import { ConstructionIcon } from "lucide-react";
import { useLocation } from "react-router-dom";
import { EmptyState } from "@/components/dashboard/empty-state";
import { HeaderActions } from "@/components/dashboard/header-actions";
import { Button } from "@/components/ui/button";

const COPY: Record<string, { title: string; description: string }> = {
	"/tags": {
		title: "Tags are coming soon",
		description:
			"Organize posts with tags and internal labels. This area ships in Phase 2.",
	},
	"/media": {
		title: "Media library is coming soon",
		description:
			"Uploads, images, video, and audio will be managed here. This area ships in Phase 2.",
	},
	"/members": {
		title: "Members are coming soon",
		description:
			"Newsletter subscribers and membership management live here. This area ships in Phase 3.",
	},
	"/newsletters": {
		title: "Newsletters are coming soon",
		description:
			"Design newsletters and send issues to your members. This area ships in Phase 3.",
	},
	"/analytics": {
		title: "Analytics are coming soon",
		description:
			"Traffic, top content, and audience insights will appear here. This area ships in Phase 4.",
	},
	"/team": {
		title: "Team management is coming soon",
		description:
			"Invite teammates and manage roles here. This area ships in Phase 4.",
	},
	"/settings": {
		title: "Settings are coming soon",
		description:
			"Site, branding, navigation, and email settings will live here. This area ships in Phase 5.",
	},
	"/integrations": {
		title: "Integrations are coming soon",
		description:
			"Connect third-party services and manage API keys here. This area ships in Phase 5.",
	},
	"/help": {
		title: "Help is coming soon",
		description: "Documentation and support resources will appear here.",
	},
};

export default function PlaceholderPage() {
	const { pathname } = useLocation();
	const copy = COPY[pathname] ?? {
		title: "This area is coming soon",
		description: "We're still building this part of Spile.",
	};

	return (
		<div className="flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
			<HeaderActions>
				<Button size="sm" variant="outline" disabled>
					Coming soon
				</Button>
			</HeaderActions>
			<EmptyState
				icon={ConstructionIcon}
				title={copy.title}
				description={copy.description}
			/>
		</div>
	);
}

import { Code2, Globe, Plug, Tag as TagIcon, Users } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { ApiKeysSection } from "@/components/settings/api-keys-section";
import { IntegrationsSection } from "@/components/settings/integrations-section";
import { LocalesSection } from "@/components/settings/locales-section";
import { TagsSection } from "@/components/settings/tags-section";
import { TeamSection } from "@/components/settings/team-section";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS = [
	{ id: "locales", label: "Languages", icon: Globe },
	{ id: "tags", label: "Tags & Taxonomy", icon: TagIcon },
	{ id: "integrations", label: "Integrations Hub", icon: Plug },
	{ id: "api-keys", label: "Developers & API", icon: Code2 },
	{ id: "team", label: "Team & Access", icon: Users },
] as const;

type SettingsTab = (typeof TABS)[number]["id"];

export default function SettingsPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const activeTab = (searchParams.get("tab") ?? "locales") as SettingsTab;

	const handleTabChange = (newTab: string) => {
		const next = new URLSearchParams(searchParams);
		if (newTab === "locales") {
			next.delete("tab");
		} else {
			next.set("tab", newTab);
		}
		setSearchParams(next, { replace: true });
	};

	return (
		<div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-6 max-w-6xl w-full mx-auto">
			{/* Page Header */}
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold tracking-tight text-foreground">
					Settings & Integrations
				</h1>
				<p className="text-sm text-muted-foreground">
					Manage languages, post tags, storage, email delivery, AI copilot, and
					developer APIs.
				</p>
			</div>

			{/* Main Settings Tabs */}
			<Tabs
				value={activeTab}
				onValueChange={handleTabChange}
				className="flex flex-col gap-6"
			>
				<TabsList className="h-10 p-1 bg-muted/60 self-start border border-border/40">
					{TABS.map((tab) => {
						const Icon = tab.icon;
						return (
							<TabsTrigger
								key={tab.id}
								value={tab.id}
								className="gap-2 text-xs font-medium px-3.5 data-[state=active]:bg-background data-[state=active]:shadow-xs"
							>
								<Icon className="size-3.5" />
								<span>{tab.label}</span>
							</TabsTrigger>
						);
					})}
				</TabsList>

				<TabsContent value="locales" className="mt-0 outline-none">
					<LocalesSection />
				</TabsContent>

				<TabsContent value="tags" className="mt-0 outline-none">
					<TagsSection />
				</TabsContent>

				<TabsContent value="integrations" className="mt-0 outline-none">
					<IntegrationsSection />
				</TabsContent>

				<TabsContent value="api-keys" className="mt-0 outline-none">
					<ApiKeysSection />
				</TabsContent>

				<TabsContent value="team" className="mt-0 outline-none">
					<TeamSection />
				</TabsContent>
			</Tabs>
		</div>
	);
}

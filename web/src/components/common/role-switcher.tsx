import type { UserRole } from "@/types/domain";

export const ROLE_LABELS: Record<
	UserRole,
	{ label: string; badge: string; color: string }
> = {
	owner: {
		label: "Owner",
		badge: "Owner",
		color:
			"bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
	},
	admin: {
		label: "Admin",
		badge: "Admin",
		color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
	},
	editor: {
		label: "Editor",
		badge: "Editor",
		color:
			"bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
	},
	author: {
		label: "Author",
		badge: "Author",
		color:
			"bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
	},
	contributor: {
		label: "Contributor",
		badge: "Contributor",
		color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
	},
};

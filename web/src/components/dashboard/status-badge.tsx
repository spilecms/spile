import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import type { PostStatus } from "@/types/domain";

const STATUS_STYLE: Record<PostStatus, string> = {
	draft: "bg-muted text-muted-foreground",
	published: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
	scheduled: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
	trashed: "bg-destructive/10 text-destructive",
};

export function StatusBadge({ status }: { status: PostStatus }) {
	const { t } = useTranslation();
	return (
		<Badge
			variant="outline"
			className={`border-transparent ${STATUS_STYLE[status]}`}
		>
			{t(`common.status.${status}`)}
		</Badge>
	);
}

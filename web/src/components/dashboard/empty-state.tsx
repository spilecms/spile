import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
	icon: Icon,
	title,
	description,
	action,
}: {
	icon: LucideIcon;
	title: string;
	description: string;
	action?: ReactNode;
}) {
	return (
		<div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-16 text-center">
			<div className="flex size-12 items-center justify-center rounded-full bg-muted">
				<Icon className="size-6 text-muted-foreground" aria-hidden />
			</div>
			<div className="flex flex-col gap-1">
				<h2 className="text-base font-medium">{title}</h2>
				<p className="max-w-sm text-sm text-muted-foreground">{description}</p>
			</div>
			{action}
		</div>
	);
}

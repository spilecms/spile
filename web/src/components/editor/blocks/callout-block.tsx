import { defaultProps } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";
import {
	AlertCircle,
	AlertTriangle,
	CheckCircle,
	Info,
	Lightbulb,
} from "lucide-react";

export type CalloutType = "info" | "tip" | "warning" | "danger" | "note";

const CALLOUT_STYLES: Record<
	CalloutType,
	{
		border: string;
		bg: string;
		icon: React.ComponentType<{ className?: string }>;
		iconColor: string;
		label: string;
	}
> = {
	info: {
		border: "border-blue-500/30",
		bg: "bg-blue-500/10",
		icon: Info,
		iconColor: "text-blue-500",
		label: "Info",
	},
	tip: {
		border: "border-emerald-500/30",
		bg: "bg-emerald-500/10",
		icon: Lightbulb,
		iconColor: "text-emerald-500",
		label: "Tip",
	},
	warning: {
		border: "border-amber-500/30",
		bg: "bg-amber-500/10",
		icon: AlertTriangle,
		iconColor: "text-amber-500",
		label: "Warning",
	},
	danger: {
		border: "border-red-500/30",
		bg: "bg-red-500/10",
		icon: AlertCircle,
		iconColor: "text-red-500",
		label: "Danger",
	},
	note: {
		border: "border-purple-500/30",
		bg: "bg-purple-500/10",
		icon: CheckCircle,
		iconColor: "text-purple-500",
		label: "Note",
	},
};

export const CalloutBlock = createReactBlockSpec(
	{
		type: "callout",
		propSchema: {
			...defaultProps,
			type: {
				default: "info",
				values: ["info", "tip", "warning", "danger", "note"] as const,
			},
		},
		content: "inline",
	},
	{
		render: ({ block, contentRef }) => {
			const type = (block.props.type as CalloutType) || "info";
			const style = CALLOUT_STYLES[type] || CALLOUT_STYLES.info;
			const IconComponent = style.icon;

			return (
				<div
					className={`flex items-start gap-3 my-2 p-3.5 rounded-lg border ${style.border} ${style.bg} transition-colors`}
				>
					<div className={`shrink-0 mt-0.5 ${style.iconColor}`}>
						<IconComponent className="w-5 h-5" />
					</div>
					<div className="flex-1 min-w-0 outline-none leading-relaxed text-foreground text-sm">
						<span ref={contentRef} />
					</div>
				</div>
			);
		},
	},
);

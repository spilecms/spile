import { defaultProps } from "@blocknote/core";
import {
	createReactBlockSpec,
	type ReactCustomBlockRenderProps,
} from "@blocknote/react";
import { ListOrdered } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface TocEntry {
	id: string;
	text: string;
	level: number;
}

const tocConfig = {
	type: "toc" as const,
	propSchema: {
		...defaultProps,
	},
	content: "none" as const,
};

function TocContent(props: ReactCustomBlockRenderProps<typeof tocConfig>) {
	const { editor } = props;
	const [entries, setEntries] = useState<TocEntry[]>([]);

	useEffect(() => {
		const collectHeadings = () => {
			const headings: TocEntry[] = [];
			const traverse = (blocks: Array<Record<string, unknown>>) => {
				for (const b of blocks) {
					if (b.type === "heading") {
						let text = "";
						if (Array.isArray(b.content)) {
							for (const c of b.content) {
								if (
									c &&
									typeof c === "object" &&
									"text" in c &&
									typeof (c as { text: unknown }).text === "string"
								) {
									text += (c as { text: string }).text;
								}
							}
						}
						const p = b.props as { level?: number } | undefined;
						const level = p?.level || 2;
						if (text.trim().length > 0) {
							headings.push({
								id: typeof b.id === "string" ? b.id : "",
								text: text.trim(),
								level,
							});
						}
					}
					if (Array.isArray(b.children) && b.children.length > 0) {
						traverse(b.children as Array<Record<string, unknown>>);
					}
				}
			};
			traverse(editor.document as unknown as Array<Record<string, unknown>>);
			setEntries(headings);
		};

		collectHeadings();
		return editor.onChange(() => {
			collectHeadings();
		});
	}, [editor]);

	const minLevel =
		entries.length > 0 ? Math.min(...entries.map((e) => e.level)) : 1;

	const scrollToBlock = (id: string) => {
		const domEl = document.querySelector(`[data-id="${id}"]`);
		if (domEl) {
			domEl.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	};

	return (
		<nav
			aria-label="Table of contents"
			className="w-full my-4 rounded-xl border border-border bg-card/60 p-4 shadow-xs text-foreground backdrop-blur-xs select-none"
		>
			<div className="flex items-center gap-2 border-b border-border/40 pb-2 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
				<ListOrdered className="w-4 h-4 text-primary" />
				<span>Table of Contents</span>
			</div>

			{entries.length === 0 ? (
				<div className="py-2 text-xs text-muted-foreground/70 italic">
					Add headings to generate an inline table of contents.
				</div>
			) : (
				<ul className="flex flex-col gap-1">
					{entries.map((entry) => {
						const depth = Math.max(0, entry.level - minLevel);
						return (
							<li key={entry.id}>
								<button
									type="button"
									onMouseDown={(e) => e.preventDefault()}
									onClick={() => scrollToBlock(entry.id)}
									style={{ paddingLeft: `${depth * 1 + 0.5}rem` }}
									className={cn(
										"flex w-full items-center text-left py-1 pr-2 rounded text-xs transition-colors hover:bg-accent/60 hover:text-foreground text-muted-foreground truncate",
										entry.level === 1 && "font-semibold text-foreground",
										entry.level === 2 && "font-medium",
									)}
								>
									<span className="truncate">{entry.text}</span>
								</button>
							</li>
						);
					})}
				</ul>
			)}
		</nav>
	);
}

export const TocBlock = createReactBlockSpec(tocConfig, {
	render: TocContent,
});

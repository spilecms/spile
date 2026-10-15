import { defaultProps } from "@blocknote/core";
import {
	createReactBlockSpec,
	createReactInlineContentSpec,
	type ReactCustomBlockRenderProps,
	type ReactCustomInlineContentRenderProps,
} from "@blocknote/react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/** Renders a LaTeX formula to KaTeX HTML. Never throws — invalid input renders as a muted error. */
function renderKatex(formula: string, displayMode: boolean): string {
	try {
		return katex.renderToString(formula || "\\ ", {
			displayMode,
			throwOnError: false,
			strict: false,
			output: "html",
		});
	} catch {
		return '<span class="text-destructive text-xs">Invalid formula</span>';
	}
}

/* ---------------------------------- block --------------------------------- */

const mathBlockConfig = {
	type: "mathBlock" as const,
	propSchema: {
		...defaultProps,
		formula: {
			default: "",
		},
	},
	content: "none" as const,
};

function MathBlockContent(
	props: ReactCustomBlockRenderProps<typeof mathBlockConfig>,
) {
	const { block, editor } = props;
	const editable = editor.isEditable;
	const formula = block.props.formula;

	return (
		<div className="my-4 w-full overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-xs">
			{/* Rendered formula */}
			<div
				className="math-block-display flex min-h-12 items-center justify-center overflow-x-auto px-6 py-4 text-center"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: KaTeX renders sanitized HTML from the formula
				dangerouslySetInnerHTML={{ __html: renderKatex(formula, true) }}
			/>
			{/* LaTeX source editor */}
			{editable ? (
				<Textarea
					value={formula}
					onChange={(e) =>
						editor.updateBlock(block, { props: { formula: e.target.value } })
					}
					placeholder="Enter a LaTeX formula, e.g. E = mc^2"
					spellCheck={false}
					className="min-h-10 resize-none rounded-none border-0 border-t border-border bg-muted/40 px-4 py-2.5 font-mono text-xs text-muted-foreground shadow-none focus-visible:ring-0 focus-visible:bg-background dark:bg-muted/40"
				/>
			) : (
				<div className="border-t border-border px-4 py-2 font-mono text-[11px] text-muted-foreground/70">
					{formula || "Empty formula"}
				</div>
			)}
		</div>
	);
}

export const MathBlock = createReactBlockSpec(mathBlockConfig, {
	render: MathBlockContent,
});

/* ---------------------------------- inline --------------------------------- */

const mathInlineConfig = {
	type: "math" as const,
	propSchema: {
		formula: {
			default: "",
		},
	},
	content: "none" as const,
};

function MathInlineContent(
	props: ReactCustomInlineContentRenderProps<typeof mathInlineConfig, never>,
) {
	const { inlineContent, updateInlineContent, editor } = props;
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(inlineContent.props.formula);
	const inputRef = useRef<HTMLInputElement>(null);
	const editable = editor.isEditable;
	const formula = inlineContent.props.formula;

	useEffect(() => {
		if (editing) inputRef.current?.focus();
	}, [editing]);

	const commit = () => {
		updateInlineContent({ type: "math", props: { formula: draft } });
		setEditing(false);
	};

	if (editing && editable) {
		return (
			<input
				ref={inputRef}
				value={draft}
				onChange={(e) => setDraft(e.target.value)}
				onBlur={commit}
				onKeyDown={(e) => {
					e.stopPropagation();
					if (e.key === "Enter") commit();
					if (e.key === "Escape") {
						setDraft(formula);
						setEditing(false);
					}
				}}
				className="mx-0.5 inline-block h-6 w-44 rounded border border-border bg-background px-1.5 align-middle font-mono text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
				placeholder="LaTeX formula…"
				spellCheck={false}
			/>
		);
	}

	const openEditor = () => {
		if (!editable) return;
		setDraft(formula);
		setEditing(true);
	};

	return (
		<button
			type="button"
			className={cn(
				"mx-0.5 inline-flex cursor-pointer items-center rounded border-0 bg-transparent px-1 py-0.5 align-middle font-inherit transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
				!formula && "text-muted-foreground italic",
			)}
			title={editable ? "Click to edit formula" : formula}
			onClick={openEditor}
			// biome-ignore lint/security/noDangerouslySetInnerHtml: KaTeX renders sanitized HTML from the formula
			dangerouslySetInnerHTML={{
				__html: formula ? renderKatex(formula, false) : "⁇ formula",
			}}
		/>
	);
}

export const MathInline = createReactInlineContentSpec(mathInlineConfig, {
	render: MathInlineContent,
});

import {
	type BlockNoteEditor,
	BlockNoteSchema,
	defaultBlockSpecs,
	defaultInlineContentSpecs,
	insertOrUpdateBlockForSlashMenu,
} from "@blocknote/core";
import { getDefaultReactSlashMenuItems } from "@blocknote/react";
import {
	AlertCircle,
	ChevronDownSquare,
	Code2,
	Layers,
	ListOrdered,
	Sigma,
	SlidersHorizontal,
	SquareFunction,
} from "lucide-react";
import { AccordionBlock } from "./accordion-block";
import { CalloutBlock } from "./callout-block";
import { CodeGroupBlock } from "./code-group-block";
import { MathBlock, MathInline } from "./math-block";
import { ParamFieldBlock } from "./param-field-block";
import { ResponseFieldBlock } from "./response-field-block";
import { TocBlock } from "./toc-block";

export const schema = BlockNoteSchema.create({
	blockSpecs: {
		...defaultBlockSpecs,
		accordion: AccordionBlock(),
		callout: CalloutBlock(),
		paramField: ParamFieldBlock(),
		responseField: ResponseFieldBlock(),
		toc: TocBlock(),
		codeGroup: CodeGroupBlock(),
		mathBlock: MathBlock(),
	},
	inlineContentSpecs: {
		...defaultInlineContentSpecs,
		math: MathInline,
	},
});

export type CustomBlockNoteSchema = typeof schema;

export function getCustomSlashMenuItems(
	editor: BlockNoteEditor<
		typeof schema.blockSchema,
		typeof schema.inlineContentSchema,
		typeof schema.styleSchema
	>,
) {
	return [
		...getDefaultReactSlashMenuItems(editor),
		// API Components
		{
			title: "Param Field",
			onItemClick: () => {
				insertOrUpdateBlockForSlashMenu(editor, {
					type: "paramField",
				});
			},
			aliases: ["param", "parameter", "field", "query", "body"],
			group: "API Components",
			icon: <SlidersHorizontal className="w-4 h-4" />,
			subtext: "API endpoint parameter documentation",
		},
		{
			title: "Response Field",
			onItemClick: () => {
				insertOrUpdateBlockForSlashMenu(editor, {
					type: "responseField",
				});
			},
			aliases: ["response", "response-field", "schema"],
			group: "API Components",
			icon: <Layers className="w-4 h-4" />,
			subtext: "API response property documentation",
		},
		{
			title: "Code Group",
			onItemClick: () => {
				insertOrUpdateBlockForSlashMenu(editor, {
					type: "codeGroup",
				});
			},
			aliases: ["code-group", "tabs", "snippets", "multi-code"],
			group: "API Components",
			icon: <Code2 className="w-4 h-4" />,
			subtext: "Tabbed code snippets (cURL, JS, Python, etc.)",
		},
		// Advanced Documentation Blocks
		{
			title: "Table of Contents",
			onItemClick: () => {
				insertOrUpdateBlockForSlashMenu(editor, {
					type: "toc",
				});
			},
			aliases: ["toc", "table of contents", "outline"],
			group: "Advanced",
			icon: <ListOrdered className="w-4 h-4" />,
			subtext: "In-document table of contents",
		},
		{
			title: "Accordion / Details",
			onItemClick: () => {
				insertOrUpdateBlockForSlashMenu(editor, {
					type: "accordion",
				});
			},
			aliases: ["accordion", "details", "toggle", "collapse"],
			group: "Advanced",
			icon: <ChevronDownSquare className="w-4 h-4" />,
			subtext: "Collapsible section with nested blocks",
		},
		{
			title: "Callout",
			onItemClick: () => {
				insertOrUpdateBlockForSlashMenu(editor, {
					type: "callout",
				});
			},
			aliases: ["callout", "alert", "note", "warning", "info", "tip"],
			group: "Advanced",
			icon: <AlertCircle className="w-4 h-4" />,
			subtext: "Highlighted info, warning, or tip banner",
		},
		// Math
		{
			title: "Math Block",
			onItemClick: () => {
				insertOrUpdateBlockForSlashMenu(editor, {
					type: "mathBlock",
					props: { formula: "" },
				});
			},
			aliases: ["math", "formula", "equation", "latex", "katex", "block"],
			group: "Math",
			icon: <SquareFunction className="w-4 h-4" />,
			subtext: "Block-level formula rendered with KaTeX",
		},
		{
			title: "Inline Math",
			onItemClick: () => {
				editor.insertInlineContent([
					{
						type: "math",
						props: { formula: "" },
					},
				]);
			},
			aliases: ["math", "formula", "equation", "inline", "latex", "katex"],
			group: "Math",
			icon: <Sigma className="w-4 h-4" />,
			subtext: "Inline formula rendered with KaTeX",
		},
	];
}

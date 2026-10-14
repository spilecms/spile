import {
	type BlockNoteEditor,
	BlockNoteSchema,
	defaultBlockSpecs,
	insertOrUpdateBlockForSlashMenu,
} from "@blocknote/core";
import { getDefaultReactSlashMenuItems } from "@blocknote/react";
import { AlertCircle, ChevronDownSquare } from "lucide-react";
import { AccordionBlock } from "./accordion-block";
import { CalloutBlock } from "./callout-block";

export const schema = BlockNoteSchema.create({
	blockSpecs: {
		...defaultBlockSpecs,
		accordion: AccordionBlock(),
		callout: CalloutBlock(),
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
	];
}

import { defaultProps } from "@blocknote/core";
import { createReactBlockSpec, ToggleWrapper } from "@blocknote/react";

export const AccordionBlock = createReactBlockSpec(
	{
		type: "accordion",
		propSchema: {
			...defaultProps,
		},
		content: "inline",
	},
	{
		render: ({ block, editor, contentRef }) => {
			return (
				<ToggleWrapper block={block} editor={editor}>
					<div className="font-semibold text-foreground/90 py-1 outline-none min-h-[1.5em]">
						<span ref={contentRef} />
					</div>
				</ToggleWrapper>
			);
		},
	},
);

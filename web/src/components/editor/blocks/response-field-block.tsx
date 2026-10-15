import { defaultProps } from "@blocknote/core";
import {
	createReactBlockSpec,
	type ReactCustomBlockRenderProps,
} from "@blocknote/react";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const COMMON_RESPONSE_TYPES = [
	"string",
	"number",
	"boolean",
	"object",
	"array",
	"array<object>",
	"array<string>",
	"null",
	"any",
] as const;

const responseFieldConfig = {
	type: "responseField" as const,
	propSchema: {
		...defaultProps,
		name: {
			default: "response_field",
		},
		type: {
			default: "string",
		},
		required: {
			default: true,
		},
	},
	content: "inline" as const,
};

function ResponseFieldContent(
	props: ReactCustomBlockRenderProps<typeof responseFieldConfig>,
) {
	const { block, editor, contentRef } = props;
	const [typeMenuOpen, setTypeMenuOpen] = useState(false);

	const name = block.props.name;
	const fieldType = block.props.type;
	const required = Boolean(block.props.required);

	return (
		<div className="w-full my-3 rounded-lg border border-border bg-card p-3 shadow-xs transition-colors text-foreground">
			{/* Header row */}
			<div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2 mb-2 text-xs">
				<div className="flex flex-wrap items-center gap-2">
					{/* Field Name input */}
					<input
						type="text"
						value={name}
						disabled={!editor.isEditable}
						onChange={(e) => {
							editor.updateBlock(block, {
								props: { name: e.target.value },
							});
						}}
						placeholder="field_name"
						className="rounded bg-muted/50 px-2 py-0.5 font-mono text-xs font-semibold text-foreground focus:bg-background focus:outline-none focus:ring-1 focus:ring-ring border border-transparent focus:border-border"
					/>

					{/* Type Dropdown */}
					<div className="relative">
						<button
							type="button"
							disabled={!editor.isEditable}
							onClick={() => setTypeMenuOpen(!typeMenuOpen)}
							className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground hover:bg-muted/80 transition-colors"
						>
							<span>{fieldType}</span>
							<ChevronDown className="w-3 h-3 opacity-60" />
						</button>
						{typeMenuOpen && editor.isEditable && (
							<div className="absolute left-0 top-full z-30 mt-1 min-w-[90px] rounded-md border border-border bg-popover p-1 shadow-md">
								{COMMON_RESPONSE_TYPES.map((t) => (
									<button
										key={t}
										type="button"
										onClick={() => {
											editor.updateBlock(block, {
												props: { type: t },
											});
											setTypeMenuOpen(false);
										}}
										className={cn(
											"flex w-full items-center rounded px-2 py-1 text-left font-mono text-[11px] hover:bg-accent hover:text-accent-foreground",
											fieldType === t && "font-semibold text-primary",
										)}
									>
										{t}
									</button>
								))}
							</div>
						)}
					</div>

					{/* Required toggle pill */}
					<button
						type="button"
						disabled={!editor.isEditable}
						onClick={() => {
							editor.updateBlock(block, {
								props: { required: !required },
							});
						}}
						className={cn(
							"rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider font-semibold transition-colors cursor-pointer",
							required
								? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
								: "bg-muted text-muted-foreground border border-border",
						)}
					>
						{required ? "required" : "optional"}
					</button>
				</div>

				<span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-primary uppercase">
					response
				</span>
			</div>

			{/* Editable inline description area */}
			<div
				ref={contentRef}
				className="min-h-[24px] text-sm leading-relaxed text-muted-foreground focus:outline-none"
			/>
		</div>
	);
}

export const ResponseFieldBlock = createReactBlockSpec(responseFieldConfig, {
	render: ResponseFieldContent,
});

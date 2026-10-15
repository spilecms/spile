import { defaultProps } from "@blocknote/core";
import {
	createReactBlockSpec,
	type ReactCustomBlockRenderProps,
} from "@blocknote/react";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const PARAM_LOCATIONS = ["query", "path", "header", "body"] as const;
const COMMON_TYPES = [
	"string",
	"number",
	"boolean",
	"object",
	"array",
	"file",
] as const;

const paramFieldConfig = {
	type: "paramField" as const,
	propSchema: {
		...defaultProps,
		name: {
			default: "param_name",
		},
		paramType: {
			default: "query",
		},
		type: {
			default: "string",
		},
		required: {
			default: true,
		},
		defaultValue: {
			default: "",
		},
	},
	content: "inline" as const,
};

function ParamFieldContent(
	props: ReactCustomBlockRenderProps<typeof paramFieldConfig>,
) {
	const { block, editor, contentRef } = props;
	const [locMenuOpen, setLocMenuOpen] = useState(false);
	const [typeMenuOpen, setTypeMenuOpen] = useState(false);

	const name = block.props.name;
	const paramType = block.props.paramType;
	const paramDataType = block.props.type;
	const required = Boolean(block.props.required);
	const defaultValue = block.props.defaultValue;

	return (
		<div className="w-full my-3 rounded-lg border border-border bg-card p-3 shadow-xs transition-colors text-foreground">
			{/* Header row */}
			<div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2 mb-2 text-xs">
				<div className="flex flex-wrap items-center gap-2">
					{/* Name input */}
					<input
						type="text"
						value={name}
						disabled={!editor.isEditable}
						onChange={(e) => {
							editor.updateBlock(block, {
								props: { name: e.target.value },
							});
						}}
						placeholder="parameter_name"
						className="rounded bg-muted/50 px-2 py-0.5 font-mono text-xs font-semibold text-foreground focus:bg-background focus:outline-none focus:ring-1 focus:ring-ring border border-transparent focus:border-border"
					/>

					{/* Param Location Dropdown */}
					<div className="relative">
						<button
							type="button"
							disabled={!editor.isEditable}
							onClick={() => {
								setLocMenuOpen(!locMenuOpen);
								setTypeMenuOpen(false);
							}}
							className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 font-mono text-[11px] text-secondary-foreground hover:bg-secondary/80 transition-colors"
						>
							<span>{paramType}</span>
							<ChevronDown className="w-3 h-3 opacity-60" />
						</button>
						{locMenuOpen && editor.isEditable && (
							<div className="absolute left-0 top-full z-30 mt-1 min-w-[80px] rounded-md border border-border bg-popover p-1 shadow-md">
								{PARAM_LOCATIONS.map((loc) => (
									<button
										key={loc}
										type="button"
										onClick={() => {
											editor.updateBlock(block, {
												props: { paramType: loc },
											});
											setLocMenuOpen(false);
										}}
										className={cn(
											"flex w-full items-center rounded px-2 py-1 text-left font-mono text-[11px] hover:bg-accent hover:text-accent-foreground",
											paramType === loc && "font-semibold text-primary",
										)}
									>
										{loc}
									</button>
								))}
							</div>
						)}
					</div>

					{/* Type Dropdown */}
					<div className="relative">
						<button
							type="button"
							disabled={!editor.isEditable}
							onClick={() => {
								setTypeMenuOpen(!typeMenuOpen);
								setLocMenuOpen(false);
							}}
							className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground hover:bg-muted/80 transition-colors"
						>
							<span>{paramDataType}</span>
							<ChevronDown className="w-3 h-3 opacity-60" />
						</button>
						{typeMenuOpen && editor.isEditable && (
							<div className="absolute left-0 top-full z-30 mt-1 min-w-[90px] rounded-md border border-border bg-popover p-1 shadow-md">
								{COMMON_TYPES.map((t) => (
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
											paramDataType === t && "font-semibold text-primary",
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
								? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
								: "bg-muted text-muted-foreground border border-border",
						)}
					>
						{required ? "required" : "optional"}
					</button>
				</div>

				{/* Default value */}
				<div className="flex items-center gap-1 text-[11px] text-muted-foreground">
					<span>default:</span>
					<input
						type="text"
						value={defaultValue}
						disabled={!editor.isEditable}
						onChange={(e) => {
							editor.updateBlock(block, {
								props: { defaultValue: e.target.value },
							});
						}}
						placeholder="none"
						className="w-20 rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[11px] text-foreground focus:bg-background focus:outline-none focus:ring-1 focus:ring-ring border border-transparent focus:border-border"
					/>
				</div>
			</div>

			{/* Editable inline description area */}
			<div
				ref={contentRef}
				className="min-h-[24px] text-sm leading-relaxed text-muted-foreground focus:outline-none"
			/>
		</div>
	);
}

export const ParamFieldBlock = createReactBlockSpec(paramFieldConfig, {
	render: ParamFieldContent,
});

import { defaultProps } from "@blocknote/core";
import {
	createReactBlockSpec,
	type ReactCustomBlockRenderProps,
} from "@blocknote/react";
import {
	CheckIcon,
	PlusIcon,
	Square2StackIcon,
	XMarkIcon,
} from "@heroicons/react/24/solid";
import hljs from "highlight.js/lib/common";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/** Highlight source code with highlight.js; falls back to escaped plain text. */
function highlightCode(code: string, language: string): string {
	if (language && hljs.getLanguage(language)) {
		try {
			return hljs.highlight(code, { language }).value;
		} catch {
			// fall through to escaped plain text
		}
	}
	return code
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

/**
 * Editable code area with syntax highlighting: a highlighted <pre> sits behind
 * a transparent-text <textarea> (identical font metrics), so the code stays
 * editable while the highlight shows through.
 */
function CodeEditor({
	value,
	language,
	onChange,
	placeholder,
}: {
	value: string;
	language: string;
	onChange: (next: string) => void;
	placeholder?: string;
}) {
	const preRef = useRef<HTMLPreElement>(null);
	const highlighted = useMemo(
		() => highlightCode(value, language),
		[value, language],
	);

	const syncScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
		const pre = preRef.current;
		if (pre) {
			pre.scrollTop = e.currentTarget.scrollTop;
			pre.scrollLeft = e.currentTarget.scrollLeft;
		}
	};

	return (
		<div className="code-editor relative min-h-24 font-mono text-xs leading-relaxed">
			<pre
				ref={preRef}
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 m-0 overflow-auto whitespace-pre-wrap break-words px-4 py-3"
			>
				<code
					className={cn("hljs", language && `language-${language}`)}
					// biome-ignore lint/security/noDangerouslySetInnerHtml: highlight.js escapes the source; output is safe highlighted HTML
					dangerouslySetInnerHTML={{ __html: `${highlighted}\n` }}
				/>
			</pre>
			<textarea
				value={value}
				onChange={(e) => onChange(e.target.value)}
				onScroll={syncScroll}
				onKeyDown={(e) => {
					e.stopPropagation();
					if (e.key === "Tab") {
						e.preventDefault();
						const el = e.currentTarget;
						const { selectionStart: start, selectionEnd: end, value: v } = el;
						onChange(`${v.slice(0, start)}  ${v.slice(end)}`);
						requestAnimationFrame(() => {
							el.selectionStart = el.selectionEnd = start + 2;
						});
					}
				}}
				placeholder={placeholder}
				spellCheck={false}
				className="relative m-0 block min-h-24 w-full resize-none overflow-auto whitespace-pre-wrap break-words bg-transparent px-4 py-3 font-mono text-xs leading-relaxed text-transparent caret-foreground shadow-none outline-none [field-sizing:content] focus-visible:ring-0 dark:bg-transparent"
			/>
		</div>
	);
}

interface CodeTab {
	id: string;
	label: string;
	language: string;
	code: string;
}

const SUPPORTED_LANGUAGES = [
	"javascript",
	"typescript",
	"python",
	"go",
	"bash",
	"json",
	"html",
	"css",
	"sql",
	"yaml",
	"markdown",
] as const;

const DEFAULT_TABS: CodeTab[] = [
	{
		id: "t1",
		label: "cURL",
		language: "bash",
		code: "curl -X GET https://api.spile.dev/v1/posts \\\n  -H 'Authorization: Bearer YOUR_API_KEY'",
	},
	{
		id: "t2",
		label: "JavaScript",
		language: "javascript",
		code: "const res = await fetch('https://api.spile.dev/v1/posts', {\n  headers: { Authorization: 'Bearer YOUR_API_KEY' }\n});\nconst data = await res.json();",
	},
];

const codeGroupConfig = {
	type: "codeGroup" as const,
	propSchema: {
		...defaultProps,
		tabsJson: {
			default: JSON.stringify(DEFAULT_TABS),
		},
		activeTabIndex: {
			default: 0,
		},
	},
	content: "none" as const,
};

function parseTabs(json: string | undefined): CodeTab[] {
	try {
		const parsed = JSON.parse(json || "[]");
		if (Array.isArray(parsed) && parsed.length > 0) return parsed;
	} catch {
		// fall through to fallback
	}
	return [{ id: "t1", label: "Example", language: "bash", code: "" }];
}

function CodeGroupContent(
	props: ReactCustomBlockRenderProps<typeof codeGroupConfig>,
) {
	const { block, editor } = props;
	const editable = editor.isEditable;

	const [copied, setCopied] = useState(false);
	const [renamingId, setRenamingId] = useState<string | null>(null);
	const [draftLabel, setDraftLabel] = useState("");

	const tabs = useMemo(
		() => parseTabs(block.props.tabsJson),
		[block.props.tabsJson],
	);

	const activeIndex = Math.min(
		Math.max(0, block.props.activeTabIndex || 0),
		tabs.length - 1,
	);
	const currentTab = tabs[activeIndex];

	const save = (nextTabs: CodeTab[], nextActive: number = activeIndex) => {
		editor.updateBlock(block, {
			props: {
				tabsJson: JSON.stringify(nextTabs),
				activeTabIndex: nextActive,
			},
		});
	};

	const patchTab = (idx: number, patch: Partial<CodeTab>) => {
		save(tabs.map((t, i) => (i === idx ? { ...t, ...patch } : t)));
	};

	const addTab = () => {
		const next = [
			...tabs,
			{
				id: Math.random().toString(36).slice(2, 7),
				label: `Tab ${tabs.length + 1}`,
				language: "javascript",
				code: "",
			},
		];
		save(next, next.length - 1);
	};

	const removeTab = (idx: number) => {
		const next = tabs.filter((_, i) => i !== idx);
		save(next, Math.max(0, idx <= activeIndex ? activeIndex - 1 : activeIndex));
	};

	const startRename = (tab: CodeTab) => {
		if (!editable) return;
		setRenamingId(tab.id);
		setDraftLabel(tab.label);
	};

	const commitRename = (idx: number) => {
		const label = draftLabel.trim();
		if (label) patchTab(idx, { label });
		setRenamingId(null);
	};

	const handleCopy = async () => {
		await navigator.clipboard.writeText(currentTab.code);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	};

	return (
		<div className="my-4 w-full overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
			{/* Header */}
			<div className="flex items-center justify-between gap-2 border-b bg-muted/50 px-2 py-1.5">
				<Tabs
					value={currentTab.id}
					onValueChange={(id) => {
						const idx = tabs.findIndex((t) => t.id === id);
						if (idx !== -1) save(tabs, idx);
					}}
					className="min-w-0 flex-1"
				>
					<div className="flex items-center gap-1 overflow-x-auto">
						<TabsList className="h-auto gap-0.5 bg-transparent p-0">
							{tabs.map((tab, idx) => (
								<div key={tab.id} className="group relative flex items-center">
									{renamingId === tab.id ? (
										<Input
											autoFocus
											value={draftLabel}
											onChange={(e) => setDraftLabel(e.target.value)}
											onBlur={() => commitRename(idx)}
											onKeyDown={(e) => {
												e.stopPropagation();
												if (e.key === "Enter") commitRename(idx);
												if (e.key === "Escape") setRenamingId(null);
											}}
											className="h-6 w-28 px-2 text-xs"
										/>
									) : (
										<TabsTrigger
											value={tab.id}
											onDoubleClick={() => startRename(tab)}
											title={editable ? "Double-click to rename" : undefined}
											className={cn(
												"h-6 rounded-md px-2 text-xs",
												"data-active:bg-background data-active:shadow-sm data-[state=active]:bg-background data-[state=active]:shadow-sm",
												editable && tabs.length > 1 && "group-hover:pr-7",
											)}
										>
											{tab.label || "Untitled"}
										</TabsTrigger>
									)}

									{editable && tabs.length > 1 && renamingId !== tab.id && (
										<Button
											type="button"
											variant="ghost"
											size="icon"
											aria-label={`Remove ${tab.label}`}
											onClick={() => removeTab(idx)}
											className="absolute right-1 size-5 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
										>
											<XMarkIcon className="size-3" />
										</Button>
									)}
								</div>
							))}
						</TabsList>

						{editable && (
							<Button
								type="button"
								variant="ghost"
								size="icon"
								title="Add code tab"
								aria-label="Add code tab"
								onClick={addTab}
								className="size-7 shrink-0"
							>
								<PlusIcon className="size-4" />
							</Button>
						)}
					</div>
				</Tabs>

				<div className="flex shrink-0 items-center gap-1.5">
					{editable ? (
						<Select
							value={currentTab.language}
							onValueChange={(language) => {
								if (language) patchTab(activeIndex, { language });
							}}
						>
							<SelectTrigger className="h-7 w-30 font-mono text-xs">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{SUPPORTED_LANGUAGES.map((lang) => (
									<SelectItem
										key={lang}
										value={lang}
										className="font-mono text-xs"
									>
										{lang}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					) : (
						<span className="px-2 font-mono text-xs text-muted-foreground">
							{currentTab.language}
						</span>
					)}

					<Button
						type="button"
						variant="ghost"
						size="icon"
						aria-label="Copy code"
						title="Copy code"
						onClick={handleCopy}
						className="size-7"
					>
						{copied ? (
							<CheckIcon className="size-4 text-emerald-500" />
						) : (
							<Square2StackIcon className="size-4 text-muted-foreground" />
						)}
					</Button>
				</div>
			</div>

			{/* Body */}
			{editable ? (
				<CodeEditor
					value={currentTab.code}
					language={currentTab.language}
					onChange={(next) => patchTab(activeIndex, { code: next })}
					placeholder="Enter code here..."
				/>
			) : (
				<pre className="overflow-x-auto px-4 py-3 font-mono text-xs leading-relaxed">
					<code
						className={cn(
							"hljs",
							currentTab.language && `language-${currentTab.language}`,
						)}
						// biome-ignore lint/security/noDangerouslySetInnerHtml: highlight.js escapes the source; output is safe highlighted HTML
						dangerouslySetInnerHTML={{
							__html: highlightCode(currentTab.code, currentTab.language),
						}}
					/>
				</pre>
			)}
		</div>
	);
}

export const CodeGroupBlock = createReactBlockSpec(codeGroupConfig, {
	render: CodeGroupContent,
});

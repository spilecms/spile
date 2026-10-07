import type {
	BlockTool,
	BlockToolConstructorOptions,
	BlockToolData,
	ToolboxConfig,
} from "@editorjs/editorjs";

export type CalloutType = "info" | "tip" | "warning" | "danger" | "note";

export interface CalloutData extends BlockToolData {
	type: CalloutType;
	title?: string;
	message: string;
}

const CALLOUT_CONFIGS: Record<
	CalloutType,
	{
		label: string;
		icon: string;
		borderClass: string;
		bgClass: string;
		textClass: string;
		badgeClass: string;
	}
> = {
	info: {
		label: "Info",
		icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
		borderClass: "border-blue-500/40",
		bgClass: "bg-blue-500/10",
		textClass: "text-blue-600 dark:text-blue-400",
		badgeClass: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
	},
	tip: {
		label: "Tip",
		icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>`,
		borderClass: "border-emerald-500/40",
		bgClass: "bg-emerald-500/10",
		textClass: "text-emerald-600 dark:text-emerald-400",
		badgeClass: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
	},
	warning: {
		label: "Warning",
		icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
		borderClass: "border-amber-500/40",
		bgClass: "bg-amber-500/10",
		textClass: "text-amber-600 dark:text-amber-400",
		badgeClass: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
	},
	danger: {
		label: "Danger",
		icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
		borderClass: "border-rose-500/40",
		bgClass: "bg-rose-500/10",
		textClass: "text-rose-600 dark:text-rose-400",
		badgeClass: "bg-rose-500/20 text-rose-700 dark:text-rose-300",
	},
	note: {
		label: "Note",
		icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
		borderClass: "border-zinc-500/30",
		bgClass: "bg-zinc-500/10",
		textClass: "text-zinc-600 dark:text-zinc-400",
		badgeClass: "bg-zinc-500/20 text-zinc-700 dark:text-zinc-300",
	},
};

export default class CalloutTool implements BlockTool {
	private readOnly: boolean;
	private data: CalloutData;
	private container: HTMLElement | null = null;
	private titleInput: HTMLElement | null = null;
	private messageInput: HTMLElement | null = null;
	private iconContainer: HTMLElement | null = null;

	static get isReadOnlySupported(): boolean {
		return true;
	}

	// Prevents Editor.js from treating this block as "empty" when the cursor is on
	// it and the user picks another block from the toolbox. Without this, EJS falls
	// back to replacing the current block instead of inserting a new one after it.
	static get isEmpty(): boolean {
		return false;
	}

	static get toolbox(): ToolboxConfig {
		return {
			icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
			title: "Callout",
		};
	}

	constructor({ data, readOnly }: BlockToolConstructorOptions<CalloutData>) {
		this.readOnly = Boolean(readOnly);
		this.data = {
			type: data?.type || "info",
			title: data?.title || "",
			message: data?.message || "",
		};
	}

	render(): HTMLElement {
		const config = CALLOUT_CONFIGS[this.data.type] || CALLOUT_CONFIGS.info;

		const wrapper = document.createElement("div");
		wrapper.className = `my-4 rounded-xl border p-4 transition-all duration-200 ${config.borderClass} ${config.bgClass}`;
		this.container = wrapper;

		// Top row: Type selector badge & Title
		const header = document.createElement("div");
		header.className = "flex items-center gap-2.5 mb-2";

		// Icon container
		const iconEl = document.createElement("div");
		iconEl.className = `shrink-0 ${config.textClass}`;
		iconEl.innerHTML = config.icon;
		this.iconContainer = iconEl;
		header.appendChild(iconEl);

		// Type dropdown toggle button (editable only)
		if (!this.readOnly) {
			const typeSelect = document.createElement("select");
			typeSelect.className =
				"text-xs font-semibold uppercase tracking-wider rounded-md px-1.5 py-0.5 border border-border/40 bg-background/60 text-foreground cursor-pointer outline-none focus:ring-1 focus:ring-primary";
			for (const key of Object.keys(CALLOUT_CONFIGS) as CalloutType[]) {
				const opt = document.createElement("option");
				opt.value = key;
				opt.textContent = CALLOUT_CONFIGS[key].label;
				if (key === this.data.type) opt.selected = true;
				typeSelect.appendChild(opt);
			}
			typeSelect.addEventListener("change", (e) => {
				const target = e.target as HTMLSelectElement;
				this.changeType(target.value as CalloutType);
			});
			header.appendChild(typeSelect);
		} else {
			const badge = document.createElement("span");
			badge.className = `text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${config.badgeClass}`;
			badge.textContent = config.label;
			header.appendChild(badge);
		}

		// Optional title input
		const titleEl = document.createElement("div");
		titleEl.className =
			"font-semibold text-sm flex-1 outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50";
		titleEl.contentEditable = this.readOnly ? "false" : "true";
		titleEl.setAttribute("data-placeholder", "Callout title (optional)...");
		titleEl.textContent = this.data.title || "";
		titleEl.addEventListener("input", () => {
			this.data.title = titleEl.textContent || "";
		});
		this.titleInput = titleEl;
		header.appendChild(titleEl);

		wrapper.appendChild(header);

		// Message body
		const messageEl = document.createElement("div");
		messageEl.className =
			"text-sm leading-relaxed text-foreground/90 pl-7 outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50";
		messageEl.contentEditable = this.readOnly ? "false" : "true";
		messageEl.setAttribute(
			"data-placeholder",
			"Write your callout information, note, or warning here...",
		);
		messageEl.innerHTML = this.data.message || "";
		messageEl.addEventListener("input", () => {
			this.data.message = messageEl.innerHTML;
		});
		this.messageInput = messageEl;

		wrapper.appendChild(messageEl);

		return wrapper;
	}

	private changeType(newType: CalloutType) {
		if (!this.container || !this.iconContainer) return;
		this.data.type = newType;
		const config = CALLOUT_CONFIGS[newType] || CALLOUT_CONFIGS.info;

		// Update wrapper styles
		this.container.className = `my-4 rounded-xl border p-4 transition-all duration-200 ${config.borderClass} ${config.bgClass}`;
		this.iconContainer.className = `shrink-0 ${config.textClass}`;
		this.iconContainer.innerHTML = config.icon;
	}

	save(): CalloutData {
		return {
			type: this.data.type,
			title: this.titleInput?.textContent?.trim() || "",
			message: this.messageInput?.innerHTML?.trim() || "",
		};
	}
}

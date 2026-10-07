import type {
	BlockTool,
	BlockToolConstructorOptions,
	BlockToolData,
	ToolboxConfig,
} from "@editorjs/editorjs";

export interface AccordionData extends BlockToolData {
	title: string;
	content: string;
	defaultOpen?: boolean;
}

export default class AccordionTool implements BlockTool {
	private readOnly: boolean;
	private data: AccordionData;
	private summaryInput: HTMLElement | null = null;
	private contentInput: HTMLElement | null = null;
	private detailsEl: HTMLDetailsElement | null = null;

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
			icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 10 3 3 3-3"/></svg>`,
			title: "Accordion / Details",
		};
	}

	constructor({ data, readOnly }: BlockToolConstructorOptions<AccordionData>) {
		this.readOnly = Boolean(readOnly);
		this.data = {
			title: data?.title || "",
			content: data?.content || "",
			defaultOpen: data?.defaultOpen ?? false,
		};
	}

	render(): HTMLElement {
		const details = document.createElement("details");
		details.className =
			"my-4 rounded-xl border border-border/70 bg-card/60 shadow-xs transition-colors overflow-hidden group";
		if (this.data.defaultOpen || !this.readOnly) {
			details.open = true;
		}
		this.detailsEl = details;

		const summary = document.createElement("summary");
		summary.className =
			"flex items-center justify-between cursor-pointer list-none px-4 py-3 font-semibold text-sm text-foreground select-none hover:bg-muted/40 transition-colors";

		const summaryWrapper = document.createElement("div");
		summaryWrapper.className = "flex items-center gap-2.5 flex-1 min-w-0";

		// Custom chevron
		const chevron = document.createElement("span");
		chevron.className =
			"shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-90";
		chevron.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`;
		summaryWrapper.appendChild(chevron);

		// Title editable element
		const titleEl = document.createElement("div");
		titleEl.className =
			"flex-1 outline-none font-medium empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50";
		titleEl.contentEditable = this.readOnly ? "false" : "true";
		titleEl.setAttribute(
			"data-placeholder",
			"Details / Accordion Title (e.g. FAQ question or extra info)...",
		);
		titleEl.textContent = this.data.title || "";
		titleEl.addEventListener("input", () => {
			this.data.title = titleEl.textContent || "";
		});
		// Prevent click on title from collapsing the details while typing
		titleEl.addEventListener("click", (e) => {
			if (!this.readOnly) e.stopPropagation();
		});
		this.summaryInput = titleEl;
		summaryWrapper.appendChild(titleEl);

		summary.appendChild(summaryWrapper);
		details.appendChild(summary);

		// Content body
		const contentBody = document.createElement("div");
		contentBody.className = "border-t border-border/40 px-4 py-3 bg-muted/15";

		const contentEl = document.createElement("div");
		contentEl.className =
			"text-sm leading-relaxed text-foreground/90 outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50";
		contentEl.contentEditable = this.readOnly ? "false" : "true";
		contentEl.setAttribute(
			"data-placeholder",
			"Write collapsible details, expanded explanations, or logs here...",
		);
		contentEl.innerHTML = this.data.content || "";
		contentEl.addEventListener("input", () => {
			this.data.content = contentEl.innerHTML;
		});
		this.contentInput = contentEl;
		contentBody.appendChild(contentEl);

		details.appendChild(contentBody);

		return details;
	}

	save(): AccordionData {
		return {
			title: this.summaryInput?.textContent?.trim() || "",
			content: this.contentInput?.innerHTML?.trim() || "",
			defaultOpen: this.detailsEl?.open ?? false,
		};
	}
}

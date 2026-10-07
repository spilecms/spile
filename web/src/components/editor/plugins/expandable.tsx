import type {
	BlockTool,
	BlockToolConstructorOptions,
	BlockToolData,
	ToolboxConfig,
} from "@editorjs/editorjs";

export interface ExpandableData extends BlockToolData {
	title: string;
	badge: string;
	defaultOpen: boolean;
	content: string;
}

const EXPANDABLE_ICON =
	'<svg class="popover_block_icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="8" x="3" y="3" rx="2"/><path d="M7 15h10"/><path d="M9 19h6"/><circle cx="12" cy="7" r="1"/></svg>';

const CHEVRON_RIGHT_ICON =
	'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>';

export default class ExpandableTool implements BlockTool {
	static get toolbox(): ToolboxConfig {
		return {
			icon: EXPANDABLE_ICON,
			title: "Expandable",
		};
	}

	static get isReadOnlySupported(): boolean {
		return true;
	}

	// Prevents Editor.js from treating this block as "empty" when the cursor is on
	// it and the user picks another block from the toolbox. Without this, EJS falls
	// back to replacing the current block instead of inserting a new one after it.
	static get isEmpty(): boolean {
		return false;
	}

	private data: ExpandableData;
	private readOnly: boolean;

	private wrapper!: HTMLDetailsElement;
	private titleInput!: HTMLInputElement;
	private badgeInput!: HTMLInputElement;
	private bodyEl!: HTMLElement;

	constructor({
		data,
		readOnly = false,
	}: BlockToolConstructorOptions<ExpandableData>) {
		this.readOnly = readOnly;
		this.data = {
			title: data?.title || "Show child properties",
			badge: data?.badge || "object",
			defaultOpen: data?.defaultOpen ?? false,
			content: data?.content || "",
		};
	}

	render(): HTMLElement {
		this.wrapper = document.createElement("details");
		this.wrapper.className = "ce-api-expandable";
		if (this.data.defaultOpen || !this.readOnly) {
			this.wrapper.open = true;
		}

		// Summary
		const summary = document.createElement("summary");
		summary.className = "ce-api-expandable__summary";

		const summaryLeft = document.createElement("div");
		summaryLeft.className = "ce-api-expandable__summary-left";

		const chevron = document.createElement("span");
		chevron.className = "ce-api-expandable__chevron";
		chevron.innerHTML = CHEVRON_RIGHT_ICON;

		this.titleInput = document.createElement("input");
		this.titleInput.className = "ce-api-expandable__title-input";
		this.titleInput.placeholder = "Expandable title...";
		this.titleInput.value = this.data.title;
		this.titleInput.readOnly = this.readOnly;
		this.titleInput.addEventListener("click", (e) => {
			if (!this.readOnly) {
				e.stopPropagation();
			}
		});
		this.titleInput.addEventListener("input", () => {
			this.data.title = this.titleInput.value;
		});
		this.titleInput.addEventListener("keydown", (e) => {
			e.stopPropagation();
			if (e.key === "Enter") {
				e.preventDefault();
				this.bodyEl.focus();
			}
		});

		summaryLeft.append(chevron, this.titleInput);

		// Badge input
		this.badgeInput = document.createElement("input");
		this.badgeInput.className = "ce-api-expandable__badge";
		this.badgeInput.placeholder = "type";
		this.badgeInput.value = this.data.badge;
		this.badgeInput.readOnly = this.readOnly;
		this.badgeInput.addEventListener("click", (e) => {
			if (!this.readOnly) {
				e.stopPropagation();
			}
		});
		this.badgeInput.addEventListener("input", () => {
			this.data.badge = this.badgeInput.value;
		});
		this.badgeInput.addEventListener("keydown", (e) => e.stopPropagation());

		summary.append(summaryLeft, this.badgeInput);

		// Body
		this.bodyEl = document.createElement("div");
		this.bodyEl.className = "ce-api-expandable__body";
		this.bodyEl.setAttribute(
			"data-placeholder",
			"Enter nested attributes or details...",
		);
		this.bodyEl.textContent = this.data.content;
		if (!this.readOnly) {
			this.bodyEl.contentEditable = "true";
			this.bodyEl.spellcheck = false;
			this.bodyEl.addEventListener("input", () => {
				this.data.content = this.bodyEl.textContent || "";
			});
			this.bodyEl.addEventListener("keydown", (e) => {
				e.stopPropagation();
			});
		}

		this.wrapper.append(summary, this.bodyEl);
		this.attachHoverListeners();

		return this.wrapper;
	}

	private attachHoverListeners(): void {
		const triggerToolbar = () => {
			if (this.readOnly) return;
			const blockEl = this.wrapper.closest(".ce-block");
			if (blockEl) {
				blockEl.dispatchEvent(
					new MouseEvent("mousemove", { bubbles: true, cancelable: true }),
				);
			}
		};
		this.wrapper.addEventListener("mouseenter", triggerToolbar);
	}

	save(): ExpandableData {
		return {
			title: (this.titleInput ? this.titleInput.value : this.data.title).trim(),
			badge: (this.badgeInput ? this.badgeInput.value : this.data.badge).trim(),
			defaultOpen: this.wrapper ? this.wrapper.open : this.data.defaultOpen,
			content: this.bodyEl
				? (this.bodyEl.textContent || "").trim()
				: this.data.content,
		};
	}

	validate(savedData: ExpandableData): boolean {
		return typeof savedData.title === "string";
	}

	static get sanitize() {
		return {
			title: false,
			badge: false,
			defaultOpen: false,
			content: true,
		};
	}
}

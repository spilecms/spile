import type {
	BlockTool,
	BlockToolConstructorOptions,
	BlockToolData,
	ToolboxConfig,
} from "@editorjs/editorjs";

export interface ResponseFieldData extends BlockToolData {
	name: string;
	type: string;
	required: boolean;
	description: string;
}

const RESPONSE_ICON =
	'<svg class="popover_block_icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>';

const CHEVRON_DOWN_ICON =
	'<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>';

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
];

export default class ResponseFieldTool implements BlockTool {
	static get toolbox(): ToolboxConfig {
		return {
			icon: RESPONSE_ICON,
			title: "Response Fields",
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

	private data: ResponseFieldData;
	private readOnly: boolean;

	private wrapper!: HTMLElement;
	private nameInput!: HTMLInputElement;
	private typeBadge!: HTMLElement;
	private reqBadge!: HTMLElement;
	private descEl!: HTMLElement;

	private popoverEl: HTMLElement | null = null;
	private documentClickHandler: ((e: MouseEvent) => void) | null = null;

	constructor({
		data,
		readOnly = false,
	}: BlockToolConstructorOptions<ResponseFieldData>) {
		this.readOnly = readOnly;
		this.data = {
			name: data?.name || "response_field",
			type: data?.type || "string",
			required: data?.required ?? true,
			description: data?.description || "",
		};
	}

	render(): HTMLElement {
		this.wrapper = document.createElement("div");
		this.wrapper.className = "ce-api-field";

		// Header
		const header = document.createElement("div");
		header.className = "ce-api-field__header";

		const headerLeft = document.createElement("div");
		headerLeft.className = "ce-api-field__header-left";

		// Name input
		this.nameInput = document.createElement("input");
		this.nameInput.className = "ce-api-field__name-input";
		this.nameInput.placeholder = "field_name";
		this.nameInput.value = this.data.name;
		this.nameInput.readOnly = this.readOnly;
		this.nameInput.addEventListener("input", () => {
			this.data.name = this.nameInput.value;
		});
		this.nameInput.addEventListener("keydown", (e) => {
			e.stopPropagation();
			if (e.key === "Enter") {
				e.preventDefault();
				this.descEl.focus();
			}
		});

		// Type badge
		this.typeBadge = document.createElement("span");
		this.typeBadge.className = "ce-api-field__badge ce-api-field__badge--type";
		this.updateTypeBadge();
		if (!this.readOnly) {
			this.typeBadge.addEventListener("click", (e) => {
				e.stopPropagation();
				this.toggleTypePopover();
			});
		}

		// Required toggle badge
		this.reqBadge = document.createElement("span");
		this.updateReqBadge();
		if (!this.readOnly) {
			this.reqBadge.addEventListener("click", (e) => {
				e.stopPropagation();
				this.data.required = !this.data.required;
				this.updateReqBadge();
			});
		}

		headerLeft.append(this.nameInput, this.typeBadge, this.reqBadge);

		// Response indicator label
		const responseLabel = document.createElement("span");
		responseLabel.className = "ce-api-field__badge ce-api-field__badge--loc";
		responseLabel.textContent = "response";

		header.append(headerLeft, responseLabel);

		// Description area
		this.descEl = document.createElement("div");
		this.descEl.className = "ce-api-field__desc";
		this.descEl.setAttribute(
			"data-placeholder",
			"Enter response field description...",
		);
		this.descEl.textContent = this.data.description;
		if (!this.readOnly) {
			this.descEl.contentEditable = "true";
			this.descEl.spellcheck = false;
			this.descEl.addEventListener("input", () => {
				this.data.description = this.descEl.textContent || "";
			});
			this.descEl.addEventListener("keydown", (e) => {
				e.stopPropagation();
			});
		}

		this.wrapper.append(header, this.descEl);

		this.setupDocumentClickListener();
		this.attachHoverListeners();

		return this.wrapper;
	}

	private updateTypeBadge(): void {
		this.typeBadge.innerHTML = `${this.data.type} ${this.readOnly ? "" : CHEVRON_DOWN_ICON}`;
	}

	private updateReqBadge(): void {
		if (this.data.required) {
			this.reqBadge.className =
				"ce-api-field__badge ce-api-field__badge--required";
			this.reqBadge.textContent = "required";
		} else {
			this.reqBadge.className =
				"ce-api-field__badge ce-api-field__badge--optional";
			this.reqBadge.textContent = "optional";
		}
	}

	private toggleTypePopover(): void {
		if (this.popoverEl) {
			this.closePopover();
			return;
		}

		const pop = document.createElement("div");
		pop.className = "ce-api-field__popover";
		pop.style.left = `${this.typeBadge.offsetLeft}px`;

		for (const t of COMMON_RESPONSE_TYPES) {
			const item = document.createElement("button");
			item.type = "button";
			item.className = `ce-api-field__popover-item ${t === this.data.type ? "is-active" : ""}`;
			item.textContent = t;
			item.addEventListener("click", (e) => {
				e.stopPropagation();
				this.data.type = t;
				this.updateTypeBadge();
				this.closePopover();
			});
			pop.append(item);
		}

		this.popoverEl = pop;
		this.wrapper.append(pop);
	}

	private closePopover(): void {
		if (this.popoverEl) {
			this.popoverEl.remove();
			this.popoverEl = null;
		}
	}

	private setupDocumentClickListener(): void {
		this.documentClickHandler = (e: MouseEvent) => {
			if (!this.popoverEl) return;
			const target = e.target as HTMLElement;
			if (
				!this.popoverEl.contains(target) &&
				!this.typeBadge.contains(target)
			) {
				this.closePopover();
			}
		};
		document.addEventListener("click", this.documentClickHandler);
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

	save(): ResponseFieldData {
		return {
			name: (this.nameInput ? this.nameInput.value : this.data.name).trim(),
			type: this.data.type,
			required: this.data.required,
			description: this.descEl
				? (this.descEl.textContent || "").trim()
				: this.data.description,
		};
	}

	validate(savedData: ResponseFieldData): boolean {
		return typeof savedData.name === "string";
	}

	static get sanitize() {
		return {
			name: false,
			type: false,
			required: false,
			description: true,
		};
	}

	destroy(): void {
		if (this.documentClickHandler) {
			document.removeEventListener("click", this.documentClickHandler);
			this.documentClickHandler = null;
		}
		this.closePopover();
	}
}

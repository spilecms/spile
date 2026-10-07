import type {
	BlockTool,
	BlockToolConstructorOptions,
	BlockToolData,
	ToolboxConfig,
} from "@editorjs/editorjs";

export interface ParamFieldData extends BlockToolData {
	name: string;
	type: string;
	paramType: "body" | "query" | "path" | "header";
	required: boolean;
	defaultValue?: string;
	description: string;
}

const PARAM_ICON =
	'<svg class="popover_block_icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1"/><path d="M16 21h1a2 2 0 0 0 2-2v-5a2 2 0 0 1 2-2 2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1"/></svg>';

const CHEVRON_DOWN_ICON =
	'<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>';

const COMMON_TYPES = [
	"string",
	"number",
	"integer",
	"boolean",
	"object",
	"array",
	"file",
	"any",
];

const PARAM_LOCATIONS = ["body", "query", "path", "header"] as const;

export default class ParamFieldTool implements BlockTool {
	static get toolbox(): ToolboxConfig {
		return {
			icon: PARAM_ICON,
			title: "Parameter Fields",
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

	private data: ParamFieldData;
	private readOnly: boolean;

	private wrapper!: HTMLElement;
	private nameInput!: HTMLInputElement;
	private typeBadge!: HTMLElement;
	private locBadge!: HTMLElement;
	private reqBadge!: HTMLElement;
	private defaultInput!: HTMLInputElement;
	private descEl!: HTMLElement;

	private activePopover: "type" | "loc" | null = null;
	private popoverEl: HTMLElement | null = null;
	private documentClickHandler: ((e: MouseEvent) => void) | null = null;

	constructor({
		data,
		readOnly = false,
	}: BlockToolConstructorOptions<ParamFieldData>) {
		this.readOnly = readOnly;
		this.data = {
			name: data?.name || "param_name",
			type: data?.type || "string",
			paramType: data?.paramType || "body",
			required: data?.required ?? true,
			defaultValue: data?.defaultValue || "",
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
		this.nameInput.placeholder = "parameter_name";
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
				this.togglePopover("type");
			});
		}

		// Location badge
		this.locBadge = document.createElement("span");
		this.locBadge.className = "ce-api-field__badge ce-api-field__badge--loc";
		this.updateLocBadge();
		if (!this.readOnly) {
			this.locBadge.addEventListener("click", (e) => {
				e.stopPropagation();
				this.togglePopover("loc");
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

		headerLeft.append(
			this.nameInput,
			this.typeBadge,
			this.locBadge,
			this.reqBadge,
		);

		// Header right: default value
		const defaultWrap = document.createElement("div");
		defaultWrap.className = "ce-api-field__default-wrap";

		const defaultLabel = document.createElement("span");
		defaultLabel.textContent = "default:";

		this.defaultInput = document.createElement("input");
		this.defaultInput.className = "ce-api-field__default-input";
		this.defaultInput.placeholder = "none";
		this.defaultInput.value = this.data.defaultValue || "";
		this.defaultInput.readOnly = this.readOnly;
		this.defaultInput.addEventListener("input", () => {
			this.data.defaultValue = this.defaultInput.value;
		});
		this.defaultInput.addEventListener("keydown", (e) => e.stopPropagation());

		defaultWrap.append(defaultLabel, this.defaultInput);
		header.append(headerLeft, defaultWrap);

		// Description area
		this.descEl = document.createElement("div");
		this.descEl.className = "ce-api-field__desc";
		this.descEl.setAttribute(
			"data-placeholder",
			"Enter parameter description...",
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

	private updateLocBadge(): void {
		this.locBadge.innerHTML = `${this.data.paramType} ${this.readOnly ? "" : CHEVRON_DOWN_ICON}`;
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

	private togglePopover(type: "type" | "loc"): void {
		if (this.activePopover === type) {
			this.closePopover();
			return;
		}
		this.closePopover();
		this.activePopover = type;

		const pop = document.createElement("div");
		pop.className = "ce-api-field__popover";

		if (type === "type") {
			pop.style.left = `${this.typeBadge.offsetLeft}px`;
			for (const t of COMMON_TYPES) {
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
		} else {
			pop.style.left = `${this.locBadge.offsetLeft}px`;
			for (const loc of PARAM_LOCATIONS) {
				const item = document.createElement("button");
				item.type = "button";
				item.className = `ce-api-field__popover-item ${loc === this.data.paramType ? "is-active" : ""}`;
				item.textContent = loc;
				item.addEventListener("click", (e) => {
					e.stopPropagation();
					this.data.paramType = loc;
					this.updateLocBadge();
					this.closePopover();
				});
				pop.append(item);
			}
		}

		this.popoverEl = pop;
		this.wrapper.append(pop);
	}

	private closePopover(): void {
		this.activePopover = null;
		if (this.popoverEl) {
			this.popoverEl.remove();
			this.popoverEl = null;
		}
	}

	private setupDocumentClickListener(): void {
		this.documentClickHandler = (e: MouseEvent) => {
			if (!this.activePopover) return;
			const target = e.target as HTMLElement;
			if (
				this.popoverEl &&
				!this.popoverEl.contains(target) &&
				!this.typeBadge.contains(target) &&
				!this.locBadge.contains(target)
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

	save(): ParamFieldData {
		return {
			name: (this.nameInput ? this.nameInput.value : this.data.name).trim(),
			type: this.data.type,
			paramType: this.data.paramType,
			required: this.data.required,
			defaultValue: this.defaultInput ? this.defaultInput.value.trim() : "",
			description: this.descEl
				? (this.descEl.textContent || "").trim()
				: this.data.description,
		};
	}

	validate(savedData: ParamFieldData): boolean {
		return typeof savedData.name === "string";
	}

	static get sanitize() {
		return {
			name: false,
			type: false,
			paramType: false,
			required: false,
			defaultValue: false,
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

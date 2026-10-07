import type {
	BlockTool,
	BlockToolConstructorOptions,
	BlockToolData,
	ToolboxConfig,
} from "@editorjs/editorjs";
import hljs from "highlight.js";
import "highlight.js/styles/atom-one-dark.css";
import { type LanguageOption, SUPPORTED_LANGUAGES } from "./code-highlight";

export interface RequestTab {
	id: string;
	label: string;
	language: string;
	code: string;
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RequestExampleData extends BlockToolData {
	method: HttpMethod;
	endpoint: string;
	tabs: RequestTab[];
	activeTabIndex?: number;
	showLineNumbers?: boolean;
	wrapLines?: boolean;
}

const REQUEST_ICON =
	'<svg class="popover_block_icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M15 3v18"/></svg>';

const PLUS_ICON =
	'<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';

const COPY_ICON =
	'<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';

const CHECK_ICON =
	'<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';

const CHEVRON_DOWN_ICON =
	'<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>';

const CLOSE_ICON =
	'<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

const HTTP_METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

export default class RequestExampleTool implements BlockTool {
	static get toolbox(): ToolboxConfig {
		return {
			icon: REQUEST_ICON,
			title: "Request Example",
		};
	}

	static get isReadOnlySupported(): boolean {
		return true;
	}

	static get enableLineBreaks(): boolean {
		return true;
	}

	// Prevents Editor.js from treating this block as "empty" when the cursor is on
	// it and the user picks another block from the toolbox. Without this, EJS falls
	// back to replacing the current block instead of inserting a new one after it.
	static get isEmpty(): boolean {
		return false;
	}

	private data: RequestExampleData;
	private readOnly: boolean;
	private activeIndex: number;

	private wrapper!: HTMLElement;
	private methodBadge!: HTMLButtonElement;
	private endpointInput!: HTMLInputElement;
	private tabsScroll!: HTMLElement;
	private languageBtn!: HTMLButtonElement;
	private languageLabel!: HTMLSpanElement;
	private copyBtn!: HTMLButtonElement;
	private languageDropdown!: HTMLElement;
	private methodPopover: HTMLElement | null = null;
	private gutterEl!: HTMLElement;
	private textarea!: HTMLTextAreaElement;
	private pre!: HTMLElement;
	private codeEl!: HTMLElement;

	private activeDropdown: "language" | "method" | null = null;
	private documentClickHandler: ((e: MouseEvent) => void) | null = null;

	constructor({
		data,
		readOnly = false,
	}: BlockToolConstructorOptions<RequestExampleData>) {
		this.readOnly = readOnly;

		const defaultTabs: RequestTab[] = [
			{
				id: "req-1",
				label: "cURL",
				language: "bash",
				code: `curl -X POST https://api.example.com/v1/users \\\n  -H "Authorization: Bearer <token>" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "name": "Alex",\n    "email": "alex@example.com"\n  }'`,
			},
			{
				id: "req-2",
				label: "JavaScript",
				language: "javascript",
				code: `const response = await fetch("https://api.example.com/v1/users", {\n  method: "POST",\n  headers: {\n    "Authorization": "Bearer <token>",\n    "Content-Type": "application/json",\n  },\n  body: JSON.stringify({\n    name: "Alex",\n    email: "alex@example.com",\n  }),\n});\nconst data = await response.json();`,
			},
			{
				id: "req-3",
				label: "Python",
				language: "python",
				code: `import requests\n\nurl = "https://api.example.com/v1/users"\nheaders = {"Authorization": "Bearer <token>"}\npayload = {"name": "Alex", "email": "alex@example.com"}\n\nresponse = requests.post(url, json=payload, headers=headers)\nprint(response.json())`,
			},
		];

		const tabs = data?.tabs && data.tabs.length > 0 ? data.tabs : defaultTabs;
		this.data = {
			method: data?.method || "POST",
			endpoint: data?.endpoint || "/v1/users",
			tabs,
			activeTabIndex: Math.min(
				Math.max(0, data?.activeTabIndex ?? 0),
				tabs.length - 1,
			),
			showLineNumbers: Boolean(data?.showLineNumbers),
			wrapLines: Boolean(data?.wrapLines),
		};
		this.activeIndex = this.data.activeTabIndex ?? 0;
	}

	render(): HTMLElement {
		this.wrapper = document.createElement("div");
		this.wrapper.className = "ce-code-card";

		// 1. Endpoint bar
		const endpointBar = document.createElement("div");
		endpointBar.className = "ce-api-endpoint-bar";

		this.methodBadge = document.createElement("button");
		this.methodBadge.type = "button";
		this.updateMethodBadge();
		if (!this.readOnly) {
			this.methodBadge.addEventListener("click", (e) => {
				e.stopPropagation();
				this.toggleMethodPopover();
			});
		}

		this.endpointInput = document.createElement("input");
		this.endpointInput.className = "ce-api-endpoint-input";
		this.endpointInput.placeholder = "/v1/endpoint";
		this.endpointInput.value = this.data.endpoint;
		this.endpointInput.readOnly = this.readOnly;
		this.endpointInput.addEventListener("input", () => {
			this.data.endpoint = this.endpointInput.value;
		});
		this.endpointInput.addEventListener("keydown", (e) => e.stopPropagation());

		endpointBar.append(this.methodBadge, this.endpointInput);

		// 2. Tabs bar
		const tabsBar = document.createElement("div");
		tabsBar.className = "ce-code-card__tabs-bar";

		this.tabsScroll = document.createElement("div");
		this.tabsScroll.className = "ce-code-card__tabs-scroll";

		const actionsContainer = document.createElement("div");
		actionsContainer.className = "ce-code-card__tabs-actions";

		// Language button trigger
		this.languageBtn = document.createElement("button");
		this.languageBtn.type = "button";
		this.languageBtn.className = "ce-code-card__pill-btn";
		this.languageBtn.title = "Select language";

		this.languageLabel = document.createElement("span");
		this.updateLanguageButtonLabel();

		const chevronSpan = document.createElement("span");
		chevronSpan.className = "ce-code-card__btn-icon";
		chevronSpan.innerHTML = CHEVRON_DOWN_ICON;

		this.languageBtn.append(this.languageLabel, chevronSpan);
		this.languageBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			this.toggleLanguageDropdown();
		});

		// Copy button
		this.copyBtn = document.createElement("button");
		this.copyBtn.type = "button";
		this.copyBtn.className = "ce-code-card__icon-btn";
		this.copyBtn.title = "Copy request code";
		this.copyBtn.innerHTML = COPY_ICON;
		this.copyBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			this.copyCode();
		});

		if (!this.readOnly) {
			actionsContainer.append(this.languageBtn);
		}
		actionsContainer.append(this.copyBtn);
		tabsBar.append(this.tabsScroll, actionsContainer);

		this.languageDropdown = this.buildLanguageDropdown();

		// 3. Viewport (Gutter + Code Layers)
		const viewport = document.createElement("div");
		viewport.className = "ce-code-card__viewport";

		this.gutterEl = document.createElement("div");
		this.gutterEl.className = "ce-code-card__gutter";
		this.gutterEl.setAttribute("aria-hidden", "true");
		this.gutterEl.hidden = !this.data.showLineNumbers;

		const editorArea = document.createElement("div");
		editorArea.className = "ce-code-card__editor-area";

		this.pre = document.createElement("pre");
		this.pre.className = "ce-code-card__pre";
		this.pre.setAttribute("aria-hidden", "true");

		this.codeEl = document.createElement("code");
		this.codeEl.className = "ce-code-card__code";
		this.pre.append(this.codeEl);

		this.textarea = document.createElement("textarea");
		this.textarea.className = "ce-code-card__textarea";
		this.textarea.spellcheck = false;
		this.textarea.autocomplete = "off";
		this.textarea.autocapitalize = "off";
		this.textarea.placeholder = "Enter request code…";
		this.textarea.value = this.data.tabs[this.activeIndex]?.code || "";
		this.textarea.readOnly = this.readOnly;

		this.textarea.addEventListener("input", () => {
			if (this.data.tabs[this.activeIndex]) {
				this.data.tabs[this.activeIndex].code = this.textarea.value;
			}
			this.highlight();
			this.updateLineNumbers();
		});

		this.textarea.addEventListener("keydown", (e) => {
			if (e.key === "Tab") {
				e.preventDefault();
				const start = this.textarea.selectionStart;
				const end = this.textarea.selectionEnd;
				const val = this.textarea.value;
				this.textarea.value = `${val.substring(0, start)}  ${val.substring(end)}`;
				this.textarea.selectionStart = this.textarea.selectionEnd = start + 2;
				if (this.data.tabs[this.activeIndex]) {
					this.data.tabs[this.activeIndex].code = this.textarea.value;
				}
				this.highlight();
				this.updateLineNumbers();
			}
		});

		this.textarea.addEventListener("scroll", () => {
			this.pre.scrollTop = this.textarea.scrollTop;
			this.pre.scrollLeft = this.textarea.scrollLeft;
			if (this.data.showLineNumbers) {
				this.gutterEl.scrollTop = this.textarea.scrollTop;
			}
		});

		editorArea.append(this.pre, this.textarea);
		viewport.append(this.gutterEl, editorArea);

		this.wrapper.append(viewport, tabsBar, endpointBar);

		this.renderTabs();
		this.updateLanguageButtonLabel();
		this.highlight();
		this.updateLineNumbers();

		this.setupDocumentClickListener();
		this.attachHoverListeners();

		return this.wrapper;
	}

	private updateMethodBadge(): void {
		this.methodBadge.className = `ce-api-method-badge ce-api-method-badge--${this.data.method}`;
		this.methodBadge.textContent = this.data.method;
	}

	private toggleMethodPopover(): void {
		if (this.methodPopover) {
			this.closeMethodPopover();
			return;
		}
		this.closeDropdowns();

		const pop = document.createElement("div");
		pop.className = "ce-api-field__popover";
		pop.style.top = "36px";
		pop.style.left = "10px";

		for (const m of HTTP_METHODS) {
			const item = document.createElement("button");
			item.type = "button";
			item.className = `ce-api-field__popover-item ${m === this.data.method ? "is-active" : ""}`;
			item.textContent = m;
			item.addEventListener("click", (e) => {
				e.stopPropagation();
				this.data.method = m;
				this.updateMethodBadge();
				this.closeMethodPopover();
			});
			pop.append(item);
		}

		this.methodPopover = pop;
		this.wrapper.append(pop);
	}

	private closeMethodPopover(): void {
		if (this.methodPopover) {
			this.methodPopover.remove();
			this.methodPopover = null;
		}
	}

	private renderTabs(): void {
		this.tabsScroll.innerHTML = "";

		this.data.tabs.forEach((tab, index) => {
			const tabEl = document.createElement("div");
			const isActive = index === this.activeIndex;
			tabEl.className = `ce-code-card__tab ${isActive ? "is-active" : ""}`;

			const labelEl = document.createElement("span");
			labelEl.className = "ce-code-card__tab-label";
			labelEl.textContent = tab.label || `Tab ${index + 1}`;
			labelEl.title = tab.label || `Tab ${index + 1}`;

			if (!this.readOnly) {
				labelEl.contentEditable = "true";
				labelEl.spellcheck = false;

				labelEl.addEventListener("click", () => {
					if (this.activeIndex !== index) {
						this.switchTab(index);
					}
				});

				labelEl.addEventListener("keydown", (e) => {
					e.stopPropagation();
					if (e.key === "Enter") {
						e.preventDefault();
						labelEl.blur();
					} else if (e.key === "Escape") {
						e.preventDefault();
						labelEl.textContent = tab.label || `Tab ${index + 1}`;
						labelEl.blur();
					}
				});

				labelEl.addEventListener("input", (e) => {
					e.stopPropagation();
					tab.label = labelEl.textContent || "";
				});

				labelEl.addEventListener("blur", () => {
					const trimmed = (labelEl.textContent || "").trim();
					tab.label = trimmed || `Tab ${index + 1}`;
					labelEl.textContent = tab.label;
					labelEl.title = tab.label;
				});
			}

			tabEl.append(labelEl);

			if (!this.readOnly && this.data.tabs.length > 1) {
				const closeBtn = document.createElement("button");
				closeBtn.type = "button";
				closeBtn.className = "ce-code-card__tab-close";
				closeBtn.title = "Delete tab";
				closeBtn.innerHTML = CLOSE_ICON;
				closeBtn.addEventListener("click", (e) => {
					e.stopPropagation();
					this.removeTab(index);
				});
				tabEl.append(closeBtn);
			}

			tabEl.addEventListener("click", () => {
				if (this.activeIndex !== index) {
					this.switchTab(index);
				}
			});

			this.tabsScroll.append(tabEl);
		});

		if (!this.readOnly) {
			const addBtn = document.createElement("button");
			addBtn.type = "button";
			addBtn.className = "ce-code-card__tab-add";
			addBtn.title = "Add tab";
			addBtn.innerHTML = PLUS_ICON;
			addBtn.addEventListener("click", (e) => {
				e.stopPropagation();
				this.addTab();
			});
			this.tabsScroll.append(addBtn);
		}
	}

	private switchTab(index: number): void {
		if (index < 0 || index >= this.data.tabs.length) return;

		if (this.textarea && this.data.tabs[this.activeIndex]) {
			this.data.tabs[this.activeIndex].code = this.textarea.value;
		}

		this.activeIndex = index;
		this.data.activeTabIndex = index;
		this.renderTabs();

		const currentTab = this.data.tabs[this.activeIndex];
		if (!currentTab) return;

		if (this.textarea) {
			this.textarea.value = currentTab.code || "";
			this.textarea.scrollTop = 0;
			this.textarea.scrollLeft = 0;
		}
		if (this.pre) {
			this.pre.scrollTop = 0;
			this.pre.scrollLeft = 0;
		}
		if (this.gutterEl) {
			this.gutterEl.scrollTop = 0;
		}

		this.updateLanguageButtonLabel();
		this.highlight();
		this.updateLineNumbers();
	}

	private addTab(): void {
		const newIndex = this.data.tabs.length + 1;
		this.data.tabs.push({
			id: `tab-${Date.now()}`,
			label: `Client ${newIndex}`,
			language: "bash",
			code: "",
		});
		this.switchTab(this.data.tabs.length - 1);
	}

	private removeTab(index: number): void {
		if (this.data.tabs.length <= 1) return;
		this.data.tabs.splice(index, 1);
		if (this.activeIndex >= this.data.tabs.length) {
			this.activeIndex = Math.max(0, this.data.tabs.length - 1);
		} else if (this.activeIndex > index) {
			this.activeIndex--;
		}
		this.switchTab(this.activeIndex);
	}

	private toggleLanguageDropdown(): void {
		if (this.activeDropdown === "language") {
			this.closeDropdowns();
			return;
		}
		this.closeDropdowns();
		this.activeDropdown = "language";

		if (!this.wrapper.contains(this.languageDropdown)) {
			this.wrapper.append(this.languageDropdown);
		}
		this.languageDropdown.hidden = false;
		const searchInput = this.languageDropdown.querySelector<HTMLInputElement>(
			".ce-code-card__search-input",
		);
		if (searchInput) {
			searchInput.value = "";
			this.filterLanguageList("");
			requestAnimationFrame(() => searchInput.focus());
		}
	}

	private closeDropdowns(): void {
		this.activeDropdown = null;
		this.languageDropdown.hidden = true;
		this.languageDropdown.remove();
		this.closeMethodPopover();
	}

	private buildLanguageDropdown(): HTMLElement {
		const dropdown = document.createElement("div");
		dropdown.className = "ce-code-card__dropdown ce-code-card__lang-dropdown";
		dropdown.hidden = true;
		dropdown.style.top = "76px";

		const searchContainer = document.createElement("div");
		searchContainer.className = "ce-code-card__search-box";

		const searchInput = document.createElement("input");
		searchInput.className = "ce-code-card__search-input";
		searchInput.placeholder = "Search language…";
		searchInput.spellcheck = false;
		searchInput.addEventListener("keydown", (e) => {
			e.stopPropagation();
			if (e.key === "Escape") {
				e.preventDefault();
				this.closeDropdowns();
			}
		});

		searchContainer.append(searchInput);

		const list = document.createElement("div");
		list.className = "ce-code-card__lang-list";

		const renderItems = (items: LanguageOption[]) => {
			list.innerHTML = "";
			const currentLang =
				this.data.tabs[this.activeIndex]?.language || "plaintext";
			for (const lang of items) {
				const btn = document.createElement("button");
				btn.type = "button";
				btn.className = `ce-code-card__lang-item ${lang.id === currentLang ? "is-active" : ""}`;
				btn.textContent = lang.label;
				btn.addEventListener("click", (e) => {
					e.stopPropagation();
					this.setLanguage(lang.id);
					this.closeDropdowns();
				});
				list.append(btn);
			}
		};

		searchInput.addEventListener("input", () => {
			const query = searchInput.value.toLowerCase().trim();
			this.filterLanguageList(query, renderItems);
		});

		renderItems(SUPPORTED_LANGUAGES);
		dropdown.append(searchContainer, list);
		return dropdown;
	}

	private filterLanguageList(
		query: string,
		renderer?: (items: LanguageOption[]) => void,
	): void {
		const filtered = SUPPORTED_LANGUAGES.filter(
			(l) =>
				l.label.toLowerCase().includes(query) ||
				l.id.toLowerCase().includes(query),
		);
		const list = this.languageDropdown.querySelector<HTMLElement>(
			".ce-code-card__lang-list",
		);
		if (!list) return;

		if (renderer) {
			renderer(filtered);
		} else {
			list.innerHTML = "";
			const currentLang =
				this.data.tabs[this.activeIndex]?.language || "plaintext";
			for (const lang of filtered) {
				const btn = document.createElement("button");
				btn.type = "button";
				btn.className = `ce-code-card__lang-item ${lang.id === currentLang ? "is-active" : ""}`;
				btn.textContent = lang.label;
				btn.addEventListener("click", (e) => {
					e.stopPropagation();
					this.setLanguage(lang.id);
					this.closeDropdowns();
				});
				list.append(btn);
			}
		}
	}

	private setLanguage(langId: string): void {
		const currentTab = this.data.tabs[this.activeIndex];
		if (currentTab) {
			currentTab.language = langId;
		}
		this.updateLanguageButtonLabel();
		this.highlight();
	}

	private updateLanguageButtonLabel(): void {
		const currentLang =
			this.data.tabs[this.activeIndex]?.language || "plaintext";
		const found = SUPPORTED_LANGUAGES.find((l) => l.id === currentLang);
		this.languageLabel.textContent = found ? found.label : "Plain Text";
	}

	private updateLineNumbers(): void {
		if (!this.data.showLineNumbers) {
			this.gutterEl.innerHTML = "";
			return;
		}
		const currentCode = this.textarea
			? this.textarea.value
			: this.data.tabs[this.activeIndex]?.code || "";
		const count = Math.max(1, currentCode.split("\n").length);
		const lines: string[] = [];
		for (let i = 1; i <= count; i++) {
			lines.push(`<span>${i}</span>`);
		}
		this.gutterEl.innerHTML = lines.join("");
	}

	private highlight(): void {
		const currentTab = this.data.tabs[this.activeIndex];
		const source =
			(this.textarea ? this.textarea.value : currentTab?.code) || "";
		const lang = currentTab?.language || "plaintext";

		this.codeEl.className = "ce-code-card__code hljs";

		if (!source.trim() || lang === "plaintext") {
			this.codeEl.textContent = source;
			return;
		}

		try {
			if (hljs.getLanguage(lang)) {
				const result = hljs.highlight(source, {
					language: lang,
					ignoreIllegals: true,
				});
				this.codeEl.innerHTML =
					result.value + (source.endsWith("\n") ? " " : "");
				this.codeEl.classList.add(`language-${lang}`);
			} else {
				this.codeEl.textContent = source;
			}
		} catch {
			this.codeEl.textContent = source;
		}
	}

	private async copyCode(): Promise<void> {
		const activeTab = this.data.tabs[this.activeIndex];
		const code = this.textarea ? this.textarea.value : activeTab?.code || "";
		try {
			await navigator.clipboard.writeText(code);
			this.copyBtn.innerHTML = CHECK_ICON;
			this.copyBtn.classList.add("is-copied");
			setTimeout(() => {
				this.copyBtn.innerHTML = COPY_ICON;
				this.copyBtn.classList.remove("is-copied");
			}, 1500);
		} catch (err) {
			console.error("Failed to copy code:", err);
		}
	}

	private setupDocumentClickListener(): void {
		this.documentClickHandler = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			if (
				this.methodPopover &&
				!this.methodPopover.contains(target) &&
				!this.methodBadge.contains(target)
			) {
				this.closeMethodPopover();
			}
			if (
				this.activeDropdown === "language" &&
				!this.languageDropdown.contains(target) &&
				!this.languageBtn.contains(target)
			) {
				this.closeDropdowns();
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

	save(): RequestExampleData {
		if (this.textarea && this.data.tabs[this.activeIndex]) {
			this.data.tabs[this.activeIndex].code = this.textarea.value;
		}
		return {
			method: this.data.method,
			endpoint: (this.endpointInput
				? this.endpointInput.value
				: this.data.endpoint
			).trim(),
			tabs: this.data.tabs.map((tab) => ({
				id: tab.id,
				label: tab.label.trim() || "Client",
				language: tab.language || "bash",
				code: tab.code || "",
			})),
			activeTabIndex: this.activeIndex,
			showLineNumbers: Boolean(this.data.showLineNumbers),
			wrapLines: Boolean(this.data.wrapLines),
		};
	}

	validate(savedData: RequestExampleData): boolean {
		return Array.isArray(savedData?.tabs) && savedData.tabs.length > 0;
	}

	static get sanitize() {
		return {
			method: false,
			endpoint: false,
			tabs: true,
			activeTabIndex: false,
			showLineNumbers: false,
			wrapLines: false,
		};
	}

	destroy(): void {
		if (this.documentClickHandler) {
			document.removeEventListener("click", this.documentClickHandler);
			this.documentClickHandler = null;
		}
		this.closeDropdowns();
	}
}

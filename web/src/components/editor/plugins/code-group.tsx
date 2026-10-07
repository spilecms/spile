import type {
	BlockTool,
	BlockToolConstructorOptions,
	BlockToolData,
	ToolboxConfig,
} from "@editorjs/editorjs";
import hljs from "highlight.js";
import "highlight.js/styles/atom-one-dark.css";
import { type LanguageOption, SUPPORTED_LANGUAGES } from "./code-highlight";

export interface CodeTab {
	id: string;
	label: string;
	language: string;
	code: string;
}

export interface CodeGroupData extends BlockToolData {
	tabs: CodeTab[];
	activeTabIndex?: number;
	showLineNumbers?: boolean;
	wrapLines?: boolean;
}

const TABS_ICON =
	'<svg class="popover_block_icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>';

const PLUS_ICON =
	'<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';

const COPY_ICON =
	'<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';

const CHECK_ICON =
	'<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

const CHECK_MINI_ICON =
	'<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

const CHEVRON_DOWN_ICON =
	'<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';

const MORE_ICON =
	'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>';

const CLOSE_ICON =
	'<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

export default class CodeGroupTool implements BlockTool {
	static get toolbox(): ToolboxConfig {
		return {
			icon: TABS_ICON,
			title: "Code Tabs / Group",
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

	private data: CodeGroupData;
	private readOnly: boolean;
	private activeIndex: number;

	// DOM Elements
	private wrapper!: HTMLElement;
	private tabsBar!: HTMLElement;
	private tabsScroll!: HTMLElement;
	private languageBtn!: HTMLButtonElement;
	private languageLabel!: HTMLSpanElement;
	private copyBtn!: HTMLButtonElement;
	private moreBtn!: HTMLButtonElement;
	private languageDropdown!: HTMLElement;
	private moreDropdown!: HTMLElement;
	private gutterEl!: HTMLElement;
	private textarea!: HTMLTextAreaElement;
	private pre!: HTMLElement;
	private codeEl!: HTMLElement;

	private activeDropdown: "language" | "more" | null = null;
	private documentClickHandler: ((e: MouseEvent) => void) | null = null;

	constructor({
		data,
		readOnly = false,
	}: BlockToolConstructorOptions<CodeGroupData>) {
		this.readOnly = readOnly;

		const defaultTabs: CodeTab[] = [
			{
				id: "tab-1",
				label: "pnpm",
				language: "bash",
				code: "pnpm install @spile/client",
			},
			{
				id: "tab-2",
				label: "npm",
				language: "bash",
				code: "npm install @spile/client",
			},
			{
				id: "tab-3",
				label: "yarn",
				language: "bash",
				code: "yarn add @spile/client",
			},
		];

		const tabs = data?.tabs && data.tabs.length > 0 ? data.tabs : defaultTabs;
		this.data = {
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

		// 1. Top tabs bar
		this.tabsBar = document.createElement("div");
		this.tabsBar.className = "ce-code-card__tabs-bar";

		this.tabsScroll = document.createElement("div");
		this.tabsScroll.className = "ce-code-card__tabs-scroll";

		const actionsContainer = document.createElement("div");
		actionsContainer.className = "ce-code-card__tabs-actions";

		// Language button trigger
		this.languageBtn = document.createElement("button");
		this.languageBtn.type = "button";
		this.languageBtn.className = "ce-code-card__pill-btn";
		this.languageBtn.title = "Select language for active tab";

		this.languageLabel = document.createElement("span");
		this.updateLanguageButtonLabel();

		const chevronSpan = document.createElement("span");
		chevronSpan.className = "ce-code-card__btn-icon";
		chevronSpan.innerHTML = CHEVRON_DOWN_ICON;

		this.languageBtn.append(this.languageLabel, chevronSpan);
		this.languageBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			this.toggleDropdown("language");
		});

		// Copy button
		this.copyBtn = document.createElement("button");
		this.copyBtn.type = "button";
		this.copyBtn.className = "ce-code-card__icon-btn";
		this.copyBtn.title = "Copy active tab code";
		this.copyBtn.innerHTML = COPY_ICON;
		this.copyBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			this.copyCode();
		});

		// More options button
		this.moreBtn = document.createElement("button");
		this.moreBtn.type = "button";
		this.moreBtn.className = "ce-code-card__icon-btn";
		this.moreBtn.title = "More options";
		this.moreBtn.innerHTML = MORE_ICON;
		this.moreBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			this.toggleDropdown("more");
		});

		if (!this.readOnly) {
			actionsContainer.append(this.languageBtn);
		}
		actionsContainer.append(this.copyBtn);
		if (!this.readOnly) {
			actionsContainer.append(this.moreBtn);
		}

		this.tabsBar.append(this.tabsScroll, actionsContainer);

		// Dropdowns
		this.languageDropdown = this.buildLanguageDropdown();
		this.moreDropdown = this.buildMoreDropdown();

		// 2. Viewport (Gutter + Code Layers)
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
		this.textarea.placeholder = "Paste or write code…";
		this.textarea.value = this.data.tabs[this.activeIndex]?.code || "";
		this.textarea.readOnly = this.readOnly;

		this.applyWrappingMode();

		// Input synchronization
		this.textarea.addEventListener("input", () => {
			if (this.data.tabs[this.activeIndex]) {
				this.data.tabs[this.activeIndex].code = this.textarea.value;
			}
			this.highlight();
			this.updateLineNumbers();
		});

		// Tab key handling (2 spaces)
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

		// Scroll synchronization
		this.textarea.addEventListener("scroll", () => {
			this.pre.scrollTop = this.textarea.scrollTop;
			this.pre.scrollLeft = this.textarea.scrollLeft;
			if (this.data.showLineNumbers) {
				this.gutterEl.scrollTop = this.textarea.scrollTop;
			}
		});

		editorArea.append(this.pre, this.textarea);
		viewport.append(this.gutterEl, editorArea);

		// Viewport appended first so Editor.js identifies textarea as primary input
		this.wrapper.append(viewport, this.tabsBar);

		// Initial render
		this.renderTabs();
		this.updateLanguageButtonLabel();
		this.highlight();
		this.updateLineNumbers();

		this.setupDocumentClickListener();
		this.attachHoverListeners();

		return this.wrapper;
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

			// Delete button if > 1 tab and not readOnly
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

		// Save outgoing tab's code
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
			label: `Tab ${newIndex}`,
			language: "typescript",
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

	private setupDocumentClickListener(): void {
		this.documentClickHandler = (e: MouseEvent) => {
			if (!this.activeDropdown) return;
			const target = e.target as HTMLElement;
			if (
				!this.languageDropdown.contains(target) &&
				!this.moreDropdown.contains(target) &&
				!this.languageBtn.contains(target) &&
				!this.moreBtn.contains(target)
			) {
				this.closeDropdowns();
			}
		};
		document.addEventListener("click", this.documentClickHandler);
	}

	private toggleDropdown(dropdown: "language" | "more"): void {
		if (this.activeDropdown === dropdown) {
			this.closeDropdowns();
			return;
		}
		this.closeDropdowns();
		this.activeDropdown = dropdown;

		if (dropdown === "language") {
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
		} else if (dropdown === "more") {
			if (!this.wrapper.contains(this.moreDropdown)) {
				this.wrapper.append(this.moreDropdown);
			}
			this.moreDropdown.hidden = false;
			this.updateMoreDropdownState();
		}
	}

	private closeDropdowns(): void {
		this.activeDropdown = null;
		this.languageDropdown.hidden = true;
		this.languageDropdown.remove();
		this.moreDropdown.hidden = true;
		this.moreDropdown.remove();
	}

	private buildLanguageDropdown(): HTMLElement {
		const dropdown = document.createElement("div");
		dropdown.className = "ce-code-card__dropdown ce-code-card__lang-dropdown";
		dropdown.hidden = true;

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
			if (items.length === 0) {
				const empty = document.createElement("div");
				empty.className = "ce-code-card__empty-msg";
				empty.textContent = "No language found";
				list.append(empty);
				return;
			}
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

	private buildMoreDropdown(): HTMLElement {
		const dropdown = document.createElement("div");
		dropdown.className = "ce-code-card__dropdown ce-code-card__more-dropdown";
		dropdown.hidden = true;

		// 1. Line Numbers Checkbox
		const lineNumbersBtn = document.createElement("button");
		lineNumbersBtn.type = "button";
		lineNumbersBtn.className = "ce-code-card__menu-item line-numbers-btn";

		const lineNumbersBox = document.createElement("span");
		lineNumbersBox.className = `ce-code-card__checkbox line-numbers-checkbox ${this.data.showLineNumbers ? "is-checked" : ""}`;
		lineNumbersBox.innerHTML = CHECK_MINI_ICON;

		const lineNumbersText = document.createElement("span");
		lineNumbersText.textContent = "Line numbers";

		lineNumbersBtn.append(lineNumbersBox, lineNumbersText);
		lineNumbersBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			this.toggleLineNumbers();
			lineNumbersBox.classList.toggle(
				"is-checked",
				Boolean(this.data.showLineNumbers),
			);
		});

		// 2. Wrap Lines Checkbox
		const wrapLinesBtn = document.createElement("button");
		wrapLinesBtn.type = "button";
		wrapLinesBtn.className = "ce-code-card__menu-item wrap-lines-btn";

		const wrapLinesBox = document.createElement("span");
		wrapLinesBox.className = `ce-code-card__checkbox wrap-lines-checkbox ${this.data.wrapLines ? "is-checked" : ""}`;
		wrapLinesBox.innerHTML = CHECK_MINI_ICON;

		const wrapLinesText = document.createElement("span");
		wrapLinesText.textContent = "Wrap lines";

		wrapLinesBtn.append(wrapLinesBox, wrapLinesText);
		wrapLinesBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			this.toggleWrapLines();
			wrapLinesBox.classList.toggle("is-checked", Boolean(this.data.wrapLines));
		});

		dropdown.append(lineNumbersBtn, wrapLinesBtn);
		return dropdown;
	}

	private updateMoreDropdownState(): void {
		const lineNumbersBox = this.moreDropdown.querySelector<HTMLElement>(
			".line-numbers-checkbox",
		);
		if (lineNumbersBox) {
			lineNumbersBox.classList.toggle(
				"is-checked",
				Boolean(this.data.showLineNumbers),
			);
		}

		const wrapLinesBox = this.moreDropdown.querySelector<HTMLElement>(
			".wrap-lines-checkbox",
		);
		if (wrapLinesBox) {
			wrapLinesBox.classList.toggle("is-checked", Boolean(this.data.wrapLines));
		}
	}

	private toggleLineNumbers(): void {
		this.data.showLineNumbers = !this.data.showLineNumbers;
		this.gutterEl.hidden = !this.data.showLineNumbers;
		this.updateLineNumbers();
	}

	private toggleWrapLines(): void {
		this.data.wrapLines = !this.data.wrapLines;
		this.applyWrappingMode();
	}

	private applyWrappingMode(): void {
		const wrap = Boolean(this.data.wrapLines);
		if (wrap) {
			this.textarea.style.whiteSpace = "pre-wrap";
			this.pre.style.whiteSpace = "pre-wrap";
			this.textarea.style.overflowX = "hidden";
			this.pre.style.overflowX = "hidden";
			this.textarea.style.wordBreak = "break-all";
			this.pre.style.wordBreak = "break-all";
		} else {
			this.textarea.style.whiteSpace = "pre";
			this.pre.style.whiteSpace = "pre";
			this.textarea.style.overflowX = "auto";
			this.pre.style.overflowX = "hidden";
			this.textarea.style.wordBreak = "normal";
			this.pre.style.wordBreak = "normal";
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

	save(): CodeGroupData {
		if (this.textarea && this.data.tabs[this.activeIndex]) {
			this.data.tabs[this.activeIndex].code = this.textarea.value;
		}
		return {
			tabs: this.data.tabs.map((tab) => ({
				id: tab.id,
				label: tab.label.trim() || "Tab",
				language: tab.language || "plaintext",
				code: tab.code || "",
			})),
			activeTabIndex: this.activeIndex,
			showLineNumbers: Boolean(this.data.showLineNumbers),
			wrapLines: Boolean(this.data.wrapLines),
		};
	}

	static get sanitize() {
		return {
			tabs: true,
			activeTabIndex: false,
			showLineNumbers: false,
			wrapLines: false,
		};
	}

	validate(savedData: CodeGroupData): boolean {
		return Array.isArray(savedData?.tabs) && savedData.tabs.length > 0;
	}

	destroy(): void {
		if (this.documentClickHandler) {
			document.removeEventListener("click", this.documentClickHandler);
			this.documentClickHandler = null;
		}
		this.closeDropdowns();
	}
}

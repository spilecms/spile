import type {
	BlockTool,
	BlockToolConstructorOptions,
	BlockToolData,
	ToolboxConfig,
} from "@editorjs/editorjs";
import hljs from "highlight.js";
import "highlight.js/styles/atom-one-dark.css";

export interface CodeBlockData extends BlockToolData {
	code: string;
	language: string;
	filename?: string;
	showLineNumbers?: boolean;
	wrapLines?: boolean;
}

export interface LanguageOption {
	id: string;
	label: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
	{ id: "plaintext", label: "Plain Text" },
	{ id: "typescript", label: "TypeScript" },
	{ id: "javascript", label: "JavaScript" },
	{ id: "python", label: "Python" },
	{ id: "html", label: "HTML" },
	{ id: "css", label: "CSS" },
	{ id: "json", label: "JSON" },
	{ id: "bash", label: "Bash / Shell" },
	{ id: "sql", label: "SQL" },
	{ id: "go", label: "Go" },
	{ id: "rust", label: "Rust" },
	{ id: "cpp", label: "C++" },
	{ id: "c", label: "C" },
	{ id: "csharp", label: "C#" },
	{ id: "java", label: "Java" },
	{ id: "php", label: "PHP" },
	{ id: "ruby", label: "Ruby" },
	{ id: "swift", label: "Swift" },
	{ id: "kotlin", label: "Kotlin" },
	{ id: "yaml", label: "YAML" },
	{ id: "markdown", label: "Markdown" },
	{ id: "graphql", label: "GraphQL" },
	{ id: "dockerfile", label: "Dockerfile" },
	{ id: "scss", label: "SCSS" },
	{ id: "less", label: "Less" },
	{ id: "xml", label: "XML" },
	{ id: "lua", label: "Lua" },
	{ id: "r", label: "R" },
	{ id: "perl", label: "Perl" },
	{ id: "ini", label: "INI / TOML" },
	{ id: "diff", label: "Diff" },
	{ id: "wasm", label: "WebAssembly" },
	{ id: "makefile", label: "Makefile" },
	{ id: "dart", label: "Dart" },
	{ id: "scala", label: "Scala" },
	{ id: "elixir", label: "Elixir" },
	{ id: "clojure", label: "Clojure" },
	{ id: "zig", label: "Zig" },
	{ id: "solidity", label: "Solidity" },
];

const CODE_ICON =
	'<svg class="popover_block_icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>';

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
	'<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

export default class CodeHighlightTool implements BlockTool {
	static get toolbox(): ToolboxConfig {
		return { title: "Code", icon: CODE_ICON };
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

	private data: CodeBlockData;
	private readOnly: boolean;

	// DOM Elements
	private wrapper!: HTMLElement;
	private filenameBar!: HTMLElement;
	private filenameInput!: HTMLInputElement;
	private floatingBar!: HTMLElement;
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
	}: BlockToolConstructorOptions<CodeBlockData>) {
		this.readOnly = readOnly;
		this.data = {
			code: data.code ?? "",
			language: data.language || "plaintext",
			filename: data.filename ?? undefined,
			showLineNumbers: Boolean(data.showLineNumbers),
			wrapLines: Boolean(data.wrapLines),
		};
	}

	render(): HTMLElement {
		this.wrapper = document.createElement("div");
		this.wrapper.className = "ce-code-card";

		// 1. Filename bar (visible when filename !== undefined)
		this.filenameBar = document.createElement("div");
		this.filenameBar.className = "ce-code-card__filename-bar";
		this.filenameBar.hidden = this.data.filename === undefined;

		const filenameLeft = document.createElement("div");
		filenameLeft.className = "ce-code-card__filename-left";

		this.filenameInput = document.createElement("input");
		this.filenameInput.className = "ce-code-card__filename-input";
		this.filenameInput.placeholder = "filename (e.g. index.ts)";
		this.filenameInput.value = this.data.filename || "";
		this.filenameInput.readOnly = this.readOnly;
		this.filenameInput.addEventListener("input", () => {
			this.data.filename = this.filenameInput.value;
		});
		this.filenameInput.addEventListener("keydown", (e) => {
			e.stopPropagation();
			if (e.key === "Enter") {
				e.preventDefault();
				this.textarea.focus();
			}
		});

		filenameLeft.append(this.filenameInput);

		const filenameRight = document.createElement("div");
		filenameRight.className = "ce-code-card__filename-right";

		const removeFilenameBtn = document.createElement("button");
		removeFilenameBtn.type = "button";
		removeFilenameBtn.className = "ce-code-card__icon-btn";
		removeFilenameBtn.title = "Remove filename";
		removeFilenameBtn.innerHTML = CLOSE_ICON;
		removeFilenameBtn.addEventListener("click", () => {
			this.removeFilename();
		});

		if (!this.readOnly) {
			filenameRight.append(removeFilenameBtn);
		}
		this.filenameBar.append(filenameLeft, filenameRight);

		// 2. Floating action bar (top-right controls)
		this.floatingBar = document.createElement("div");
		this.floatingBar.className = "ce-code-card__floating-bar";

		// Language select trigger
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
			this.toggleDropdown("language");
		});

		// Copy button
		this.copyBtn = document.createElement("button");
		this.copyBtn.type = "button";
		this.copyBtn.className = "ce-code-card__icon-btn";
		this.copyBtn.title = "Copy code";
		this.copyBtn.innerHTML = COPY_ICON;
		this.copyBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			this.copyCode();
		});

		// More menu button
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
			this.floatingBar.append(this.languageBtn);
		}
		this.floatingBar.append(this.copyBtn);
		if (!this.readOnly) {
			this.floatingBar.append(this.moreBtn);
		}

		// Dropdowns
		this.languageDropdown = this.buildLanguageDropdown();
		this.moreDropdown = this.buildMoreDropdown();

		// 3. Viewport (Gutter + Code Layers)
		const viewport = document.createElement("div");
		viewport.className = "ce-code-card__viewport";

		this.gutterEl = document.createElement("div");
		this.gutterEl.className = "ce-code-card__gutter";
		this.gutterEl.setAttribute("aria-hidden", "true");
		this.gutterEl.hidden = !this.data.showLineNumbers;

		const editorArea = document.createElement("div");
		editorArea.className = "ce-code-card__editor-area";

		// Highlighted pre element (behind)
		this.pre = document.createElement("pre");
		this.pre.className = "ce-code-card__pre";
		this.pre.setAttribute("aria-hidden", "true");

		this.codeEl = document.createElement("code");
		this.codeEl.className = "ce-code-card__code";
		this.pre.append(this.codeEl);

		// Synchronized textarea (on top)
		this.textarea = document.createElement("textarea");
		this.textarea.className = "ce-code-card__textarea";
		this.textarea.spellcheck = false;
		this.textarea.autocomplete = "off";
		this.textarea.autocapitalize = "off";
		this.textarea.placeholder = "Paste or write code…";
		this.textarea.value = this.data.code;
		this.textarea.readOnly = this.readOnly;

		this.applyWrappingMode();

		// Input synchronization
		this.textarea.addEventListener("input", () => {
			this.data.code = this.textarea.value;
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
				this.data.code = this.textarea.value;
				this.highlight();
				this.updateLineNumbers();
			}
		});

		// Scroll synchronization (horizontal & vertical)
		this.textarea.addEventListener("scroll", () => {
			this.pre.scrollTop = this.textarea.scrollTop;
			this.pre.scrollLeft = this.textarea.scrollLeft;
			if (this.data.showLineNumbers) {
				this.gutterEl.scrollTop = this.textarea.scrollTop;
			}
		});

		editorArea.append(this.pre, this.textarea);
		viewport.append(this.gutterEl, editorArea);

		// Assemble card
		// Viewport is appended first so Editor.js always identifies this.textarea as the primary input.
		// Filename bar is displayed above viewport via CSS order: -1.
		this.wrapper.append(viewport, this.floatingBar);

		if (this.data.filename !== undefined) {
			this.wrapper.append(this.filenameBar);
		}

		// Initial render
		this.highlight();
		this.updateLineNumbers();

		// Setup outside click listener for dropdowns
		this.setupDocumentClickListener();

		// Attach hover listener to ensure Editor.js toolbar (+ and :: drag handle) triggers on hover
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

		// Search input
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

		// Language items list
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
			for (const lang of items) {
				const btn = document.createElement("button");
				btn.type = "button";
				btn.className = `ce-code-card__lang-item ${lang.id === this.data.language ? "is-active" : ""}`;
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
			for (const lang of filtered) {
				const btn = document.createElement("button");
				btn.type = "button";
				btn.className = `ce-code-card__lang-item ${lang.id === this.data.language ? "is-active" : ""}`;
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

		// 1. File Name Checkbox
		const filenameBtn = document.createElement("button");
		filenameBtn.type = "button";
		filenameBtn.className = "ce-code-card__menu-item filename-toggle-btn";

		const filenameBox = document.createElement("span");
		filenameBox.className = `ce-code-card__checkbox filename-checkbox ${this.data.filename !== undefined ? "is-checked" : ""}`;
		filenameBox.innerHTML = CHECK_MINI_ICON;

		const filenameText = document.createElement("span");
		filenameText.textContent = "File name";

		filenameBtn.append(filenameBox, filenameText);
		filenameBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			if (this.data.filename === undefined) {
				this.addFilename();
			} else {
				this.removeFilename();
			}
			filenameBox.classList.toggle(
				"is-checked",
				this.data.filename !== undefined,
			);
		});

		// 2. Line Numbers Checkbox
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

		// 3. Wrap Lines Checkbox
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

		dropdown.append(filenameBtn, lineNumbersBtn, wrapLinesBtn);
		return dropdown;
	}

	private updateMoreDropdownState(): void {
		const filenameBox =
			this.moreDropdown.querySelector<HTMLElement>(".filename-checkbox");
		if (filenameBox) {
			filenameBox.classList.toggle(
				"is-checked",
				this.data.filename !== undefined,
			);
		}

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

	private addFilename(): void {
		this.data.filename = this.data.filename || "";
		if (!this.wrapper.contains(this.filenameBar)) {
			this.wrapper.append(this.filenameBar);
		}
		this.filenameBar.hidden = false;
		this.filenameInput.value = this.data.filename;
		requestAnimationFrame(() => this.filenameInput.focus());
	}

	private removeFilename(): void {
		this.data.filename = undefined;
		this.filenameBar.hidden = true;
		this.filenameBar.remove();
		this.filenameInput.value = "";
		const filenameBox =
			this.moreDropdown?.querySelector<HTMLElement>(".filename-checkbox");
		if (filenameBox) {
			filenameBox.classList.remove("is-checked");
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
		this.data.language = langId;
		this.updateLanguageButtonLabel();
		this.highlight();
	}

	private updateLanguageButtonLabel(): void {
		const found = SUPPORTED_LANGUAGES.find((l) => l.id === this.data.language);
		this.languageLabel.textContent = found ? found.label : "Plain Text";
	}

	private updateLineNumbers(): void {
		if (!this.data.showLineNumbers) {
			this.gutterEl.innerHTML = "";
			return;
		}
		const count = Math.max(1, (this.data.code || "").split("\n").length);
		const lines: string[] = [];
		for (let i = 1; i <= count; i++) {
			lines.push(`<span>${i}</span>`);
		}
		this.gutterEl.innerHTML = lines.join("");
	}

	private highlight(): void {
		const source = this.data.code || "";
		const lang = this.data.language;

		// Clean previous classes
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
		try {
			await navigator.clipboard.writeText(this.data.code || "");
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

	save(): CodeBlockData {
		return {
			code: this.data.code || "",
			language: this.data.language || "plaintext",
			filename: this.data.filename ? this.data.filename.trim() : undefined,
			showLineNumbers: Boolean(this.data.showLineNumbers),
			wrapLines: Boolean(this.data.wrapLines),
		};
	}

	static get sanitize() {
		return {
			code: true,
			language: false,
			filename: false,
			showLineNumbers: false,
			wrapLines: false,
		};
	}

	validate(savedData: CodeBlockData): boolean {
		return typeof savedData.code === "string";
	}

	destroy(): void {
		if (this.documentClickHandler) {
			document.removeEventListener("click", this.documentClickHandler);
			this.documentClickHandler = null;
		}
		this.closeDropdowns();
	}
}

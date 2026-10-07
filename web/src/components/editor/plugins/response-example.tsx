import type {
	BlockTool,
	BlockToolConstructorOptions,
	BlockToolData,
	ToolboxConfig,
} from "@editorjs/editorjs";
import hljs from "highlight.js";
import "highlight.js/styles/atom-one-dark.css";

export interface ResponseTab {
	id: string;
	status: number;
	statusText: string;
	code: string;
}

export interface ResponseExampleData extends BlockToolData {
	tabs: ResponseTab[];
	activeTabIndex?: number;
	showLineNumbers?: boolean;
	wrapLines?: boolean;
}

const RESPONSE_EXAMPLE_ICON =
	'<svg class="popover_block_icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M15 3v18"/></svg>';

const PLUS_ICON =
	'<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';

const COPY_ICON =
	'<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';

const CHECK_ICON =
	'<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';

const CLOSE_ICON =
	'<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

export default class ResponseExampleTool implements BlockTool {
	static get toolbox(): ToolboxConfig {
		return {
			icon: RESPONSE_EXAMPLE_ICON,
			title: "Response Example",
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

	private data: ResponseExampleData;
	private readOnly: boolean;
	private activeIndex: number;

	private wrapper!: HTMLElement;
	private tabsScroll!: HTMLElement;
	private copyBtn!: HTMLButtonElement;
	private gutterEl!: HTMLElement;
	private textarea!: HTMLTextAreaElement;
	private pre!: HTMLElement;
	private codeEl!: HTMLElement;

	constructor({
		data,
		readOnly = false,
	}: BlockToolConstructorOptions<ResponseExampleData>) {
		this.readOnly = readOnly;

		const defaultTabs: ResponseTab[] = [
			{
				id: "res-1",
				status: 200,
				statusText: "OK",
				code: `{\n  "status": "success",\n  "data": {\n    "id": "usr_94812",\n    "name": "Alex",\n    "email": "alex@example.com",\n    "created_at": "2026-10-06T10:00:00Z"\n  }\n}`,
			},
			{
				id: "res-2",
				status: 400,
				statusText: "Bad Request",
				code: `{\n  "error": {\n    "code": "invalid_parameters",\n    "message": "The email field must be a valid email address."\n  }\n}`,
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

		// 1. Top Tabs bar
		const tabsBar = document.createElement("div");
		tabsBar.className = "ce-code-card__tabs-bar";

		this.tabsScroll = document.createElement("div");
		this.tabsScroll.className = "ce-code-card__tabs-scroll";

		const actionsContainer = document.createElement("div");
		actionsContainer.className = "ce-code-card__tabs-actions";

		const jsonBadge = document.createElement("span");
		jsonBadge.className = "ce-code-card__pill-btn";
		jsonBadge.textContent = "JSON";

		this.copyBtn = document.createElement("button");
		this.copyBtn.type = "button";
		this.copyBtn.className = "ce-code-card__icon-btn";
		this.copyBtn.title = "Copy response JSON";
		this.copyBtn.innerHTML = COPY_ICON;
		this.copyBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			this.copyCode();
		});

		actionsContainer.append(jsonBadge, this.copyBtn);
		tabsBar.append(this.tabsScroll, actionsContainer);

		// 2. Viewport
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
		this.textarea.placeholder = "Enter response JSON…";
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

		this.wrapper.append(viewport, tabsBar);

		this.renderTabs();
		this.highlight();
		this.updateLineNumbers();
		this.attachHoverListeners();

		return this.wrapper;
	}

	private renderTabs(): void {
		this.tabsScroll.innerHTML = "";

		this.data.tabs.forEach((tab, index) => {
			const tabEl = document.createElement("div");
			const isActive = index === this.activeIndex;
			tabEl.className = `ce-code-card__tab ${isActive ? "is-active" : ""}`;

			const statusTier =
				tab.status >= 200 && tab.status < 300
					? "2xx"
					: tab.status >= 400 && tab.status < 500
						? "4xx"
						: "5xx";

			const badge = document.createElement("span");
			badge.className = `ce-api-status-badge ce-api-status-badge--${statusTier}`;
			badge.textContent = `${tab.status}`;

			const labelEl = document.createElement("span");
			labelEl.className = "ce-code-card__tab-label";
			labelEl.textContent = tab.statusText || "Response";
			labelEl.title = `${tab.status} ${tab.statusText}`;

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
						labelEl.textContent = tab.statusText || "Response";
						labelEl.blur();
					}
				});

				labelEl.addEventListener("input", (e) => {
					e.stopPropagation();
					tab.statusText = labelEl.textContent || "";
				});
			}

			tabEl.append(badge, labelEl);

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
			addBtn.title = "Add response status tab";
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

		this.highlight();
		this.updateLineNumbers();
	}

	private addTab(): void {
		const newIndex = this.data.tabs.length + 1;
		this.data.tabs.push({
			id: `res-${Date.now()}`,
			status: newIndex === 2 ? 404 : 200,
			statusText: newIndex === 2 ? "Not Found" : "OK",
			code: `{\n  "message": "Response payload"\n}`,
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

		this.codeEl.className = "ce-code-card__code hljs language-json";

		if (!source.trim()) {
			this.codeEl.textContent = source;
			return;
		}

		try {
			const result = hljs.highlight(source, {
				language: "json",
				ignoreIllegals: true,
			});
			this.codeEl.innerHTML = result.value + (source.endsWith("\n") ? " " : "");
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

	save(): ResponseExampleData {
		if (this.textarea && this.data.tabs[this.activeIndex]) {
			this.data.tabs[this.activeIndex].code = this.textarea.value;
		}
		return {
			tabs: this.data.tabs.map((tab) => ({
				id: tab.id,
				status: Number(tab.status) || 200,
				statusText: tab.statusText.trim() || "OK",
				code: tab.code || "",
			})),
			activeTabIndex: this.activeIndex,
			showLineNumbers: Boolean(this.data.showLineNumbers),
			wrapLines: Boolean(this.data.wrapLines),
		};
	}

	validate(savedData: ResponseExampleData): boolean {
		return Array.isArray(savedData?.tabs) && savedData.tabs.length > 0;
	}

	static get sanitize() {
		return {
			tabs: true,
			activeTabIndex: false,
			showLineNumbers: false,
			wrapLines: false,
		};
	}
}

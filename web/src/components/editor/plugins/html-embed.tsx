import type {
	BlockTool,
	BlockToolConstructorOptions,
	BlockToolData,
	PasteConfig,
	PasteEvent,
	ToolboxConfig,
} from "@editorjs/editorjs";

/**
 * HTML Embed block tool.
 *
 * Lets authors paste raw HTML or an <iframe>/URL and see the *rendered* result
 * in a sandboxed iframe (no scripts by default), with an Edit/Preview toggle.
 *
 * Data shape: { html: string, allowScripts: boolean }
 */

interface HtmlEmbedData extends BlockToolData {
	html: string;
	allowScripts?: boolean;
}

interface HtmlEmbedConfig {
	placeholder?: string;
}

const TOOL_NAME = "htmlEmbed";

/**
 * Detect whether a string is an embed (iframe tag or bare URL) rather than a
 * free-form HTML fragment.
 */
function detectEmbedKind(value: string): "iframe" | "html" | "url" {
	const trimmed = value.trim();
	if (!trimmed) return "html";

	// A full <iframe> tag — extract its src
	if (/<iframe[\s>]/i.test(trimmed)) return "iframe";

	// A bare http(s) URL
	if (/^https?:\/\//i.test(trimmed)) return "url";

	return "html";
}

/** Pull the src out of an <iframe> tag string. */
function extractIframeSrc(html: string): string | null {
	const match = html.match(/src\s*=\s*["']([^"']+)["']/i);
	return match ? match[1] : null;
}

export default class HtmlEmbedTool implements BlockTool {
	static get toolbox(): ToolboxConfig {
		return {
			title: "HTML",
			icon: '<svg class="popover_block_icon" aria-hidden="true" role="graphics-symbol" viewBox="0 0 20 20"  style="width: 20px; height: 20px; display: block; fill: var(--c-icoPri); flex-shrink: 0;"><path d="M5.25 3.125A2.125 2.125 0 0 0 3.125 5.25v9.5c0 1.174.951 2.125 2.125 2.125H7.5v-1.25H5.25a.875.875 0 0 1-.875-.875v-9.5c0-.483.392-.875.875-.875h9.5c.483 0 .875.392.875.875V7.5h1.25V5.25a2.125 2.125 0 0 0-2.125-2.125zm9.667 10.362a.827.827 0 1 0 .264-1.632.827.827 0 0 0-.264 1.632"></path><path d="M11.508 12.097a.827.827 0 1 1-1.633-.264.827.827 0 0 1 1.633.264m1.716-1.807a2.935 2.935 0 0 1 5.052.026.625.625 0 1 1-1.08.63 1.685 1.685 0 0 0-2.9-.014L10.65 17.02l2.67.432a.625.625 0 0 1-.2 1.234l-3.58-.58a.625.625 0 0 1-.436-.938zm-.86-1.802a2.94 2.94 0 0 0-3.464.329.625.625 0 0 0 .833.932 1.686 1.686 0 0 1 2.397.153.625.625 0 0 0 .945-.819 3 3 0 0 0-.71-.595"></path></svg>',
		};
	}

	static get isReadOnlySupported(): boolean {
		return true;
	}

	static get pasteConfig(): PasteConfig {
		return {
			tags: ["iframe", "div", "section"],
		};
	}

	private readonly config: HtmlEmbedConfig;
	private data: HtmlEmbedData;

	private wrapper!: HTMLElement;
	private header!: HTMLElement;
	private toggleButton!: HTMLButtonElement;
	private scriptsButton!: HTMLButtonElement;
	private editorPanel!: HTMLElement;
	private textarea!: HTMLTextAreaElement;
	private previewPanel!: HTMLElement;
	private frame!: HTMLIFrameElement;

	private mode: "edit" | "preview" = "edit";

	constructor({
		data,
		config,
	}: BlockToolConstructorOptions<HtmlEmbedData, HtmlEmbedConfig>) {
		this.config = config ?? {};
		this.data = {
			html: data.html ?? "",
			allowScripts: data.allowScripts ?? false,
		};
	}

	render(): HTMLElement {
		this.wrapper = document.createElement("div");
		this.wrapper.className = "ce-html-embed";

		// Header bar: Edit/Preview toggle + Allow scripts toggle
		this.header = document.createElement("div");
		this.header.className = "ce-html-embed__header";

		this.toggleButton = document.createElement("button");
		this.toggleButton.type = "button";
		this.toggleButton.className =
			"ce-html-embed__toggle ce-html-embed__toggle--edit";
		this.toggleButton.textContent = "Edit";
		this.toggleButton.addEventListener("click", () => this.setMode("edit"));

		const previewButton = document.createElement("button");
		previewButton.type = "button";
		previewButton.className =
			"ce-html-embed__toggle ce-html-embed__toggle--preview";
		previewButton.textContent = "Preview";
		previewButton.addEventListener("click", () => this.setMode("preview"));

		const spacer = document.createElement("span");
		spacer.className = "ce-html-embed__spacer";

		this.scriptsButton = document.createElement("button");
		this.scriptsButton.type = "button";
		this.scriptsButton.className = "ce-html-embed__scripts";
		this.scriptsButton.textContent = "Scripts: off";
		this.scriptsButton.setAttribute("aria-pressed", "false");
		this.scriptsButton.addEventListener("click", () => {
			this.data.allowScripts = !this.data.allowScripts;
			this.updateScriptsButton();
			if (this.mode === "preview") this.renderPreview();
		});

		this.header.append(
			this.toggleButton,
			previewButton,
			spacer,
			this.scriptsButton,
		);

		// Editor panel
		this.editorPanel = document.createElement("div");
		this.editorPanel.className = "ce-html-embed__editor";

		this.textarea = document.createElement("textarea");
		this.textarea.className = "ce-html-embed__textarea";
		this.textarea.placeholder =
			this.config.placeholder ?? "Paste HTML or an embed URL…";
		this.textarea.spellcheck = false;
		this.textarea.value = this.data.html;
		this.textarea.addEventListener("input", () => {
			this.data.html = this.textarea.value;
			this.autoResize();
		});
		this.editorPanel.append(this.textarea);

		// Preview panel
		this.previewPanel = document.createElement("div");
		this.previewPanel.className = "ce-html-embed__preview";
		this.previewPanel.hidden = true;
		this.frame = document.createElement("iframe");
		this.frame.className = "ce-html-embed__frame";
		this.frame.setAttribute("title", "Embedded content preview");
		this.frame.setAttribute("tabindex", "-1");
		this.previewPanel.append(this.frame);

		this.wrapper.append(this.header, this.editorPanel, this.previewPanel);

		// Start in the mode matching whether we already have content
		this.setMode(this.data.html ? "preview" : "edit");
		this.updateScriptsButton();

		return this.wrapper;
	}

	private setMode(mode: "edit" | "preview"): void {
		this.mode = mode;
		this.editorPanel.hidden = mode === "preview";
		this.previewPanel.hidden = mode === "edit";
		this.header.dataset.mode = mode;
		if (mode === "preview") this.renderPreview();
	}

	private updateScriptsButton(): void {
		const on = this.data.allowScripts === true;
		this.scriptsButton.textContent = on ? "Scripts: on" : "Scripts: off";
		this.scriptsButton.setAttribute("aria-pressed", String(on));
		this.scriptsButton.classList.toggle("ce-html-embed__scripts--on", on);
	}

	private renderPreview(): void {
		const html = this.data.html ?? "";
		const kind = detectEmbedKind(html);

		// Empty sandbox = fully locked. Only relax when explicitly allowed.
		const sandbox = this.data.allowScripts
			? "allow-scripts allow-same-origin"
			: "";

		this.frame.removeAttribute("src");
		this.frame.removeAttribute("srcdoc");

		if (kind === "iframe") {
			const src = extractIframeSrc(html);
			if (src) {
				this.frame.setAttribute("sandbox", sandbox);
				this.frame.setAttribute("src", src);
			} else {
				this.frame.srcdoc = "";
			}
		} else if (kind === "url") {
			this.frame.setAttribute("sandbox", sandbox);
			this.frame.setAttribute("src", html.trim());
		} else {
			this.frame.setAttribute("sandbox", sandbox);
			this.frame.srcdoc = this.wrapDocument(html);
		}
	}

	/** Wrap a raw fragment in a minimal, reset-styled html document for srcdoc. */
	private wrapDocument(fragment: string): string {
		return `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;font:16px/1.5 system-ui,sans-serif;color:#111}img,video,iframe{max-width:100%}</style></head><body>${fragment}</body></html>`;
	}

	private autoResize(): void {
		this.textarea.style.height = "auto";
		this.textarea.style.height = `${this.textarea.scrollHeight}px`;
	}

	save(): HtmlEmbedData {
		return {
			html: this.data.html,
			allowScripts: this.data.allowScripts === true,
		};
	}

	static get sanitize() {
		return {
			html: true,
			allowScripts: true,
		};
	}

	validate(savedData: HtmlEmbedData): boolean {
		return (
			typeof savedData.html === "string" && savedData.html.trim().length > 0
		);
	}

	onPaste(event: PasteEvent): void {
		const detail = event.detail;
		if (!("data" in detail)) return;
		const data = detail.data;
		const html =
			data instanceof HTMLElement ? data.outerHTML : String(data ?? "");
		if (!html) return;
		this.textarea.value = html;
		this.data.html = html;
		this.textarea.dispatchEvent(new Event("input"));
	}

	static get conversionConfig() {
		return {
			export: (data: HtmlEmbedData) => data.html ?? "",
			import: (content: string) => ({ html: content }),
		};
	}
}

export { TOOL_NAME };

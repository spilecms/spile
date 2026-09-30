import type {
	BlockTool,
	BlockToolConstructorOptions,
	BlockToolData,
	ToolboxConfig,
} from "@editorjs/editorjs";
import hljs from "highlight.js/lib/common";
import "highlight.js/styles/atom-one-dark.css";

interface CodeData extends BlockToolData {
	code: string;
}

/**
 * Code block with syntax highlighting.
 *
 * Replaces the plain @editorjs/code textarea: authors write in an edit panel,
 * and a "Preview" toggle shows the same code syntax-highlighted (highlight.js)
 * on a dark, monospaced surface. Edits and previews share the same source.
 */

const CODE_ICON =
	'<svg class="popover_block_icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>';

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

	private data: CodeData;

	private wrapper!: HTMLElement;
	private header!: HTMLElement;
	private editToggle!: HTMLButtonElement;
	private previewToggle!: HTMLButtonElement;
	private editPanel!: HTMLElement;
	private textarea!: HTMLTextAreaElement;
	private previewPanel!: HTMLElement;
	private pre!: HTMLElement;

	constructor({ data }: BlockToolConstructorOptions<CodeData>) {
		this.data = { code: data.code ?? "" };
	}

	render(): HTMLElement {
		this.wrapper = document.createElement("div");
		this.wrapper.className = "ce-code-highlight";

		this.header = document.createElement("div");
		this.header.className = "ce-code-highlight__header";

		this.editToggle = document.createElement("button");
		this.editToggle.type = "button";
		this.editToggle.className = "ce-code-highlight__toggle";
		this.editToggle.textContent = "Edit";
		this.editToggle.addEventListener("click", () => this.setMode("edit"));

		this.previewToggle = document.createElement("button");
		this.previewToggle.type = "button";
		this.previewToggle.className = "ce-code-highlight__toggle";
		this.previewToggle.textContent = "Preview";
		this.previewToggle.addEventListener("click", () => this.setMode("preview"));

		const spacer = document.createElement("span");
		spacer.className = "ce-code-highlight__spacer";

		this.header.append(this.editToggle, this.previewToggle, spacer);

		this.editPanel = document.createElement("div");
		this.editPanel.className = "ce-code-highlight__editor";

		this.textarea = document.createElement("textarea");
		this.textarea.className = "ce-code-highlight__textarea";
		this.textarea.spellcheck = false;
		this.textarea.autocapitalize = "off";
		this.textarea.placeholder = "Write code…";
		this.textarea.value = this.data.code;
		this.textarea.addEventListener("input", () => {
			this.data.code = this.textarea.value;
		});
		this.editPanel.append(this.textarea);

		this.previewPanel = document.createElement("div");
		this.previewPanel.className = "ce-code-highlight__preview";
		this.previewPanel.hidden = true;
		this.pre = document.createElement("pre");
		this.pre.className = "ce-code-highlight__pre";
		const code = document.createElement("code");
		code.className = "ce-code-highlight__code hljs";
		this.pre.append(code);
		this.previewPanel.append(this.pre);

		this.wrapper.append(this.header, this.editPanel, this.previewPanel);

		this.setMode(this.data.code ? "preview" : "edit");
		return this.wrapper;
	}

	private setMode(mode: "edit" | "preview"): void {
		this.editPanel.hidden = mode === "preview";
		this.previewPanel.hidden = mode === "edit";
		this.header.dataset.mode = mode;
		if (mode === "preview") this.highlight();
	}

	private highlight(): void {
		const codeEl = this.pre.querySelector("code");
		if (!codeEl) return;
		const source = this.data.code;
		if (!source.trim()) {
			codeEl.textContent = "";
			return;
		}
		try {
			const result = hljs.highlightAuto(source);
			codeEl.textContent = source;
			codeEl.innerHTML = result.value;
			codeEl.classList.remove("hljs");
			if (result.language) codeEl.classList.add(`language-${result.language}`);
		} catch {
			codeEl.textContent = source;
		}
	}

	save(): CodeData {
		return { code: this.data.code };
	}

	static get sanitize() {
		return { code: true };
	}

	validate(savedData: CodeData): boolean {
		return (
			typeof savedData.code === "string" && savedData.code.trim().length > 0
		);
	}
}

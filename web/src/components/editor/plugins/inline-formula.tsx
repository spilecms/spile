import type {
	API,
	InlineTool,
	InlineToolConstructorOptions,
} from "@editorjs/editorjs";
import katex, { type KatexOptions } from "katex";
import "katex/dist/katex.min.css";
import katexCss from "katex/dist/katex.min.css?inline";

const SELECTOR = ".ce-inline-formula";

const KATEX_OPTIONS: KatexOptions = {
	displayMode: false,
	throwOnError: true,
	trust: false,
	strict: "ignore",
	maxExpand: 1000,
};

// Shadow roots don't inherit document CSS, so KaTeX's stylesheet is adopted into each one.
// (@font-face is ignored in shadow roots, but the global import above registers the fonts.)
const shadowSheet = new CSSStyleSheet();
shadowSheet.replaceSync(`${katexCss}
.src-error { color: var(--ej-destructive, #e5484d); font-family: ui-monospace, monospace; font-size: 0.9em; }`);

/* ---------- KaTeX helpers ---------- */
function renderMath(latex: string): DocumentFragment {
	// Render off-DOM: katex.render clears its target before it throws
	const scratch = document.createElement("span");
	katex.render(latex, scratch, KATEX_OPTIONS);
	const fragment = document.createDocumentFragment();
	fragment.append(...scratch.childNodes);
	return fragment;
}

function errorText(err: unknown): string {
	const msg = err instanceof Error ? err.message : "Invalid LaTeX";
	return msg.replace(/^KaTeX parse error:\s*/, "");
}

/* ---------- Formula element ---------- */
function createFormula(latex: string): HTMLElement {
	const el = document.createElement("span");
	el.className = "ce-inline-formula";
	el.dataset.latex = latex;
	el.textContent = latex; // fallback text, also keeps the sanitizer from dropping an empty span
	paint(el);
	return el;
}

function paint(el: HTMLElement): void {
	const latex = el.dataset.latex ?? "";
	const root = el.shadowRoot ?? el.attachShadow({ mode: "open" });
	root.adoptedStyleSheets = [shadowSheet];
	try {
		root.replaceChildren(renderMath(latex));
	} catch {
		const source = document.createElement("span");
		source.className = "src-error";
		source.textContent = latex;
		root.replaceChildren(source);
	}
	el.contentEditable = "false";
	el.setAttribute("role", "button");
	el.setAttribute("aria-label", `Edit formula ${latex}`);
}

function hydrateAll(): void {
	const editor = document.querySelector(".codex-editor");
	if (!editor) return;
	for (const el of editor.querySelectorAll<HTMLElement>(SELECTOR)) {
		if (!el.shadowRoot) paint(el);
	}
}

function ensureTrailingText(el: HTMLElement): Text {
	const next = el.nextSibling;
	if (next?.nodeType === Node.TEXT_NODE) return next as Text;
	// A text node after a non-editable inline element gives the caret somewhere to live
	const text = document.createTextNode("\u00A0");
	el.after(text);
	return text;
}

function placeCaretAfter(el: HTMLElement): void {
	const text = ensureTrailingText(el);
	el.closest<HTMLElement>('[contenteditable="true"]')?.focus();
	const range = document.createRange();
	range.setStart(text, 0);
	range.collapse(true);
	const selection = window.getSelection();
	selection?.removeAllRanges();
	selection?.addRange(range);
}

/* ---------- Edit popover (one shared instance) ---------- */
class FormulaPopover {
	private readonly el = document.createElement("div");
	private readonly input = document.createElement("input");
	private readonly previewEl = document.createElement("div");
	private readonly message = document.createElement("div");
	private target: HTMLElement | null = null;

	constructor() {
		this.el.className = "ce-inline-formula-pop";
		this.el.hidden = true;
		this.el.setAttribute("role", "dialog");
		this.el.setAttribute("aria-label", "Edit inline formula");

		this.input.className = "ce-inline-formula-pop__input";
		this.input.type = "text";
		this.input.spellcheck = false;
		this.input.autocomplete = "off";
		this.input.setAttribute("autocapitalize", "off");
		this.input.setAttribute("aria-label", "LaTeX formula");
		this.input.placeholder = "Type a TeX expression...";

		this.previewEl.className = "ce-inline-formula-pop__preview";
		this.message.className = "ce-inline-formula-pop__message";
		this.message.hidden = true;
		this.message.setAttribute("aria-live", "polite");

		const footer = document.createElement("div");
		footer.className = "ce-inline-formula-pop__footer";
		const hint = document.createElement("span");
		hint.className = "ce-inline-formula-pop__hint";
		hint.textContent = "Enter to finish";
		const done = document.createElement("button");
		done.type = "button";
		done.className = "ce-inline-formula-pop__done";
		done.textContent = "Done";
		footer.append(hint, done);

		this.el.append(this.input, this.previewEl, this.message, footer);
		document.body.append(this.el);

		this.input.addEventListener("input", () => this.apply());
		this.input.addEventListener("keydown", (e) => {
			if (e.key === "Enter" || e.key === "Escape") {
				e.preventDefault();
				this.close(true);
			}
		});
		done.addEventListener("click", () => this.close(true));

		document.addEventListener("mousedown", (e) => {
			const node = e.target as Element | null;
			if (!this.target || !node) return;
			if (this.el.contains(node) || node.closest?.(SELECTOR)) return;
			this.close(false);
		});
	}

	open(target: HTMLElement): void {
		if (this.target === target) {
			this.input.focus();
			return;
		}
		if (this.target) this.close(false);

		this.target = target;
		this.input.value = target.dataset.latex ?? "";
		this.el.hidden = false;
		this.draw(this.input.value);
		this.position();
		this.input.focus();
	}

	close(restoreCaret: boolean): void {
		const target = this.target;
		if (!target) return;
		this.target = null;
		this.el.hidden = true;

		if (!(target.dataset.latex ?? "").trim()) {
			target.remove();
			return;
		}
		if (restoreCaret) placeCaretAfter(target);
	}

	// Shows the preview and error state in the popover, returns the fragment on success
	private draw(value: string): DocumentFragment | null {
		if (!value.trim()) {
			this.previewEl.replaceChildren();
			this.setError(null);
			return null;
		}
		try {
			const fragment = renderMath(value);
			this.previewEl.replaceChildren(fragment.cloneNode(true));
			this.setError(null);
			return fragment;
		} catch (err) {
			this.setError(errorText(err));
			return null;
		}
	}

	// Input handler: the source always updates, the rendered formula only on valid LaTeX
	private apply(): void {
		const target = this.target;
		if (!target) return;
		const value = this.input.value;

		target.dataset.latex = value;
		target.textContent = value;
		target.setAttribute("aria-label", `Edit formula ${value}`);

		const fragment = this.draw(value);
		const root = target.shadowRoot ?? target.attachShadow({ mode: "open" });
		if (fragment) root.replaceChildren(fragment);
		else if (!value.trim()) root.replaceChildren();
		this.position();
	}

	private setError(msg: string | null): void {
		this.el.classList.toggle("ce-inline-formula-pop--error", msg !== null);
		this.input.setAttribute("aria-invalid", String(msg !== null));
		this.message.textContent = msg ?? "";
		this.message.hidden = msg === null;
	}

	private position(): void {
		const target = this.target;
		if (!target) return;
		const anchor = target.getBoundingClientRect();
		const { width, height } = this.el.getBoundingClientRect();
		const left = Math.min(
			Math.max(8, anchor.left + anchor.width / 2 - width / 2),
			window.innerWidth - width - 8,
		);
		let top = anchor.bottom + 6;
		if (top + height > window.innerHeight - 8) {
			top = Math.max(8, anchor.top - height - 6);
		}
		this.el.style.left = `${left}px`;
		this.el.style.top = `${top}px`;
	}
}

let popover: FormulaPopover | null = null;
const getPopover = (): FormulaPopover => {
	popover ??= new FormulaPopover();
	return popover;
};

let listening = false;
function setupGlobalListeners(): void {
	if (listening) return;
	listening = true;

	// Click a rendered formula to edit it (skipped in read-only mode)
	document.addEventListener("click", (e) => {
		const el = (e.target as Element | null)?.closest?.(
			SELECTOR,
		) as HTMLElement | null;
		if (!el?.closest(".codex-editor")) return;
		if (!el.parentElement?.isContentEditable) return;
		getPopover().open(el);
	});

	// Renders formulas that arrive as plain HTML: loaded JSON, undo, duplicate, paste
	new MutationObserver(hydrateAll).observe(document.body, {
		childList: true,
		subtree: true,
	});
	hydrateAll();
}

/* ---------- Inline tool ---------- */
export default class InlineFormulaTool implements InlineTool {
	static isInline = true;

	static get title(): string {
		return "Inline formula";
	}

	static get shortcut(): string {
		return "CMD+SHIFT+E";
	}

	// Lets Editor.js keep our span and its source when it cleans saved HTML.
	// `contenteditable` is a runtime state (set by paint()) and is intentionally
	// not persisted: hydration re-applies it after load.
	static get sanitize() {
		return {
			span: {
				class: "ce-inline-formula",
				"data-latex": true,
			},
		};
	}

	private readonly api: API;
	private readonly button = document.createElement("button");

	constructor({ api }: InlineToolConstructorOptions) {
		this.api = api;
		setupGlobalListeners();
	}

	render(): HTMLElement {
		this.button.type = "button";
		this.button.title = "Inline formula (Ctrl/Cmd+Shift+E)";
		this.button.setAttribute("aria-label", "Inline formula");
		this.button.classList.add(this.api.styles.inlineToolButton);
		this.button.classList.add("ce-inline-tool--formula");
		this.button.innerHTML =
			'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="-2 -2 28 28" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sigma"><path d="M18 7V5a1 1 0 0 0-1-1H6.5a.5.5 0 0 0-.4.8l4.5 6a2 2 0 0 1 0 2.4l-4.5 6a.5.5 0 0 0 .4.8H17a1 1 0 0 0 1-1v-2"/></svg>';
		return this.button;
	}

	surround(range: Range): void {
		if (!range) return;

		// Selection already contains formulas: turn them back into plain text
		const scope = range.commonAncestorContainer;
		const host = scope instanceof Element ? scope : scope.parentElement;
		const existing = Array.from(
			host
				?.closest('[contenteditable="true"]')
				?.querySelectorAll<HTMLElement>(SELECTOR) ?? [],
		).filter((el) => range.intersectsNode(el));
		if (existing.length > 0) {
			for (const el of existing) {
				el.replaceWith(document.createTextNode(el.dataset.latex ?? ""));
			}
			return;
		}

		const formula = createFormula(range.toString());
		range.deleteContents();
		range.insertNode(formula);
		ensureTrailingText(formula);

		this.api.inlineToolbar.close();
		getPopover().open(formula);
	}

	checkState(selection: Selection): boolean {
		const range = selection.rangeCount ? selection.getRangeAt(0) : null;
		const active = !!range?.cloneContents().querySelector(SELECTOR);
		this.button.classList.toggle(
			this.api.styles.inlineToolButtonActive,
			active,
		);
		return active;
	}
}

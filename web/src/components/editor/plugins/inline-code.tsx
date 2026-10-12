import type {
	API,
	InlineTool,
	InlineToolConstructorOptions,
} from "@editorjs/editorjs";

const CODE_ICON =
	'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 8L5 12L9 16"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 8L19 12L15 16"/></svg>';

const CSS_CLASS = "inline-code";

let keyListenerAttached = false;

function isCaretAtEndOfElement(el: HTMLElement, range: Range): boolean {
	if (!range.collapsed) return false;
	const testRange = document.createRange();
	testRange.selectNodeContents(el);
	testRange.setStart(range.endContainer, range.endOffset);
	return testRange.toString().length === 0;
}

function setupInlineCodeKeyboardHandler(): void {
	if (keyListenerAttached || typeof document === "undefined") return;
	keyListenerAttached = true;

	document.addEventListener("keydown", (e: KeyboardEvent) => {
		if (
			e.key !== "ArrowRight" ||
			e.shiftKey ||
			e.ctrlKey ||
			e.metaKey ||
			e.altKey
		) {
			return;
		}
		const selection = window.getSelection();
		if (!selection?.rangeCount) return;
		const range = selection.getRangeAt(0);
		if (!range.collapsed) return;

		const container = range.endContainer;
		const parentEl =
			container instanceof Element ? container : container.parentElement;
		const codeEl = parentEl?.closest<HTMLElement>(`code.${CSS_CLASS}`);
		if (!codeEl?.closest(".codex-editor")) return;

		if (isCaretAtEndOfElement(codeEl, range)) {
			const next = codeEl.nextSibling;
			if (
				!next ||
				(next.nodeType === Node.TEXT_NODE &&
					(next.textContent ?? "").length === 0)
			) {
				e.preventDefault();
				const spacer = document.createTextNode("\u200B");
				codeEl.after(spacer);
				const nextRange = document.createRange();
				nextRange.setStart(spacer, 1);
				nextRange.collapse(true);
				selection.removeAllRanges();
				selection.addRange(nextRange);
			}
		}
	});
}

export default class InlineCodeTool implements InlineTool {
	static isInline = true;

	static get CSS(): string {
		return CSS_CLASS;
	}

	static get title(): string {
		return "Inline Code";
	}

	static get sanitize() {
		return {
			code: {
				class: CSS_CLASS,
			},
		};
	}

	private readonly api: API;
	private readonly tag = "CODE";
	private button: HTMLButtonElement | null = null;

	constructor({ api }: InlineToolConstructorOptions) {
		this.api = api;
		setupInlineCodeKeyboardHandler();
	}

	render(): HTMLElement {
		this.button = document.createElement("button");
		this.button.type = "button";
		this.button.title = "Inline Code";
		this.button.setAttribute("aria-label", "Inline Code");
		this.button.classList.add(this.api.styles.inlineToolButton);
		this.button.innerHTML = CODE_ICON;
		return this.button;
	}

	surround(range: Range): void {
		if (!range) return;

		const parentCode = this.api.selection.findParentTag(
			this.tag,
			InlineCodeTool.CSS,
		);

		if (parentCode) {
			this.unwrap(parentCode);
			return;
		}

		// Also check if the selection encompasses one or more existing <code class="inline-code"> elements
		const ancestor = range.commonAncestorContainer;
		const hostEl =
			ancestor instanceof Element ? ancestor : ancestor.parentElement;
		const editableRoot = hostEl?.closest('[contenteditable="true"]') ?? hostEl;
		const intersectingCodes = Array.from(
			editableRoot?.querySelectorAll<HTMLElement>(`code.${CSS_CLASS}`) ?? [],
		).filter((codeNode) => range.intersectsNode(codeNode));

		if (intersectingCodes.length > 0) {
			for (const codeNode of intersectingCodes) {
				this.unwrapNode(codeNode);
			}
			this.notifyBlockChange(editableRoot);
			return;
		}

		this.wrap(range);
		this.notifyBlockChange(editableRoot);
	}

	private wrap(range: Range): void {
		const codeEl = document.createElement(this.tag);
		codeEl.classList.add(InlineCodeTool.CSS);
		codeEl.appendChild(range.extractContents());
		range.insertNode(codeEl);
		this.api.selection.expandToTag(codeEl);
	}

	private unwrap(termWrapper: HTMLElement): void {
		const editableRoot =
			termWrapper.closest('[contenteditable="true"]') ??
			termWrapper.parentElement;
		this.api.selection.expandToTag(termWrapper);
		const sel = window.getSelection();
		if (!sel?.rangeCount) return;

		const unwrappedNodes = this.unwrapNode(termWrapper);
		if (unwrappedNodes.length > 0) {
			const newRange = document.createRange();
			newRange.setStartBefore(unwrappedNodes[0]);
			newRange.setEndAfter(unwrappedNodes[unwrappedNodes.length - 1]);
			sel.removeAllRanges();
			sel.addRange(newRange);
		}

		this.notifyBlockChange(editableRoot);
	}

	private unwrapNode(codeNode: HTMLElement): Node[] {
		const children = Array.from(codeNode.childNodes);
		if (children.length === 0) {
			const text = document.createTextNode(codeNode.textContent ?? "");
			codeNode.replaceWith(text);
			return [text];
		}
		codeNode.replaceWith(...children);
		return children;
	}

	private notifyBlockChange(node: Element | null | undefined): void {
		const blockEl = node?.closest(".ce-block");
		blockEl?.dispatchEvent(new Event("input", { bubbles: true }));
	}

	checkState(selection: Selection): boolean {
		const parentCode = this.api.selection.findParentTag(
			this.tag,
			InlineCodeTool.CSS,
		);
		let isActive = Boolean(parentCode);

		if (!isActive && selection.rangeCount > 0) {
			const range = selection.getRangeAt(0);
			if (!range.collapsed) {
				isActive = Boolean(
					range.cloneContents().querySelector(`code.${CSS_CLASS}`),
				);
			}
		}

		this.button?.classList.toggle(
			this.api.styles.inlineToolButtonActive,
			isActive,
		);
		return isActive;
	}
}

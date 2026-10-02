import type {
	API,
	InlineTool,
	InlineToolConstructorOptions,
} from "@editorjs/editorjs";

interface ColorItem {
	id: string;
	name: string;
	className: string;
	sampleColor: string;
}

const TEXT_COLORS: ColorItem[] = [
	{
		id: "default",
		name: "Default",
		className: "",
		sampleColor: "currentColor",
	},
	{
		id: "gray",
		name: "Gray",
		className: "cdx-color-gray",
		sampleColor: "#64748b",
	},
	{
		id: "red",
		name: "Red",
		className: "cdx-color-red",
		sampleColor: "#e11d48",
	},
	{
		id: "orange",
		name: "Orange",
		className: "cdx-color-orange",
		sampleColor: "#ea580c",
	},
	{
		id: "amber",
		name: "Amber",
		className: "cdx-color-amber",
		sampleColor: "#d97706",
	},
	{
		id: "green",
		name: "Green",
		className: "cdx-color-green",
		sampleColor: "#16a34a",
	},
	{
		id: "blue",
		name: "Blue",
		className: "cdx-color-blue",
		sampleColor: "#2563eb",
	},
	{
		id: "purple",
		name: "Purple",
		className: "cdx-color-purple",
		sampleColor: "#9333ea",
	},
	{
		id: "pink",
		name: "Pink",
		className: "cdx-color-pink",
		sampleColor: "#db2777",
	},
];

const HIGHLIGHT_COLORS: ColorItem[] = [
	{ id: "default", name: "None", className: "", sampleColor: "transparent" },
	{
		id: "gray",
		name: "Gray",
		className: "cdx-highlight-gray",
		sampleColor: "#cbd5e1",
	},
	{
		id: "red",
		name: "Red",
		className: "cdx-highlight-red",
		sampleColor: "#e11d48",
	},
	{
		id: "orange",
		name: "Orange",
		className: "cdx-highlight-orange",
		sampleColor: "#fed7aa",
	},
	{
		id: "amber",
		name: "Amber",
		className: "cdx-highlight-amber",
		sampleColor: "#fde68a",
	},
	{
		id: "green",
		name: "Green",
		className: "cdx-highlight-green",
		sampleColor: "#bbf7d0",
	},
	{
		id: "blue",
		name: "Blue",
		className: "cdx-highlight-blue",
		sampleColor: "#bfdbfe",
	},
	{
		id: "purple",
		name: "Purple",
		className: "cdx-highlight-purple",
		sampleColor: "#e9d5ff",
	},
	{
		id: "pink",
		name: "Pink",
		className: "cdx-highlight-pink",
		sampleColor: "#fbcfe8",
	},
];

const PALETTE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="-3 -3 30 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-palette"><path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z"/><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/></svg>`;

export default class ColorInlineTool implements InlineTool {
	static isInline = true;

	static get title(): string {
		return "Color";
	}

	static get sanitize() {
		return {
			mark: {
				class: true,
			},
		};
	}

	private readonly api: API;
	private readonly button = document.createElement("button");
	private popoverEl: HTMLElement | null = null;
	private savedRange: Range | null = null;

	constructor({ api }: InlineToolConstructorOptions) {
		this.api = api;
	}

	render(): HTMLElement {
		this.button.type = "button";
		this.button.title = "Text color & highlight";
		this.button.setAttribute("aria-label", "Text color and highlight");
		this.button.classList.add(this.api.styles.inlineToolButton);
		this.button.classList.add("ce-inline-tool--color");
		this.button.innerHTML = PALETTE_ICON;
		return this.button;
	}

	surround(range: Range): void {
		if (!range) return;
		this.savedRange = range.cloneRange();
		this.openPopover(range);
	}

	checkState(selection: Selection): boolean {
		const range = selection.rangeCount ? selection.getRangeAt(0) : null;
		if (!range) return false;
		const container = range.commonAncestorContainer;
		const parent =
			container instanceof Element ? container : container.parentElement;
		const mark = parent?.closest("mark");
		const hasColor =
			!!mark?.className && /cdx-(color|highlight)-/.test(mark.className);
		this.button.classList.toggle(
			this.api.styles.inlineToolButtonActive,
			hasColor,
		);
		return hasColor;
	}

	private openPopover(range: Range): void {
		this.closePopover();

		const popover = document.createElement("div");
		popover.className = "ce-color-popover";
		popover.setAttribute("role", "dialog");
		popover.setAttribute("aria-label", "Choose text color or highlight");

		// Header / Tabs
		const header = document.createElement("div");
		header.className = "ce-color-popover__header";
		header.textContent = "Color";
		popover.appendChild(header);

		// Section: Text Color
		const textSection = document.createElement("div");
		textSection.className = "ce-color-popover__section";
		const textLabel = document.createElement("div");
		textLabel.className = "ce-color-popover__label";
		textLabel.textContent = "Text color";
		textSection.appendChild(textLabel);

		const textGrid = document.createElement("div");
		textGrid.className = "ce-color-popover__grid";
		for (const item of TEXT_COLORS) {
			const btn = document.createElement("button");
			btn.type = "button";
			btn.className = "ce-color-popover__item";
			btn.title = item.name;

			const dot = document.createElement("span");
			dot.className = "ce-color-popover__dot";
			dot.style.backgroundColor = item.sampleColor;
			if (item.id === "default") {
				dot.classList.add("ce-color-popover__dot--default");
			}

			const name = document.createElement("span");
			name.className = "ce-color-popover__name";
			name.textContent = item.name;

			btn.append(dot, name);
			btn.addEventListener("mousedown", (e) => e.preventDefault());
			btn.addEventListener("click", () =>
				this.applyColor(item.className, "color"),
			);
			textGrid.appendChild(btn);
		}
		textSection.appendChild(textGrid);
		popover.appendChild(textSection);

		// Section: Background Highlight
		const highlightSection = document.createElement("div");
		highlightSection.className = "ce-color-popover__section";
		const highlightLabel = document.createElement("div");
		highlightLabel.className = "ce-color-popover__label";
		highlightLabel.textContent = "Background highlight";
		highlightSection.appendChild(highlightLabel);

		const highlightGrid = document.createElement("div");
		highlightGrid.className = "ce-color-popover__grid";
		for (const item of HIGHLIGHT_COLORS) {
			const btn = document.createElement("button");
			btn.type = "button";
			btn.className = "ce-color-popover__item";
			btn.title = `${item.name} highlight`;

			const badge = document.createElement("span");
			badge.className = "ce-color-popover__badge";
			badge.style.backgroundColor = item.sampleColor;
			if (item.id === "default") {
				badge.classList.add("ce-color-popover__badge--none");
			}

			const name = document.createElement("span");
			name.className = "ce-color-popover__name";
			name.textContent = item.name;

			btn.append(badge, name);
			btn.addEventListener("mousedown", (e) => e.preventDefault());
			btn.addEventListener("click", () =>
				this.applyColor(item.className, "highlight"),
			);
			highlightGrid.appendChild(btn);
		}
		highlightSection.appendChild(highlightGrid);
		popover.appendChild(highlightSection);

		document.body.appendChild(popover);
		this.popoverEl = popover;

		// Position popover relative to selection
		const rect = range.getBoundingClientRect();
		const popRect = popover.getBoundingClientRect();
		const top = Math.min(
			window.innerHeight - popRect.height - 12,
			rect.bottom + 8,
		);
		const left = Math.max(
			12,
			Math.min(
				window.innerWidth - popRect.width - 12,
				rect.left + rect.width / 2 - popRect.width / 2,
			),
		);
		popover.style.top = `${top}px`;
		popover.style.left = `${left}px`;

		// Close listener on outside click or escape
		const outsideHandler = (e: MouseEvent) => {
			if (
				popover.contains(e.target as Node) ||
				this.button.contains(e.target as Node)
			) {
				return;
			}
			this.closePopover();
			document.removeEventListener("mousedown", outsideHandler);
		};
		setTimeout(() => document.addEventListener("mousedown", outsideHandler), 0);

		const keyHandler = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				this.closePopover();
				document.removeEventListener("keydown", keyHandler);
			}
		};
		document.addEventListener("keydown", keyHandler);
	}

	private closePopover(): void {
		if (this.popoverEl) {
			this.popoverEl.remove();
			this.popoverEl = null;
		}
	}

	private applyColor(newClass: string, type: "color" | "highlight"): void {
		if (!this.savedRange) return;

		// Restore selection
		const selection = window.getSelection();
		if (!selection) return;
		selection.removeAllRanges();
		selection.addRange(this.savedRange);

		const range = this.savedRange;
		const container = range.commonAncestorContainer;
		const parent =
			container instanceof Element ? container : container.parentElement;
		const existingMark = parent?.closest("mark");

		const otherPrefix = type === "color" ? "cdx-highlight-" : "cdx-color-";

		if (existingMark && range.toString() === existingMark.textContent) {
			// Updating or removing on an existing whole mark
			const currentClasses = Array.from(existingMark.classList);
			const otherClass =
				currentClasses.find((c) => c.startsWith(otherPrefix)) ?? "";

			existingMark.className = "";
			if (otherClass) existingMark.classList.add(otherClass);
			if (newClass) existingMark.classList.add(newClass);

			// If no classes remain, unwrap mark
			if (!existingMark.className) {
				const textNode = document.createTextNode(
					existingMark.textContent ?? "",
				);
				existingMark.replaceWith(textNode);
			}
		} else {
			if (!newClass) {
				this.closePopover();
				return;
			}
			// Wrap selection with mark
			const mark = document.createElement("mark");
			mark.className = newClass;
			try {
				range.surroundContents(mark);
			} catch {
				// If selection crosses node boundaries, extract contents and append
				const fragment = range.extractContents();
				mark.appendChild(fragment);
				range.insertNode(mark);
			}
		}

		// Trigger input event on block so Editor.js registers the edit
		const blockEl = parent?.closest(".ce-block");
		blockEl?.dispatchEvent(new Event("input", { bubbles: true }));

		this.closePopover();
		this.api.inlineToolbar.close();
	}
}

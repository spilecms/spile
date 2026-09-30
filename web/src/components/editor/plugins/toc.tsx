import type {
	BlockTool,
	BlockToolData,
	ToolboxConfig,
} from "@editorjs/editorjs";

const HEADING_SELECTOR = "h1, h2, h3, h4, h5, h6";
const REFRESH_DELAY = 200;

interface Entry {
	el: HTMLElement;
	text: string;
	level: number;
}

function isInsideToc(node: Node): boolean {
	const el = node instanceof Element ? node : node.parentElement;
	return !!el?.closest(".ce-toc");
}

export default class TocTool implements BlockTool {
	static get toolbox(): ToolboxConfig {
		return {
			title: "Table of contents",
			icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 5H3"/><path d="M16 12H3"/><path d="M16 19H3"/><path d="M21 5h.01"/><path d="M21 12h.01"/><path d="M21 19h.01"/></svg>',
		};
	}

	static get isReadOnlySupported(): boolean {
		return true;
	}

	private readonly wrapper = document.createElement("nav");
	private readonly titleEl = document.createElement("div");
	private readonly listEl = document.createElement("ul");

	private root: Element | null = null;
	private observer: MutationObserver | null = null;
	private timer: ReturnType<typeof setTimeout> | null = null;
	private signature = "";

	render(): HTMLElement {
		this.wrapper.className = "ce-toc";
		this.wrapper.setAttribute("aria-label", "Table of contents");

		this.titleEl.className = "ce-toc__title";
		this.titleEl.textContent = "Table of contents";

		this.listEl.className = "ce-toc__list";

		// Keep the caret where it is when a link is clicked
		this.listEl.addEventListener("mousedown", (e) => e.preventDefault());
		this.listEl.addEventListener("click", (e) => {
			const link = (e.target as Element).closest<HTMLElement>(".ce-toc__link");
			if (!link) return;
			// Look the heading up now: Editor.js may have re-created it since the last render
			const entry = this.collect()[Number(link.dataset.index)];
			entry?.el.scrollIntoView({ behavior: "smooth", block: "start" });
		});

		this.wrapper.append(this.titleEl, this.listEl);
		return this.wrapper;
	}

	rendered(): void {
		this.root = this.wrapper.closest(".codex-editor");
		const redactor = this.root?.querySelector(".codex-editor__redactor");
		if (!redactor) return;

		this.refresh();

		this.observer = new MutationObserver((mutations) => {
			// Ignore our own list updates, otherwise refresh() re-triggers itself
			if (mutations.every((m) => isInsideToc(m.target))) return;
			if (this.timer) clearTimeout(this.timer);
			this.timer = setTimeout(() => this.refresh(), REFRESH_DELAY);
		});
		this.observer.observe(redactor, {
			childList: true,
			subtree: true,
			characterData: true,
		});
	}

	destroy(): void {
		this.observer?.disconnect();
		this.observer = null;
		if (this.timer) clearTimeout(this.timer);
		this.timer = null;
	}

	save(): BlockToolData {
		return {};
	}

	validate(): boolean {
		return true;
	}

	/* ---------- internals ---------- */
	private collect(): Entry[] {
		if (!this.root) return [];
		const entries: Entry[] = [];
		for (const el of this.root.querySelectorAll<HTMLElement>(
			HEADING_SELECTOR,
		)) {
			if (el.closest(".ce-toc")) continue;
			const text = el.textContent?.trim();
			if (!text) continue;
			entries.push({ el, text, level: Number(el.tagName.slice(1)) });
		}
		return entries;
	}

	private refresh(): void {
		const entries = this.collect();

		// Nothing visible changed, so skip the rebuild
		const signature = entries.map((e) => `${e.level}:${e.text}`).join("\n");
		if (signature === this.signature) return;
		this.signature = signature;

		if (entries.length === 0) {
			const empty = document.createElement("li");
			empty.className = "ce-toc__empty";
			empty.textContent = "Add headings to build a table of contents.";
			this.listEl.replaceChildren(empty);
			return;
		}

		// Indent relative to the shallowest heading in the document
		const minLevel = Math.min(...entries.map((e) => e.level));

		this.listEl.replaceChildren(
			...entries.map((entry, index) => {
				const li = document.createElement("li");
				li.className = "ce-toc__item";
				li.style.setProperty("--toc-depth", String(entry.level - minLevel));

				const link = document.createElement("button");
				link.type = "button";
				link.className = "ce-toc__link";
				link.dataset.index = String(index);
				link.textContent = entry.text;

				li.append(link);
				return li;
			}),
		);
	}
}

export interface ToolboxCategory {
	id: string;
	label: string;
	firstToolName: string;
	showDivider?: boolean;
}

export const TOOLBOX_CATEGORIES: ToolboxCategory[] = [
	{
		id: "basic",
		label: "Basic Blocks",
		firstToolName: "header",
		showDivider: false,
	},
	{
		id: "media",
		label: "Media",
		firstToolName: "image",
		showDivider: true,
	},
	{
		id: "advanced",
		label: "Advanced",
		firstToolName: "table",
		showDivider: true,
	},
	{
		id: "api",
		label: "API Reference",
		firstToolName: "paramField",
		showDivider: true,
	},
];

/**
 * Injects category headers and dividers into Editor.js's toolbox popover.
 * Returns a cleanup function to be invoked when the editor is destroyed.
 */
export function setupToolboxOrganizer(holder: HTMLElement): () => void {
	let holderObserver: MutationObserver | null = null;
	let bodyObserver: MutationObserver | null = null;
	const cleanups: Array<() => void> = [];

	const decorateItemsContainer = (itemsContainer: HTMLElement) => {
		// If already decorated, skip
		if (itemsContainer.querySelector(".spile-toolbox-header")) {
			return;
		}

		for (const cat of TOOLBOX_CATEGORIES) {
			const targetItem =
				itemsContainer.querySelector<HTMLElement>(
					`.ce-popover-item[data-item-name="${cat.firstToolName}"]`,
				) ||
				itemsContainer.querySelector<HTMLElement>(
					`.ce-popover-item[data-item-name="${cat.firstToolName.toLowerCase()}"]`,
				);

			if (!targetItem) continue;

			if (cat.showDivider) {
				const divider = document.createElement("div");
				divider.className = "spile-toolbox-divider";
				divider.setAttribute("role", "separator");
				divider.setAttribute("aria-hidden", "true");
				itemsContainer.insertBefore(divider, targetItem);
			}

			const header = document.createElement("div");
			header.className = "spile-toolbox-header";
			header.setAttribute("aria-hidden", "true");
			header.textContent = cat.label;
			itemsContainer.insertBefore(header, targetItem);
		}

		// Find parent popover to wire search filtering
		const popover = itemsContainer.closest<HTMLElement>(".ce-popover");
		const searchInput = popover?.querySelector<HTMLInputElement>(
			"input.cdx-search-field__input, .cdx-search-field input, input",
		);

		if (searchInput && !searchInput.dataset.spileSearchBound) {
			searchInput.dataset.spileSearchBound = "true";

			const handleSearch = () => {
				const isSearching = searchInput.value.trim().length > 0;
				const elements = itemsContainer.querySelectorAll<HTMLElement>(
					".spile-toolbox-header, .spile-toolbox-divider",
				);
				for (const el of elements) {
					el.style.display = isSearching ? "none" : "";
				}
			};

			searchInput.addEventListener("input", handleSearch);
			searchInput.addEventListener("keyup", handleSearch);
			cleanups.push(() => {
				searchInput.removeEventListener("input", handleSearch);
				searchInput.removeEventListener("keyup", handleSearch);
			});
		}
	};

	const scanAndDecorate = () => {
		// Only search within the editor holder — never do a document-wide query.
		// The bodyObserver already triggers a scan when the popover is appended to
		// document.body, so we can rely on holder + body-level popover containers.
		const holderCandidates =
			holder.querySelectorAll<HTMLElement>(".ce-popover__items");

		// Also catch popovers that Editor.js appends directly to <body> (outside the holder)
		const bodyCandidates = document.querySelectorAll<HTMLElement>(
			".ce-toolbox .ce-popover__items",
		);

		const seen = new Set<HTMLElement>();
		for (const container of [...holderCandidates, ...bodyCandidates]) {
			if (seen.has(container)) continue;
			seen.add(container);

			// Check if this container is the toolbox (contains header or list tool)
			const isToolbox =
				container.querySelector('.ce-popover-item[data-item-name="header"]') ||
				container.querySelector('.ce-popover-item[data-item-name="list"]');

			if (isToolbox) {
				decorateItemsContainer(container);
			}
		}
	};

	let scheduled = false;
	const scheduleScan = () => {
		if (scheduled) return;
		scheduled = true;
		requestAnimationFrame(() => {
			scheduled = false;
			scanAndDecorate();
		});
	};

	// 1. Initial scan
	scheduleScan();

	// 2. Targeted MutationObserver on editor holder — shallow childList only.
	//    subtree:true was the main performance killer: it fired on every single
	//    keystroke/cursor move, triggering expensive DOM scans while the popover
	//    was open. We only need to know when a block is added or removed (direct
	//    child of holder), which does NOT require subtree observation.
	holderObserver = new MutationObserver((mutations) => {
		let shouldScan = false;
		for (const m of mutations) {
			if (m.addedNodes.length > 0 || m.removedNodes.length > 0) {
				shouldScan = true;
				break;
			}
		}
		if (shouldScan) {
			scheduleScan();
		}
	});
	holderObserver.observe(holder, {
		childList: true,
		subtree: false, // Only direct children — block add/remove, not text edits
	});

	// 3. Targeted MutationObserver on document.body for popover containers added at root level (shallow childList only)
	bodyObserver = new MutationObserver((mutations) => {
		for (const m of mutations) {
			for (const node of m.addedNodes) {
				if (node instanceof HTMLElement) {
					if (
						node.classList.contains("ce-popover") ||
						node.classList.contains("ce-toolbox") ||
						node.querySelector?.(".ce-popover__items")
					) {
						scheduleScan();
						return;
					}
				}
			}
		}
	});
	bodyObserver.observe(document.body, {
		childList: true,
	});

	return () => {
		scheduled = false;
		if (holderObserver) {
			holderObserver.disconnect();
			holderObserver = null;
		}
		if (bodyObserver) {
			bodyObserver.disconnect();
			bodyObserver = null;
		}
		for (const cleanup of cleanups) {
			cleanup();
		}
		cleanups.length = 0;
	};
}

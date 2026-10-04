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
		// Find any popover items container in holder or document
		const candidates = [
			...holder.querySelectorAll<HTMLElement>(".ce-popover__items"),
			...document.querySelectorAll<HTMLElement>(
				".ce-toolbox .ce-popover__items, .ce-popover__items",
			),
		];

		const seen = new Set<HTMLElement>();
		for (const container of candidates) {
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

	// 1. Initial scan
	scanAndDecorate();

	// 2. Scan when user clicks or types inside holder (e.g. clicking the '+' button or typing '/')
	const onHolderInteraction = () => {
		requestAnimationFrame(scanAndDecorate);
	};
	holder.addEventListener("click", onHolderInteraction, true);
	holder.addEventListener("keydown", onHolderInteraction, true);
	cleanups.push(() => {
		holder.removeEventListener("click", onHolderInteraction, true);
		holder.removeEventListener("keydown", onHolderInteraction, true);
	});

	// 3. MutationObserver on editor holder
	holderObserver = new MutationObserver(() => {
		scanAndDecorate();
	});
	holderObserver.observe(holder, {
		childList: true,
		subtree: true,
	});

	// 4. MutationObserver on document.body (in case popover is appended to body or moves)
	bodyObserver = new MutationObserver(() => {
		scanAndDecorate();
	});
	bodyObserver.observe(document.body, {
		childList: true,
		subtree: true,
	});

	return () => {
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

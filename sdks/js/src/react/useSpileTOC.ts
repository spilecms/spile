import { useCallback, useEffect, useMemo, useState } from "react";
import { extractTableOfContents, type TocHeading } from "../toc.js";
import type { BlockNoteBlock } from "../types/index.js";

export interface UseSpileTOCOptions {
	/** BlockNote blocks array to extract table of contents from */
	blocks?: BlockNoteBlock[] | null;
	/** Pre-extracted headings array (alternative to passing blocks) */
	headings?: TocHeading[];
	/** Options passed to IntersectionObserver */
	observerOptions?: IntersectionObserverInit;
	/** Minimum heading level to include (default: 1) */
	minLevel?: number;
	/** Maximum heading level to include (default: 3) */
	maxLevel?: number;
}

export interface UseSpileTOCResult {
	/** Extracted table of contents headings */
	headings: TocHeading[];
	/** ID of heading currently visible in viewport */
	activeId: string | null;
	/** Programmatically scroll to heading anchor with smooth behavior */
	scrollToHeading: (id: string) => void;
}

/**
 * Headless Table of Contents hook for "On this page" right-sidebar navigation.
 * Uses IntersectionObserver to track the active heading as user scrolls.
 *
 * @example
 * ```tsx
 * const { headings, activeId, scrollToHeading } = useSpileTOC({
 *   blocks: docPage.content
 * });
 * ```
 */
export function useSpileTOC(options: UseSpileTOCOptions): UseSpileTOCResult {
	const {
		blocks,
		headings: providedHeadings,
		observerOptions,
		minLevel = 1,
		maxLevel = 3,
	} = options;

	const headings = useMemo<TocHeading[]>(() => {
		if (providedHeadings && Array.isArray(providedHeadings)) {
			return providedHeadings.filter(
				(h) => h.level >= minLevel && h.level <= maxLevel,
			);
		}
		if (blocks && Array.isArray(blocks)) {
			const all = extractTableOfContents(blocks);
			return all.filter((h) => h.level >= minLevel && h.level <= maxLevel);
		}
		return [];
	}, [providedHeadings, blocks, minLevel, maxLevel]);

	const [activeId, setActiveId] = useState<string | null>(() => {
		const first = headings[0];
		return first ? first.id : null;
	});

	// Setup scroll spy using IntersectionObserver
	useEffect(() => {
		if (
			typeof window === "undefined" ||
			typeof IntersectionObserver === "undefined" ||
			headings.length === 0
		) {
			return;
		}

		const visibleHeadings = new Set<string>();

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					const id = entry.target.id;
					if (entry.isIntersecting) {
						visibleHeadings.add(id);
					} else {
						visibleHeadings.delete(id);
					}
				}

				// Pick the first visible heading matching document order
				if (visibleHeadings.size > 0) {
					for (const heading of headings) {
						if (visibleHeadings.has(heading.id)) {
							setActiveId(heading.id);
							break;
						}
					}
				}
			},
			observerOptions || {
				rootMargin: "-80px 0px -60% 0px",
				threshold: [0, 1],
			},
		);

		const observedElements: HTMLElement[] = [];
		for (const heading of headings) {
			const el = document.getElementById(heading.id);
			if (el) {
				observer.observe(el);
				observedElements.push(el);
			}
		}

		return () => {
			for (const el of observedElements) {
				observer.unobserve(el);
			}
			observer.disconnect();
		};
	}, [headings, observerOptions]);

	const scrollToHeading = useCallback((id: string) => {
		if (typeof window === "undefined") return;

		const target = document.getElementById(id);
		if (target) {
			target.scrollIntoView({ behavior: "smooth" });
			setActiveId(id);
			if (window.history?.pushState) {
				window.history.pushState(null, "", `#${id}`);
			}
		}
	}, []);

	return {
		headings,
		activeId,
		scrollToHeading,
	};
}

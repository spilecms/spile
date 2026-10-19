/**
 * Table of Contents (TOC) Extractor
 * Scans BlockNote document blocks to extract headings and generate unique anchor slugs for right-side page navigation.
 */

import type { BlockNoteBlock, BlockNoteInlineContent } from "./types/index.js";

export interface TocHeading {
	/**
	 * Generated URL anchor hash (e.g. "getting-started" for #getting-started)
	 */
	id: string;
	/**
	 * Plain text title of the heading
	 */
	text: string;
	/**
	 * Heading level (1 = H1, 2 = H2, 3 = H3, etc.)
	 */
	level: number;
}

/**
 * Converts a heading title into a clean, URL-safe anchor slug.
 */
export function slugifyHeading(text: string): string {
	return text
		.toLowerCase()
		.trim()
		.replace(/[^\p{L}\p{N}\s_-]/gu, "")
		.replace(/[\s_-]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

/**
 * Extracts plain text from an array of BlockNote inline content objects.
 */
export function extractInlineText(content?: BlockNoteInlineContent[]): string {
	if (!content || !Array.isArray(content)) {
		return "";
	}
	return content
		.map((item) =>
			typeof item === "object" && item && "text" in item ? item.text || "" : "",
		)
		.join("")
		.trim();
}

/**
 * Scans BlockNote blocks recursively to extract heading anchors with automatic deduplication.
 *
 * @param blocks - The BlockNote block array (e.g. from post.content or docPage.content)
 * @param maxLevel - Maximum heading level to include (default: 3 to include H1, H2, H3)
 * @returns Array of TocHeading objects with unique anchor IDs
 *
 * @example
 * ```ts
 * const toc = extractTableOfContents(page.content);
 * // [
 * //   { id: "getting-started", text: "Getting Started", level: 2 },
 * //   { id: "configuration", text: "Configuration", level: 3 }
 * // ]
 * ```
 */
export function extractTableOfContents(
	blocks?: BlockNoteBlock[] | null,
	maxLevel = 3,
): TocHeading[] {
	if (!blocks || !Array.isArray(blocks)) {
		return [];
	}

	const headings: TocHeading[] = [];
	const slugCounts = new Map<string, number>();

	function traverse(list: BlockNoteBlock[]) {
		for (const block of list) {
			if (block.type === "heading") {
				const level = Number(block.props?.level) || 1;
				if (level <= maxLevel) {
					const text = extractInlineText(block.content);
					if (text) {
						const baseSlug =
							slugifyHeading(text) || `heading-${headings.length + 1}`;
						const count = slugCounts.get(baseSlug) || 0;
						slugCounts.set(baseSlug, count + 1);

						const uniqueId = count > 0 ? `${baseSlug}-${count}` : baseSlug;

						headings.push({
							id: uniqueId,
							text,
							level,
						});
					}
				}
			}

			if (block.children && block.children.length > 0) {
				traverse(block.children);
			}
		}
	}

	traverse(blocks);
	return headings;
}

/**
 * Documentation Tree Navigation Utilities
 * Provides tree flattening, previous/next page pagination, and breadcrumb trail calculation.
 */

import type { DocTreeItem } from "./types/index.js";

export interface FlatDocItem {
	id: string;
	title: string;
	slug: string;
	icon?: string;
	pageId?: string;
	parentId?: string | null;
	depth: number;
}

export interface BreadcrumbItem {
	id: string;
	title: string;
	slug: string;
}

/**
 * Normalizes a URL slug by stripping leading and trailing slashes.
 */
function normalizeSlug(slug: string): string {
	return slug.replace(/^\/+|\/+$/g, "");
}

/**
 * Recursively flattens a documentation tree into an ordered, sequential array of navigable pages.
 * Useful for building search indices, flat lists, and sequential pagination.
 */
export function flattenTree(items: DocTreeItem[], depth = 0): FlatDocItem[] {
	const result: FlatDocItem[] = [];

	for (const item of items) {
		// Only include items that represent an actual page (has a slug)
		if (item.slug) {
			result.push({
				id: item.id,
				title: item.title,
				slug: item.slug,
				icon: item.icon,
				pageId: item.pageId,
				parentId: item.parentId,
				depth,
			});
		}

		if (item.children && item.children.length > 0) {
			result.push(...flattenTree(item.children, depth + 1));
		}
	}

	return result;
}

/**
 * Calculates the previous and next pages in the documentation hierarchy relative to the current page.
 * Perfect for rendering "Previous page" and "Next page" navigation cards at the bottom of doc articles.
 *
 * @example
 * ```ts
 * const { prev, next } = getPrevNextPages(manifest.items, currentSlug);
 * ```
 */
export function getPrevNextPages(
	items: DocTreeItem[],
	currentSlugOrId: string,
): { prev: FlatDocItem | null; next: FlatDocItem | null } {
	const flat = flattenTree(items);
	const target = normalizeSlug(currentSlugOrId);

	const index = flat.findIndex(
		(item) =>
			item.id === currentSlugOrId ||
			item.pageId === currentSlugOrId ||
			normalizeSlug(item.slug) === target,
	);

	if (index === -1) {
		return { prev: null, next: null };
	}

	const prev = index > 0 ? (flat[index - 1] ?? null) : null;
	const next = index < flat.length - 1 ? (flat[index + 1] ?? null) : null;

	return { prev, next };
}

/**
 * Finds the hierarchical breadcrumb trail from the root of the tree down to the current page.
 *
 * @example
 * ```ts
 * const breadcrumbs = findBreadcrumbTrail(manifest.items, currentSlug);
 * // Returns: [{ title: "Documentation", slug: "docs" }, { title: "API", slug: "api" }, ...]
 * ```
 */
export function findBreadcrumbTrail(
	items: DocTreeItem[],
	currentSlugOrId: string,
): BreadcrumbItem[] {
	const target = normalizeSlug(currentSlugOrId);

	function search(
		currentItems: DocTreeItem[],
		path: BreadcrumbItem[],
	): BreadcrumbItem[] | null {
		for (const item of currentItems) {
			const currentPath = [
				...path,
				{ id: item.id, title: item.title, slug: item.slug },
			];

			if (
				item.id === currentSlugOrId ||
				item.pageId === currentSlugOrId ||
				normalizeSlug(item.slug) === target
			) {
				return currentPath;
			}

			if (item.children && item.children.length > 0) {
				const found = search(item.children, currentPath);
				if (found) {
					return found;
				}
			}
		}
		return null;
	}

	return search(items, []) || [];
}

/**
 * Finds the active node in the documentation tree matching a slug or ID.
 */
export function findActiveItem(
	items: DocTreeItem[],
	currentSlugOrId: string,
): DocTreeItem | null {
	const target = normalizeSlug(currentSlugOrId);

	for (const item of items) {
		if (
			item.id === currentSlugOrId ||
			item.pageId === currentSlugOrId ||
			normalizeSlug(item.slug) === target
		) {
			return item;
		}

		if (item.children && item.children.length > 0) {
			const found = findActiveItem(item.children, currentSlugOrId);
			if (found) {
				return found;
			}
		}
	}

	return null;
}

import { useCallback, useEffect, useMemo, useState } from "react";
import {
	type BreadcrumbItem,
	type FlatDocItem,
	findActiveItem,
	findBreadcrumbTrail,
	getPrevNextPages,
} from "../tree.js";
import type { DocNavigationManifest, DocTreeItem } from "../types/index.js";

export interface UseSpileNavOptions {
	/** Documentation navigation manifest */
	manifest?: DocNavigationManifest | null;
	/** Direct sidebar tree items (alternative to passing manifest) */
	items?: DocTreeItem[] | null;
	/** Current page slug or ID to locate active item, breadcrumbs, and pagination */
	currentSlug?: string;
	/** Automatically expand parent categories of the active item (default: true) */
	autoExpandActiveParents?: boolean;
	/** Initially expanded group item IDs */
	defaultExpandedIds?: string[];
}

export interface UseSpileNavResult {
	/** Full tree items array (from manifest.sidebar or items) */
	tree: DocTreeItem[];
	/** The currently active tree item */
	activeItem: DocTreeItem | null;
	/** Breadcrumb trail leading to active item */
	breadcrumbs: BreadcrumbItem[];
	/** Previous page item for bottom pagination card */
	prevPage: FlatDocItem | null;
	/** Next page item for bottom pagination card */
	nextPage: FlatDocItem | null;
	/** Set of currently expanded group/category item IDs */
	expandedIds: Set<string>;
	/** Check if an item ID is expanded */
	isExpanded: (id: string) => boolean;
	/** Toggle expanded state for an item ID */
	toggleExpand: (id: string) => void;
	/** Set expanded state for an item ID */
	setExpanded: (id: string, expanded: boolean) => void;
	/** Expand all group items in the tree */
	expandAll: () => void;
	/** Collapse all items */
	collapseAll: () => void;
}

/**
 * Headless navigation hook designed for documentation sidebars, breadcrumbs, and prev/next links.
 * Directly integrates with shadcn/ui <Sidebar>, <Collapsible>, and <Breadcrumb>.
 *
 * @example
 * ```tsx
 * const { tree, activeItem, breadcrumbs, prevPage, nextPage, isExpanded, toggleExpand } = useSpileNav({
 *   manifest,
 *   currentSlug: "getting-started"
 * });
 * ```
 */
export function useSpileNav(options: UseSpileNavOptions): UseSpileNavResult {
	const {
		manifest,
		items,
		currentSlug,
		autoExpandActiveParents = true,
		defaultExpandedIds = [],
	} = options;

	const tree = useMemo<DocTreeItem[]>(() => {
		if (manifest?.items && Array.isArray(manifest.items)) {
			return manifest.items;
		}
		if (items && Array.isArray(items)) {
			return items;
		}
		return [];
	}, [manifest, items]);

	const [expandedIds, setExpandedIds] = useState<Set<string>>(
		() => new Set(defaultExpandedIds),
	);

	const activeItem = useMemo(() => {
		if (!currentSlug) return null;
		return findActiveItem(tree, currentSlug);
	}, [tree, currentSlug]);

	const breadcrumbs = useMemo(() => {
		if (!currentSlug) return [];
		return findBreadcrumbTrail(tree, currentSlug);
	}, [tree, currentSlug]);

	const { prev: prevPage, next: nextPage } = useMemo(() => {
		if (!currentSlug) return { prev: null, next: null };
		return getPrevNextPages(tree, currentSlug);
	}, [tree, currentSlug]);

	// Auto-expand parent categories of the active item
	useEffect(() => {
		if (!autoExpandActiveParents || breadcrumbs.length === 0) {
			return;
		}

		setExpandedIds((prev) => {
			let changed = false;
			const nextSet = new Set(prev);
			// Expand all ancestor breadcrumbs
			for (let i = 0; i < breadcrumbs.length - 1; i++) {
				const bItem = breadcrumbs[i];
				if (bItem && !nextSet.has(bItem.id)) {
					nextSet.add(bItem.id);
					changed = true;
				}
			}
			return changed ? nextSet : prev;
		});
	}, [breadcrumbs, autoExpandActiveParents]);

	const isExpanded = useCallback(
		(id: string) => expandedIds.has(id),
		[expandedIds],
	);

	const toggleExpand = useCallback((id: string) => {
		setExpandedIds((prev) => {
			const nextSet = new Set(prev);
			if (nextSet.has(id)) {
				nextSet.delete(id);
			} else {
				nextSet.add(id);
			}
			return nextSet;
		});
	}, []);

	const setExpanded = useCallback((id: string, expanded: boolean) => {
		setExpandedIds((prev) => {
			if (prev.has(id) === expanded) return prev;
			const nextSet = new Set(prev);
			if (expanded) {
				nextSet.add(id);
			} else {
				nextSet.delete(id);
			}
			return nextSet;
		});
	}, []);

	const expandAll = useCallback(() => {
		const idsWithChildren = new Set<string>();

		const collectParentIds = (nodes: DocTreeItem[]) => {
			for (const node of nodes) {
				if (node.children && node.children.length > 0) {
					idsWithChildren.add(node.id);
					collectParentIds(node.children);
				}
			}
		};
		collectParentIds(tree);
		setExpandedIds(idsWithChildren);
	}, [tree]);

	const collapseAll = useCallback(() => {
		setExpandedIds(new Set());
	}, []);

	return {
		tree,
		activeItem,
		breadcrumbs,
		prevPage,
		nextPage,
		expandedIds,
		isExpanded,
		toggleExpand,
		setExpanded,
		expandAll,
		collapseAll,
	};
}

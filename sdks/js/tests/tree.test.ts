import assert from "node:assert/strict";
import test from "node:test";
import type { DocTreeItem } from "../dist/index.js";
import {
	findActiveItem,
	findBreadcrumbTrail,
	flattenTree,
	getPrevNextPages,
} from "../dist/index.js";

const mockNavTree: DocTreeItem[] = [
	{
		id: "group-1",
		title: "Getting Started",
		slug: "getting-started",
		children: [
			{
				id: "page-intro",
				title: "Introduction",
				slug: "getting-started/introduction",
				pageId: "pid-1",
			},
			{
				id: "page-install",
				title: "Installation",
				slug: "getting-started/installation",
				pageId: "pid-2",
			},
		],
	},
	{
		id: "group-2",
		title: "Core Concepts",
		slug: "core-concepts",
		children: [
			{
				id: "page-arch",
				title: "Architecture",
				slug: "core-concepts/architecture",
				pageId: "pid-3",
				children: [
					{
						id: "page-storage",
						title: "Storage Engine",
						slug: "core-concepts/architecture/storage",
						pageId: "pid-4",
					},
				],
			},
		],
	},
];

test("Tree Traversal - flattenTree produces sequential list with depths", () => {
	const flat = flattenTree(mockNavTree);

	assert.equal(flat.length, 6);
	assert.equal(flat[0]?.slug, "getting-started");
	assert.equal(flat[0]?.depth, 0);

	assert.equal(flat[1]?.slug, "getting-started/introduction");
	assert.equal(flat[1]?.depth, 1);

	assert.equal(flat[5]?.slug, "core-concepts/architecture/storage");
	assert.equal(flat[5]?.depth, 2);
});

test("Tree Traversal - getPrevNextPages handles first, middle, and last items", () => {
	// First item
	const first = getPrevNextPages(mockNavTree, "getting-started");
	assert.equal(first.prev, null);
	assert.equal(first.next?.slug, "getting-started/introduction");

	// Middle item
	const middle = getPrevNextPages(mockNavTree, "getting-started/introduction");
	assert.equal(middle.prev?.slug, "getting-started");
	assert.equal(middle.next?.slug, "getting-started/installation");

	// Last item
	const last = getPrevNextPages(
		mockNavTree,
		"core-concepts/architecture/storage",
	);
	assert.equal(last.prev?.slug, "core-concepts/architecture");
	assert.equal(last.next, null);

	// By pageId
	const byPageId = getPrevNextPages(mockNavTree, "pid-2");
	assert.equal(byPageId.prev?.slug, "getting-started/introduction");
	assert.equal(byPageId.next?.slug, "core-concepts");

	// Non-existent item
	const nonExistent = getPrevNextPages(mockNavTree, "unknown-page");
	assert.equal(nonExistent.prev, null);
	assert.equal(nonExistent.next, null);
});

test("Tree Traversal - findBreadcrumbTrail calculates hierarchy", () => {
	const trail = findBreadcrumbTrail(
		mockNavTree,
		"core-concepts/architecture/storage",
	);

	assert.equal(trail.length, 3);
	assert.equal(trail[0]?.title, "Core Concepts");
	assert.equal(trail[1]?.title, "Architecture");
	assert.equal(trail[2]?.title, "Storage Engine");
});

test("Tree Traversal - findActiveItem finds item by slug or ID", () => {
	const foundBySlug = findActiveItem(
		mockNavTree,
		"getting-started/installation",
	);
	assert.equal(foundBySlug?.id, "page-install");

	const foundById = findActiveItem(mockNavTree, "page-arch");
	assert.equal(foundById?.slug, "core-concepts/architecture");

	const notFound = findActiveItem(mockNavTree, "missing");
	assert.equal(notFound, null);
});

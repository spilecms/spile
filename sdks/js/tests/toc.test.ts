import assert from "node:assert/strict";
import test from "node:test";
import type { BlockNoteBlock } from "../dist/index.js";
import { extractTableOfContents, slugifyHeading } from "../dist/index.js";

test("TOC Extractor - slugifyHeading creates clean URL-friendly slugs", () => {
	assert.equal(slugifyHeading("Getting Started"), "getting-started");
	assert.equal(
		slugifyHeading("REST API: Authentication & Keys!"),
		"rest-api-authentication-keys",
	);
	assert.equal(slugifyHeading("  Trim Spaces  "), "trim-spaces");
});

test("TOC Extractor - extracts headings and deduplicates identical titles", () => {
	const blocks: BlockNoteBlock[] = [
		{
			id: "b1",
			type: "heading",
			props: { level: 1 },
			content: [{ type: "text", text: "Introduction" }],
		},
		{
			id: "b2",
			type: "paragraph",
			content: [{ type: "text", text: "Some content here" }],
		},
		{
			id: "b3",
			type: "heading",
			props: { level: 2 },
			content: [{ type: "text", text: "Overview" }],
		},
		{
			id: "b4",
			type: "heading",
			props: { level: 2 },
			content: [{ type: "text", text: "Overview" }], // Duplicate!
		},
		{
			id: "b5",
			type: "heading",
			props: { level: 4 }, // Exceeds default maxLevel 3
			content: [{ type: "text", text: "Deep Subheading" }],
		},
	];

	const toc = extractTableOfContents(blocks);

	assert.equal(toc.length, 3);
	assert.deepEqual(toc[0], {
		id: "introduction",
		text: "Introduction",
		level: 1,
	});
	assert.deepEqual(toc[1], { id: "overview", text: "Overview", level: 2 });
	assert.deepEqual(toc[2], { id: "overview-1", text: "Overview", level: 2 });
});

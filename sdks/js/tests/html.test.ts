import assert from "node:assert/strict";
import test from "node:test";
import type { BlockNoteBlock } from "../dist/index.js";
import {
	escapeHtml,
	renderBlocksToHtml,
	renderInlineToHtml,
} from "../dist/index.js";

test("HTML Serializer - escapes HTML characters for security", () => {
	assert.equal(
		escapeHtml("<script>alert('xss')</script>"),
		"&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;",
	);
});

test("HTML Serializer - renders inline formatted styles and links", () => {
	const inline = [
		{ type: "text" as const, text: "Normal " },
		{ type: "text" as const, text: "Bold", styles: { bold: true } },
		{ type: "text" as const, text: " and " },
		{ type: "text" as const, text: "Code", styles: { code: true } },
		{ type: "link" as const, text: "Spile", href: "https://spilecms.com" },
	];

	const html = renderInlineToHtml(inline);
	assert.equal(
		html,
		'Normal <strong>Bold</strong> and <code>Code</code><a href="https://spilecms.com" target="_blank" rel="noopener noreferrer">Spile</a>',
	);
});

test("HTML Serializer - groups consecutive list items into single lists", () => {
	const blocks: BlockNoteBlock[] = [
		{
			id: "b1",
			type: "bulletListItem",
			content: [{ type: "text", text: "First bullet" }],
		},
		{
			id: "b2",
			type: "bulletListItem",
			content: [{ type: "text", text: "Second bullet" }],
		},
		{
			id: "p1",
			type: "paragraph",
			content: [{ type: "text", text: "Interleaving paragraph" }],
		},
		{
			id: "c1",
			type: "checkListItem",
			props: { checked: true },
			content: [{ type: "text", text: "Done item" }],
		},
		{
			id: "c2",
			type: "checkListItem",
			props: { checked: false },
			content: [{ type: "text", text: "Pending item" }],
		},
	];

	const html = renderBlocksToHtml(blocks);

	assert.ok(
		html.includes(
			'<ul class="spile-list-bullet"><li>First bullet</li><li>Second bullet</li></ul>',
		),
	);
	assert.ok(html.includes("<p>Interleaving paragraph</p>"));
	assert.ok(html.includes('<ul class="spile-list-check">'));
	assert.ok(html.includes("checked "));
	assert.ok(html.includes("Pending item"));
});

test("HTML Serializer - renders headings with unique anchor IDs", () => {
	const blocks: BlockNoteBlock[] = [
		{
			id: "h1",
			type: "heading",
			props: { level: 2 },
			content: [{ type: "text", text: "Installation Guide" }],
		},
	];

	const html = renderBlocksToHtml(blocks);
	assert.equal(html, '<h2 id="installation-guide">Installation Guide</h2>');
});

test("HTML Serializer - renders codeBlock and custom Spile blocks", () => {
	const blocks: BlockNoteBlock[] = [
		{
			id: "cb1",
			type: "codeBlock",
			props: { language: "typescript", code: "const x = 42;" },
		},
		{
			id: "call1",
			type: "callout",
			props: { type: "tip", title: "Pro Tip" },
			content: [{ type: "text", text: "Use pnpm for speed." }],
		},
		{
			id: "math1",
			type: "mathBlock",
			props: { latex: "E = mc^2" },
		},
		{
			id: "param1",
			type: "paramField",
			props: { name: "apiKey", type: "string", required: true },
			content: [{ type: "text", text: "Public API key" }],
		},
	];

	const html = renderBlocksToHtml(blocks);

	assert.ok(
		html.includes(
			'<pre class="spile-code-block"><code class="language-typescript">const x = 42;</code></pre>',
		),
	);
	assert.ok(html.includes('<div class="spile-callout spile-callout-tip">'));
	assert.ok(html.includes('<div class="spile-callout-title">Pro Tip</div>'));
	assert.ok(html.includes('data-latex="E = mc^2"'));
	assert.ok(html.includes('<code class="spile-param-name">apiKey</code>'));
	assert.ok(
		html.includes('<span class="spile-param-required">required</span>'),
	);
});

test("HTML Serializer - renders accordion and codeGroup blocks", () => {
	const blocks: BlockNoteBlock[] = [
		{
			id: "acc1",
			type: "accordion",
			content: [{ type: "text", text: "Click to expand" }],
			children: [
				{
					id: "p1",
					type: "paragraph",
					content: [{ type: "text", text: "Hidden content" }],
				},
			],
		},
		{
			id: "cg1",
			type: "codeGroup",
			props: {
				tabsJson: JSON.stringify([
					{
						id: "t1",
						label: "pnpm",
						language: "bash",
						code: "pnpm add @spilecms/sdk",
					},
					{
						id: "t2",
						label: "npm",
						language: "bash",
						code: "npm i @spilecms/sdk",
					},
				]),
				activeTabIndex: 0,
			},
		},
	];

	const html = renderBlocksToHtml(blocks);

	assert.ok(html.includes('<details class="spile-accordion">'));
	assert.ok(
		html.includes(
			'<summary class="spile-accordion-title">Click to expand</summary>',
		),
	);
	assert.ok(
		html.includes(
			'<div class="spile-accordion-content"><p>Hidden content</p></div>',
		),
	);
	assert.ok(html.includes('<div class="spile-code-group">'));
	assert.ok(
		html.includes(
			'class="spile-code-group-tab active" data-tab-id="t1">pnpm</button>',
		),
	);
	assert.ok(html.includes("pnpm add @spilecms/sdk"));
});

test("HTML Serializer - supports custom block serializer options", () => {
	const blocks: BlockNoteBlock[] = [
		{
			id: "embed1",
			type: "tweetEmbed",
			props: { tweetId: "123456" },
		},
	];

	const html = renderBlocksToHtml(blocks, {
		renderers: {
			tweetEmbed: (block) =>
				`<div class="custom-tweet" data-id="${String(block.props?.tweetId)}"></div>`,
		},
	});

	assert.equal(html, '<div class="custom-tweet" data-id="123456"></div>');
});

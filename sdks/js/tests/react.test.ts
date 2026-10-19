import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { BlockNoteBlock, BlockNoteInlineContent } from "../dist/index.js";
import {
	renderInlineContent,
	type SpileCalloutComponentProps,
	SpileContent,
	type SpileHeadingComponentProps,
	type SpileLinkComponentProps,
} from "../dist/react.js";

test("React - renderInlineContent renders styles and sanitizes links", () => {
	const inlines: BlockNoteInlineContent[] = [
		{
			type: "text",
			text: "Hello ",
			styles: { bold: true },
		},
		{
			type: "text",
			text: "world",
			styles: { italic: true, code: true },
		},
		{
			type: "link",
			text: "Spile",
			href: "javascript:alert(1)",
		},
	];

	const rendered = renderToStaticMarkup(
		React.createElement("div", null, renderInlineContent(inlines)),
	);

	assert.ok(rendered.includes("<strong>Hello </strong>"));
	assert.ok(rendered.includes("<em><code>world</code></em>"));
	// Sanitized javascript: href to #
	assert.ok(rendered.includes('href="#"'));
});

test("React - SpileContent renders default blocks", () => {
	const blocks: BlockNoteBlock[] = [
		{
			id: "h1",
			type: "heading",
			props: { level: 2 },
			content: [{ type: "text", text: "Getting Started" }],
		},
		{
			id: "p1",
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Welcome to Spile CMS.",
				},
			],
		},
		{
			id: "b1",
			type: "bulletListItem",
			content: [{ type: "text", text: "Item 1" }],
		},
		{
			id: "b2",
			type: "bulletListItem",
			content: [{ type: "text", text: "Item 2" }],
		},
		{
			id: "c1",
			type: "callout",
			props: { type: "warning", title: "Be Careful" },
			content: [{ type: "text", text: "This is a note." }],
		},
		{
			id: "cb1",
			type: "codeBlock",
			props: { language: "typescript", code: "const x = 42;" },
		},
	];

	const html = renderToStaticMarkup(
		React.createElement(SpileContent, { blocks }),
	);

	assert.ok(
		html.includes(
			'<h2 id="getting-started" class="spile-heading spile-heading-2">Getting Started</h2>',
		),
	);
	assert.ok(
		html.includes('<p class="spile-paragraph">Welcome to Spile CMS.</p>'),
	);
	assert.ok(
		html.includes(
			'<ul class="spile-list-bullet"><li>Item 1</li><li>Item 2</li></ul>',
		),
	);
	assert.ok(html.includes('class="spile-callout spile-callout-warning"'));
	assert.ok(html.includes('<div class="spile-callout-title">Be Careful</div>'));
	assert.ok(
		html.includes(
			'<pre class="spile-code-block"><code class="language-typescript">const x = 42;</code></pre>',
		),
	);
});

test("React - SpileContent supports custom component overrides (shadcn style)", () => {
	const blocks: BlockNoteBlock[] = [
		{
			id: "h1",
			type: "heading",
			props: { level: 1 },
			content: [{ type: "text", text: "Architecture Overview" }],
		},
		{
			id: "c1",
			type: "callout",
			props: { type: "info", title: "Pro Tip" },
			content: [{ type: "text", text: "Use edge caching." }],
		},
		{
			id: "cb1",
			type: "codeBlock",
			props: { language: "bash", code: "pnpm install" },
		},
		{
			id: "p1",
			type: "paragraph",
			content: [
				{
					type: "link",
					text: "Read more here",
					href: "https://spilecms.com",
				},
			],
		},
	];

	// Simulate custom shadcn / Next.js component overrides
	const CustomHeading: React.FC<SpileHeadingComponentProps> = ({
		level,
		anchorId,
		children,
	}) =>
		React.createElement(
			`h${level}`,
			{
				id: anchorId,
				className: "scroll-m-20 text-3xl font-bold tracking-tight",
			},
			children,
		);

	const CustomAlert: React.FC<SpileCalloutComponentProps> = ({
		type,
		title,
		children,
	}) =>
		React.createElement(
			"div",
			{ role: "alert", className: `alert alert-${type}` },
			React.createElement("h5", { className: "alert-title" }, title),
			React.createElement("div", { className: "alert-body" }, children),
		);

	const CustomLink: React.FC<SpileLinkComponentProps> = ({ href, children }) =>
		React.createElement("a", { href, className: "custom-next-link" }, children);

	const html = renderToStaticMarkup(
		React.createElement(SpileContent, {
			blocks,
			components: {
				heading: CustomHeading,
				callout: CustomAlert,
				link: CustomLink,
			},
		}),
	);

	assert.ok(
		html.includes('class="scroll-m-20 text-3xl font-bold tracking-tight"'),
	);
	assert.ok(html.includes('role="alert" class="alert alert-info"'));
	assert.ok(html.includes('<h5 class="alert-title">Pro Tip</h5>'));
	assert.ok(
		html.includes(
			'<a href="https://spilecms.com" class="custom-next-link">Read more here</a>',
		),
	);
});

test("React - SpileContent renders empty or null blocks gracefully", () => {
	const htmlNull = renderToStaticMarkup(
		React.createElement(SpileContent, { blocks: null }),
	);
	assert.equal(htmlNull, "");

	const htmlEmpty = renderToStaticMarkup(
		React.createElement(SpileContent, { blocks: [] }),
	);
	assert.equal(htmlEmpty, "");
});

test("React - SpileContent renders accordion and codeGroup blocks", () => {
	const blocks: BlockNoteBlock[] = [
		{
			id: "acc1",
			type: "accordion",
			content: [{ type: "text", text: "Frequently Asked Questions" }],
			children: [
				{
					id: "p1",
					type: "paragraph",
					content: [{ type: "text", text: "Here is the answer." }],
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
						label: "TypeScript",
						language: "ts",
						code: "const val = 1;",
					},
				]),
				activeTabIndex: 0,
			},
		},
	];

	const html = renderToStaticMarkup(
		React.createElement(SpileContent, { blocks }),
	);

	assert.ok(html.includes('<details class="spile-accordion">'));
	assert.ok(
		html.includes(
			'<summary class="spile-accordion-title">Frequently Asked Questions</summary>',
		),
	);
	assert.ok(html.includes("Here is the answer."));
	assert.ok(html.includes('<div class="spile-code-group">'));
	assert.ok(html.includes("TypeScript"));
	assert.ok(html.includes("const val = 1;"));
});

test("React - SpileContent supports user-defined custom block types", () => {
	const blocks: BlockNoteBlock[] = [
		{
			id: "custom1",
			type: "newsletterForm",
			props: { title: "Subscribe to our engineering blog" },
		},
	];

	const CustomNewsletter: React.FC<{ block: BlockNoteBlock }> = ({ block }) =>
		React.createElement(
			"form",
			{ className: "newsletter-box" },
			React.createElement("label", null, String(block.props?.title || "")),
		);

	const html = renderToStaticMarkup(
		React.createElement(SpileContent, {
			blocks,
			components: {
				newsletterForm: CustomNewsletter,
			},
		}),
	);

	assert.ok(html.includes('<form class="newsletter-box">'));
	assert.ok(html.includes("Subscribe to our engineering blog"));
});

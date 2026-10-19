/**
 * Universal BlockNote to HTML Serializer
 * Zero dependencies — converts BlockNote blocks into clean, semantic, accessible HTML.
 */

import { slugifyHeading } from "./toc.js";
import type {
	BlockNoteBlock,
	BlockNoteInlineContent,
	CodeGroupTab,
} from "./types/index.js";

export interface RenderHtmlOptions {
	/** Custom HTML serializers for specific block types */
	renderers?: Record<
		string,
		(
			block: BlockNoteBlock,
			renderChildren: () => string,
			renderInline: (content?: BlockNoteInlineContent[]) => string,
		) => string
	>;
}

/**
 * Escapes unsafe HTML characters to prevent XSS attacks.
 */
export function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

/**
 * Sanitizes an href to prevent javascript: and data: pseudo-protocols.
 */
function sanitizeHref(href?: string): string {
	if (!href) return "#";
	const trimmed = href.trim();
	if (/^(?:javascript|data|vbscript):/i.test(trimmed)) {
		return "#";
	}
	return escapeHtml(trimmed);
}

/**
 * Converts BlockNote inline formatted content into an HTML string.
 */
export function renderInlineToHtml(content?: BlockNoteInlineContent[]): string {
	if (!content || !Array.isArray(content)) {
		return "";
	}

	return content
		.map((item) => {
			if (typeof item === "string") {
				return escapeHtml(item);
			}
			if (!item || typeof item !== "object") {
				return "";
			}

			let text = escapeHtml(item.text || "");
			const styles = item.styles || {};

			if (styles.code) {
				text = `<code>${text}</code>`;
			}
			if (styles.bold) {
				text = `<strong>${text}</strong>`;
			}
			if (styles.italic) {
				text = `<em>${text}</em>`;
			}
			if (styles.underline) {
				text = `<u>${text}</u>`;
			}
			if (styles.strike) {
				text = `<s>${text}</s>`;
			}

			const styleAttrs: string[] = [];
			if (styles.textColor && typeof styles.textColor === "string") {
				styleAttrs.push(`color:${escapeHtml(styles.textColor)}`);
			}
			if (
				styles.backgroundColor &&
				typeof styles.backgroundColor === "string"
			) {
				styleAttrs.push(
					`background-color:${escapeHtml(styles.backgroundColor)}`,
				);
			}

			if (styleAttrs.length > 0) {
				text = `<span style="${styleAttrs.join(";")}">${text}</span>`;
			}

			if (item.type === "link" && item.href) {
				text = `<a href="${sanitizeHref(item.href)}" target="_blank" rel="noopener noreferrer">${text}</a>`;
			}

			return text;
		})
		.join("");
}

/**
 * Converts a list of BlockNote blocks into semantic, responsive HTML string.
 *
 * @param blocks - Array of BlockNote blocks
 * @returns Serialized HTML string
 *
 * @example
 * ```ts
 * const html = renderBlocksToHtml(post.content);
 * ```
 */
export function renderBlocksToHtml(
	blocks?: BlockNoteBlock[] | null,
	options?: RenderHtmlOptions,
): string {
	if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
		return "";
	}

	const output: string[] = [];
	const headingCounts = new Map<string, number>();

	let i = 0;
	while (i < blocks.length) {
		const block = blocks[i];
		if (!block) {
			i++;
			continue;
		}

		// --- Grouping consecutive List Items ---
		if (
			block.type === "bulletListItem" ||
			block.type === "numberedListItem" ||
			block.type === "checkListItem"
		) {
			const listType = block.type;
			const listItems: string[] = [];

			while (i < blocks.length && blocks[i]?.type === listType) {
				const itemBlock = blocks[i];
				if (!itemBlock) {
					i++;
					continue;
				}
				const inlineHtml = renderInlineToHtml(itemBlock.content);
				const childrenHtml =
					itemBlock.children && itemBlock.children.length > 0
						? renderBlocksToHtml(itemBlock.children, options)
						: "";

				if (listType === "checkListItem") {
					const isChecked = Boolean(itemBlock.props?.checked);
					listItems.push(
						`<li class="spile-check-item"><input type="checkbox" disabled ${isChecked ? "checked " : ""}/><span>${inlineHtml}</span>${childrenHtml}</li>`,
					);
				} else {
					listItems.push(`<li>${inlineHtml}${childrenHtml}</li>`);
				}
				i++;
			}

			if (listType === "bulletListItem") {
				output.push(`<ul class="spile-list-bullet">${listItems.join("")}</ul>`);
			} else if (listType === "numberedListItem") {
				output.push(
					`<ol class="spile-list-numbered">${listItems.join("")}</ol>`,
				);
			} else {
				output.push(`<ul class="spile-list-check">${listItems.join("")}</ul>`);
			}
			continue;
		}

		// --- Custom Block Renderer Override ---
		if (options?.renderers?.[block.type]) {
			const customHtml = options.renderers[block.type](
				block,
				() =>
					block.children && block.children.length > 0
						? renderBlocksToHtml(block.children, options)
						: "",
				renderInlineToHtml,
			);
			output.push(customHtml);
			i++;
			continue;
		}

		// --- Single Block Rendering ---
		const innerHtml = renderInlineToHtml(block.content);
		const childrenHtml =
			block.children && block.children.length > 0
				? renderBlocksToHtml(block.children, options)
				: "";

		switch (block.type) {
			case "paragraph": {
				output.push(`<p>${innerHtml || "<br/>"}</p>${childrenHtml}`);
				break;
			}

			case "heading": {
				const level = Math.min(Math.max(Number(block.props?.level) || 1, 1), 6);
				const rawText = block.content?.map((c) => c.text || "").join("") || "";
				const baseSlug =
					slugifyHeading(rawText) || `heading-${output.length + 1}`;
				const count = headingCounts.get(baseSlug) || 0;
				headingCounts.set(baseSlug, count + 1);
				const anchorId = count > 0 ? `${baseSlug}-${count}` : baseSlug;

				output.push(
					`<h${level} id="${anchorId}">${innerHtml}</h${level}>${childrenHtml}`,
				);
				break;
			}

			case "codeBlock": {
				const language = escapeHtml(String(block.props?.language || "text"));
				const rawCode = escapeHtml(
					String(
						block.props?.code ||
							block.content?.map((c) => c.text).join("") ||
							"",
					),
				);
				output.push(
					`<pre class="spile-code-block"><code class="language-${language}">${rawCode}</code></pre>${childrenHtml}`,
				);
				break;
			}

			case "image": {
				const url = sanitizeHref(String(block.props?.url || ""));
				const caption = escapeHtml(String(block.props?.caption || ""));
				const alt = caption || "Image";
				output.push(
					`<figure class="spile-figure-image"><img src="${url}" alt="${alt}" loading="lazy" />${caption ? `<figcaption>${caption}</figcaption>` : ""}</figure>${childrenHtml}`,
				);
				break;
			}

			case "video": {
				const url = sanitizeHref(String(block.props?.url || ""));
				output.push(
					`<div class="spile-video-wrapper"><video src="${url}" controls class="spile-video"></video></div>${childrenHtml}`,
				);
				break;
			}

			case "audio": {
				const url = sanitizeHref(String(block.props?.url || ""));
				output.push(
					`<div class="spile-audio-wrapper"><audio src="${url}" controls class="spile-audio"></audio></div>${childrenHtml}`,
				);
				break;
			}

			case "file": {
				const url = sanitizeHref(String(block.props?.url || ""));
				const name = escapeHtml(String(block.props?.name || "Download file"));
				output.push(
					`<div class="spile-file-attachment"><a href="${url}" download class="spile-file-link">${name}</a></div>${childrenHtml}`,
				);
				break;
			}

			case "blockquote": {
				output.push(`<blockquote>${innerHtml}</blockquote>${childrenHtml}`);
				break;
			}

			case "divider": {
				output.push(`<hr class="spile-divider" />${childrenHtml}`);
				break;
			}

			case "table": {
				// Render BlockNote table block
				const rows =
					(block.content as unknown as {
						type: string;
						cells: BlockNoteInlineContent[][];
					}[]) || [];
				if (Array.isArray(rows) && rows.length > 0) {
					const renderedRows = rows
						.map((row, rIdx) => {
							const tag = rIdx === 0 ? "th" : "td";
							const cells = (row.cells || [])
								.map((cell) => `<${tag}>${renderInlineToHtml(cell)}</${tag}>`)
								.join("");
							return `<tr>${cells}</tr>`;
						})
						.join("");
					output.push(
						`<table class="spile-table"><tbody>${renderedRows}</tbody></table>${childrenHtml}`,
					);
				} else {
					output.push(childrenHtml);
				}
				break;
			}

			// --- Spile Custom Blocks ---
			case "callout": {
				const calloutType = escapeHtml(String(block.props?.type || "info"));
				const title = block.props?.title
					? escapeHtml(String(block.props.title))
					: "";
				output.push(
					`<div class="spile-callout spile-callout-${calloutType}">${title ? `<div class="spile-callout-title">${title}</div>` : ""}<div class="spile-callout-content">${innerHtml}</div></div>${childrenHtml}`,
				);
				break;
			}

			case "mathBlock": {
				const latex = escapeHtml(String(block.props?.latex || ""));
				output.push(
					`<div class="spile-math-block" data-latex="${latex}"><code>${latex}</code></div>${childrenHtml}`,
				);
				break;
			}

			case "paramField": {
				const name = escapeHtml(String(block.props?.name || ""));
				const type = escapeHtml(String(block.props?.type || ""));
				const required = Boolean(block.props?.required);
				output.push(
					`<div class="spile-param-field"><div class="spile-param-header"><code class="spile-param-name">${name}</code><span class="spile-param-type">${type}</span>${required ? '<span class="spile-param-required">required</span>' : ""}</div><div class="spile-param-description">${innerHtml}</div></div>${childrenHtml}`,
				);
				break;
			}

			case "responseField": {
				const name = escapeHtml(String(block.props?.name || ""));
				const type = escapeHtml(String(block.props?.type || ""));
				output.push(
					`<div class="spile-response-field"><div class="spile-response-header"><code class="spile-response-name">${name}</code><span class="spile-response-type">${type}</span></div><div class="spile-response-description">${innerHtml}</div></div>${childrenHtml}`,
				);
				break;
			}

			case "accordion": {
				output.push(
					`<details class="spile-accordion"><summary class="spile-accordion-title">${innerHtml}</summary><div class="spile-accordion-content">${childrenHtml}</div></details>`,
				);
				break;
			}

			case "codeGroup": {
				let tabs: CodeGroupTab[] = [];
				try {
					const parsed = JSON.parse(String(block.props?.tabsJson || "[]"));
					if (Array.isArray(parsed)) tabs = parsed;
				} catch {
					tabs = [];
				}

				const activeIdx = Math.min(
					Math.max(Number(block.props?.activeTabIndex) || 0, 0),
					Math.max(tabs.length - 1, 0),
				);

				const tabButtons = tabs
					.map(
						(tab, idx) =>
							`<button type="button" class="spile-code-group-tab${idx === activeIdx ? " active" : ""}" data-tab-id="${escapeHtml(tab.id || `tab-${idx}`)}">${escapeHtml(tab.label || tab.language || `Tab ${idx + 1}`)}</button>`,
					)
					.join("");

				const tabPanels = tabs
					.map((tab, idx) => {
						const lang = escapeHtml(tab.language || "text");
						const code = escapeHtml(tab.code || "");
						const hidden = idx === activeIdx ? "" : ' style="display:none;"';
						return `<div class="spile-code-group-panel${idx === activeIdx ? " active" : ""}" data-tab-id="${escapeHtml(tab.id || `tab-${idx}`)}"${hidden}><pre class="spile-code-block"><code class="language-${lang}">${code}</code></pre></div>`;
					})
					.join("");

				output.push(
					`<div class="spile-code-group"><div class="spile-code-group-tabs">${tabButtons}</div><div class="spile-code-group-panels">${tabPanels}</div></div>${childrenHtml}`,
				);
				break;
			}

			default: {
				// Fallback for custom or unrecognized block types
				if (innerHtml) {
					output.push(
						`<div class="spile-block spile-block-${escapeHtml(block.type)}">${innerHtml}</div>${childrenHtml}`,
					);
				} else if (childrenHtml) {
					output.push(childrenHtml);
				}
				break;
			}
		}

		i++;
	}

	return output.join("\n");
}

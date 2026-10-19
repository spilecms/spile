import React from "react";
import { slugifyHeading } from "../toc.js";
import type {
	BlockNoteBlock,
	BlockNoteInlineContent,
	CodeGroupTab,
} from "../types/index.js";
import {
	DefaultAccordion,
	DefaultAudio,
	DefaultBlockquote,
	DefaultCallout,
	DefaultCodeBlock,
	DefaultCodeGroup,
	DefaultDivider,
	DefaultFile,
	DefaultHeading,
	DefaultImage,
	DefaultLink,
	DefaultMathBlock,
	DefaultParagraph,
	DefaultParamField,
	DefaultResponseField,
	DefaultTable,
	DefaultVideo,
	type SpileAccordionComponentProps,
	type SpileAudioComponentProps,
	type SpileBlockComponentProps,
	type SpileCalloutComponentProps,
	type SpileCheckListItemComponentProps,
	type SpileCodeBlockComponentProps,
	type SpileCodeGroupComponentProps,
	type SpileFileComponentProps,
	type SpileHeadingComponentProps,
	type SpileImageComponentProps,
	type SpileLinkComponentProps,
	type SpileMathComponentProps,
	type SpileParamFieldComponentProps,
	type SpileResponseFieldComponentProps,
	type SpileTableComponentProps,
	type SpileVideoComponentProps,
} from "./DefaultBlocks.js";

export interface SpileComponents {
	paragraph?: React.ComponentType<SpileBlockComponentProps>;
	heading?: React.ComponentType<SpileHeadingComponentProps>;
	codeBlock?: React.ComponentType<SpileCodeBlockComponentProps>;
	codeGroup?: React.ComponentType<SpileCodeGroupComponentProps>;
	accordion?: React.ComponentType<SpileAccordionComponentProps>;
	callout?: React.ComponentType<SpileCalloutComponentProps>;
	link?: React.ComponentType<SpileLinkComponentProps>;
	image?: React.ComponentType<SpileImageComponentProps>;
	video?: React.ComponentType<SpileVideoComponentProps>;
	audio?: React.ComponentType<SpileAudioComponentProps>;
	file?: React.ComponentType<SpileFileComponentProps>;
	blockquote?: React.ComponentType<SpileBlockComponentProps>;
	divider?: React.ComponentType<SpileBlockComponentProps>;
	table?: React.ComponentType<SpileTableComponentProps>;
	mathBlock?: React.ComponentType<SpileMathComponentProps>;
	paramField?: React.ComponentType<SpileParamFieldComponentProps>;
	responseField?: React.ComponentType<SpileResponseFieldComponentProps>;
	bulletListItem?: React.ComponentType<SpileBlockComponentProps>;
	numberedListItem?: React.ComponentType<SpileBlockComponentProps>;
	checkListItem?: React.ComponentType<SpileCheckListItemComponentProps>;
	// biome-ignore lint/suspicious/noExplicitAny: allow custom component props
	[customBlockType: string]: React.ComponentType<any> | undefined;
}

export interface SpileContentProps {
	/** BlockNote blocks array to render */
	blocks?: BlockNoteBlock[] | null;
	/** Custom React component overrides for styling with Tailwind / shadcn */
	components?: Partial<SpileComponents>;
	/** Container wrapper CSS className */
	className?: string;
}

/**
 * Sanitizes URLs to prevent javascript: and vbscript: execution
 */
function sanitizeHref(url?: string): string {
	if (!url) return "#";
	const trimmed = url.trim();
	if (/^(javascript|vbscript|data):/i.test(trimmed)) {
		return "#";
	}
	return trimmed;
}

/**
 * Renders inline text content with formatting styles and links.
 */
export function renderInlineContent(
	inlines?: BlockNoteInlineContent[],
	LinkComponent: React.ComponentType<SpileLinkComponentProps> = DefaultLink,
): React.ReactNode {
	if (!inlines || inlines.length === 0) {
		return null;
	}

	return inlines.map((item, idx) => {
		const styles = item.styles || {};
		let content: React.ReactNode = item.text || "";

		if (styles.code) {
			content = <code>{content}</code>;
		}
		if (styles.bold) {
			content = <strong>{content}</strong>;
		}
		if (styles.italic) {
			content = <em>{content}</em>;
		}
		if (styles.underline) {
			content = <u>{content}</u>;
		}
		if (styles.strike) {
			content = <s>{content}</s>;
		}

		const inlineStyle: React.CSSProperties = {};
		if (styles.textColor && typeof styles.textColor === "string") {
			inlineStyle.color = styles.textColor;
		}
		if (styles.backgroundColor && typeof styles.backgroundColor === "string") {
			inlineStyle.backgroundColor = styles.backgroundColor;
		}

		if (Object.keys(inlineStyle).length > 0) {
			content = <span style={inlineStyle}>{content}</span>;
		}

		if (item.type === "link" && item.href) {
			content = (
				<LinkComponent href={sanitizeHref(item.href)}>{content}</LinkComponent>
			);
		}

		// biome-ignore lint/suspicious/noArrayIndexKey: inlines are ordered positional fragments
		return <React.Fragment key={idx}>{content}</React.Fragment>;
	});
}

/**
 * High-performance React renderer for Spile CMS BlockNote content.
 * Supports custom component overrides for shadcn/ui and design systems.
 */
export const SpileContent: React.FC<SpileContentProps> = ({
	blocks,
	components = {},
	className,
}) => {
	if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
		return null;
	}

	const ParagraphComp = components.paragraph || DefaultParagraph;
	const HeadingComp = components.heading || DefaultHeading;
	const CodeBlockComp = components.codeBlock || DefaultCodeBlock;
	const CalloutComp = components.callout || DefaultCallout;
	const LinkComp = components.link || DefaultLink;
	const ImageComp = components.image || DefaultImage;
	const VideoComp = components.video || DefaultVideo;
	const AudioComp = components.audio || DefaultAudio;
	const FileComp = components.file || DefaultFile;
	const BlockquoteComp = components.blockquote || DefaultBlockquote;
	const DividerComp = components.divider || DefaultDivider;
	const TableComp = components.table || DefaultTable;
	const MathBlockComp = components.mathBlock || DefaultMathBlock;
	const ParamFieldComp = components.paramField || DefaultParamField;
	const ResponseFieldComp = components.responseField || DefaultResponseField;
	const AccordionComp = components.accordion || DefaultAccordion;
	const CodeGroupComp = components.codeGroup || DefaultCodeGroup;

	const headingCounts = new Map<string, number>();
	const elements: React.ReactNode[] = [];

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
			const listItems: React.ReactNode[] = [];
			const listStartIndex = i;

			while (i < blocks.length && blocks[i]?.type === listType) {
				const itemBlock = blocks[i];
				if (!itemBlock) {
					i++;
					continue;
				}

				const inner = renderInlineContent(itemBlock.content, LinkComp);
				const children =
					itemBlock.children && itemBlock.children.length > 0 ? (
						<SpileContent blocks={itemBlock.children} components={components} />
					) : null;

				if (listType === "checkListItem") {
					const isChecked = Boolean(itemBlock.props?.checked);
					const CheckItemComp = components.checkListItem;
					if (CheckItemComp) {
						listItems.push(
							<CheckItemComp
								key={itemBlock.id || `check-${i}`}
								block={itemBlock}
								checked={isChecked}
							>
								{inner}
								{children}
							</CheckItemComp>,
						);
					} else {
						listItems.push(
							<li
								key={itemBlock.id || `check-${i}`}
								className="spile-check-item"
							>
								<input type="checkbox" disabled checked={isChecked} />
								<span>{inner}</span>
								{children}
							</li>,
						);
					}
				} else if (listType === "bulletListItem") {
					const BulletComp = components.bulletListItem;
					if (BulletComp) {
						listItems.push(
							<BulletComp key={itemBlock.id || `bullet-${i}`} block={itemBlock}>
								{inner}
								{children}
							</BulletComp>,
						);
					} else {
						listItems.push(
							<li key={itemBlock.id || `bullet-${i}`}>
								{inner}
								{children}
							</li>,
						);
					}
				} else {
					const NumberedComp = components.numberedListItem;
					if (NumberedComp) {
						listItems.push(
							<NumberedComp key={itemBlock.id || `num-${i}`} block={itemBlock}>
								{inner}
								{children}
							</NumberedComp>,
						);
					} else {
						listItems.push(
							<li key={itemBlock.id || `num-${i}`}>
								{inner}
								{children}
							</li>,
						);
					}
				}
				i++;
			}

			const groupKey = `list-${listType}-${listStartIndex}`;
			if (listType === "bulletListItem") {
				elements.push(
					<ul key={groupKey} className="spile-list-bullet">
						{listItems}
					</ul>,
				);
			} else if (listType === "numberedListItem") {
				elements.push(
					<ol key={groupKey} className="spile-list-numbered">
						{listItems}
					</ol>,
				);
			} else {
				elements.push(
					<ul key={groupKey} className="spile-list-check">
						{listItems}
					</ul>,
				);
			}
			continue;
		}

		// --- Single Block Rendering ---
		const blockKey = block.id || `block-${i}`;
		const innerContent = renderInlineContent(block.content, LinkComp);
		const childrenContent =
			block.children && block.children.length > 0 ? (
				<SpileContent blocks={block.children} components={components} />
			) : null;

		// Check if a custom component is specified for this block type
		const CustomBlockComp = components[block.type];

		switch (block.type) {
			case "paragraph": {
				elements.push(
					<ParagraphComp key={blockKey} block={block}>
						{innerContent}
						{childrenContent}
					</ParagraphComp>,
				);
				break;
			}

			case "heading": {
				const level = Math.min(Math.max(Number(block.props?.level) || 1, 1), 6);
				const rawText = block.content?.map((c) => c.text || "").join("") || "";
				const baseSlug =
					slugifyHeading(rawText) || `heading-${elements.length + 1}`;
				const count = headingCounts.get(baseSlug) || 0;
				headingCounts.set(baseSlug, count + 1);
				const anchorId = count > 0 ? `${baseSlug}-${count}` : baseSlug;

				elements.push(
					<HeadingComp
						key={blockKey}
						block={block}
						level={level}
						anchorId={anchorId}
					>
						{innerContent}
						{childrenContent}
					</HeadingComp>,
				);
				break;
			}

			case "codeBlock": {
				const language = String(block.props?.language || "text");
				const rawCode = String(
					block.props?.code || block.content?.map((c) => c.text).join("") || "",
				);
				elements.push(
					<CodeBlockComp
						key={blockKey}
						block={block}
						language={language}
						code={rawCode}
					>
						{childrenContent}
					</CodeBlockComp>,
				);
				break;
			}

			case "image": {
				const url = sanitizeHref(String(block.props?.url || ""));
				const caption = block.props?.caption
					? String(block.props.caption)
					: undefined;
				const alt = caption || "Image";
				elements.push(
					<ImageComp
						key={blockKey}
						block={block}
						url={url}
						caption={caption}
						alt={alt}
					>
						{childrenContent}
					</ImageComp>,
				);
				break;
			}

			case "video": {
				const url = sanitizeHref(String(block.props?.url || ""));
				const caption = block.props?.caption
					? String(block.props.caption)
					: undefined;
				elements.push(
					<VideoComp key={blockKey} block={block} url={url} caption={caption}>
						{childrenContent}
					</VideoComp>,
				);
				break;
			}

			case "audio": {
				const url = sanitizeHref(String(block.props?.url || ""));
				const caption = block.props?.caption
					? String(block.props.caption)
					: undefined;
				elements.push(
					<AudioComp key={blockKey} block={block} url={url} caption={caption}>
						{childrenContent}
					</AudioComp>,
				);
				break;
			}

			case "file": {
				const url = sanitizeHref(String(block.props?.url || ""));
				const name = String(block.props?.name || "Download file");
				elements.push(
					<FileComp key={blockKey} block={block} url={url} name={name}>
						{childrenContent}
					</FileComp>,
				);
				break;
			}

			case "blockquote": {
				elements.push(
					<BlockquoteComp key={blockKey} block={block}>
						{innerContent}
						{childrenContent}
					</BlockquoteComp>,
				);
				break;
			}

			case "divider": {
				elements.push(
					<DividerComp key={blockKey} block={block}>
						{childrenContent}
					</DividerComp>,
				);
				break;
			}

			case "table": {
				const rows =
					(block.content as unknown as {
						cells: BlockNoteInlineContent[][];
					}[]) || [];
				elements.push(
					<TableComp
						key={blockKey}
						block={block}
						rows={rows}
						renderInline={(c) => renderInlineContent(c, LinkComp)}
					>
						{childrenContent}
					</TableComp>,
				);
				break;
			}

			case "callout": {
				const calloutType = String(block.props?.type || "info");
				const title = block.props?.title
					? String(block.props.title)
					: undefined;
				elements.push(
					<CalloutComp
						key={blockKey}
						block={block}
						type={calloutType}
						title={title}
					>
						{innerContent}
						{childrenContent}
					</CalloutComp>,
				);
				break;
			}

			case "mathBlock": {
				const latex = String(block.props?.latex || "");
				elements.push(
					<MathBlockComp key={blockKey} block={block} latex={latex}>
						{childrenContent}
					</MathBlockComp>,
				);
				break;
			}

			case "paramField": {
				const name = String(block.props?.name || "");
				const type = String(block.props?.type || "");
				const required = Boolean(block.props?.required);
				elements.push(
					<ParamFieldComp
						key={blockKey}
						block={block}
						name={name}
						type={type}
						required={required}
					>
						{innerContent}
						{childrenContent}
					</ParamFieldComp>,
				);
				break;
			}

			case "responseField": {
				const name = String(block.props?.name || "");
				const type = String(block.props?.type || "");
				elements.push(
					<ResponseFieldComp
						key={blockKey}
						block={block}
						name={name}
						type={type}
					>
						{innerContent}
						{childrenContent}
					</ResponseFieldComp>,
				);
				break;
			}

			case "accordion": {
				elements.push(
					<AccordionComp
						key={blockKey}
						block={block}
						renderInline={(c) => renderInlineContent(c, LinkComp)}
					>
						{childrenContent}
					</AccordionComp>,
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
				const activeTabIndex = Math.min(
					Math.max(Number(block.props?.activeTabIndex) || 0, 0),
					Math.max(tabs.length - 1, 0),
				);
				elements.push(
					<CodeGroupComp
						key={blockKey}
						block={block}
						tabs={tabs}
						activeTabIndex={activeTabIndex}
					>
						{childrenContent}
					</CodeGroupComp>,
				);
				break;
			}

			default: {
				if (CustomBlockComp) {
					elements.push(
						<CustomBlockComp key={blockKey} block={block}>
							{innerContent}
							{childrenContent}
						</CustomBlockComp>,
					);
				} else if (innerContent) {
					elements.push(
						<div
							key={blockKey}
							className={`spile-block spile-block-${block.type}`}
						>
							{innerContent}
							{childrenContent}
						</div>,
					);
				} else if (childrenContent) {
					elements.push(
						<React.Fragment key={blockKey}>{childrenContent}</React.Fragment>,
					);
				}
				break;
			}
		}

		i++;
	}

	return <div className={className || "spile-content-root"}>{elements}</div>;
};

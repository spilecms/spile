import type React from "react";
import { useState } from "react";
import type {
	BlockNoteBlock,
	BlockNoteInlineContent,
	CalloutBlockProps,
	CodeBlockProps,
	CodeGroupBlockProps,
	CodeGroupTab,
	MathBlockProps,
} from "../types/index.js";

export interface SpileAccordionComponentProps extends SpileBlockComponentProps {
	renderInline: (content?: BlockNoteInlineContent[]) => React.ReactNode;
}

export interface SpileCodeGroupComponentProps
	extends SpileBlockComponentProps<CodeGroupBlockProps> {
	tabs: CodeGroupTab[];
	activeTabIndex: number;
}

export interface SpileBlockComponentProps<P = Record<string, unknown>> {
	block: BlockNoteBlock<P>;
	children?: React.ReactNode;
	className?: string;
}

export interface SpileHeadingComponentProps extends SpileBlockComponentProps {
	level: number;
	anchorId: string;
}

export interface SpileCodeBlockComponentProps
	extends SpileBlockComponentProps<CodeBlockProps> {
	language: string;
	code: string;
}

export interface SpileCalloutComponentProps
	extends SpileBlockComponentProps<CalloutBlockProps> {
	type: string;
	title?: string;
}

export interface SpileImageComponentProps extends SpileBlockComponentProps {
	url: string;
	caption?: string;
	alt?: string;
}

export interface SpileVideoComponentProps extends SpileBlockComponentProps {
	url: string;
	caption?: string;
}

export interface SpileAudioComponentProps extends SpileBlockComponentProps {
	url: string;
	caption?: string;
}

export interface SpileFileComponentProps extends SpileBlockComponentProps {
	url: string;
	name: string;
}

export interface SpileLinkComponentProps {
	href: string;
	children: React.ReactNode;
	className?: string;
}

export interface SpileTableComponentProps extends SpileBlockComponentProps {
	rows: { cells: BlockNoteInlineContent[][] }[];
	renderInline: (content?: BlockNoteInlineContent[]) => React.ReactNode;
}

export interface SpileMathComponentProps
	extends SpileBlockComponentProps<MathBlockProps> {
	latex: string;
}

export interface SpileParamFieldComponentProps
	extends SpileBlockComponentProps {
	name: string;
	type: string;
	required?: boolean;
}

export interface SpileResponseFieldComponentProps
	extends SpileBlockComponentProps {
	name: string;
	type: string;
}

export interface SpileCheckListItemComponentProps
	extends SpileBlockComponentProps {
	checked: boolean;
}

export const DefaultParagraph: React.FC<SpileBlockComponentProps> = ({
	children,
	className,
}) => {
	return <p className={className || "spile-paragraph"}>{children || <br />}</p>;
};

export const DefaultHeading: React.FC<SpileHeadingComponentProps> = ({
	level,
	anchorId,
	children,
	className,
}) => {
	const HeadingTag = `h${Math.min(Math.max(level, 1), 6)}` as
		| "h1"
		| "h2"
		| "h3"
		| "h4"
		| "h5"
		| "h6";
	return (
		<HeadingTag
			id={anchorId}
			className={className || `spile-heading spile-heading-${level}`}
		>
			{children}
		</HeadingTag>
	);
};

export const DefaultCodeBlock: React.FC<SpileCodeBlockComponentProps> = ({
	language,
	code,
	className,
}) => {
	return (
		<pre className={className || "spile-code-block"}>
			<code className={`language-${language}`}>{code}</code>
		</pre>
	);
};

export const DefaultCallout: React.FC<SpileCalloutComponentProps> = ({
	type,
	title,
	children,
	className,
}) => {
	return (
		<div
			className={className || `spile-callout spile-callout-${type || "info"}`}
		>
			{title && <div className="spile-callout-title">{title}</div>}
			<div className="spile-callout-content">{children}</div>
		</div>
	);
};

export const DefaultImage: React.FC<SpileImageComponentProps> = ({
	url,
	caption,
	alt,
	className,
}) => {
	return (
		<figure className={className || "spile-figure-image"}>
			<img src={url} alt={alt || caption || "Image"} loading="lazy" />
			{caption && <figcaption>{caption}</figcaption>}
		</figure>
	);
};

export const DefaultVideo: React.FC<SpileVideoComponentProps> = ({
	url,
	className,
}) => {
	return (
		<div className={className || "spile-video-wrapper"}>
			<video src={url} controls className="spile-video">
				<track kind="captions" />
			</video>
		</div>
	);
};

export const DefaultAudio: React.FC<SpileAudioComponentProps> = ({
	url,
	className,
}) => {
	return (
		<div className={className || "spile-audio-wrapper"}>
			<audio src={url} controls className="spile-audio">
				<track kind="captions" />
			</audio>
		</div>
	);
};

export const DefaultFile: React.FC<SpileFileComponentProps> = ({
	url,
	name,
	className,
}) => {
	return (
		<div className={className || "spile-file-attachment"}>
			<a href={url} download className="spile-file-link">
				{name}
			</a>
		</div>
	);
};

export const DefaultBlockquote: React.FC<SpileBlockComponentProps> = ({
	children,
	className,
}) => {
	return (
		<blockquote className={className || "spile-blockquote"}>
			{children}
		</blockquote>
	);
};

export const DefaultDivider: React.FC<SpileBlockComponentProps> = ({
	className,
}) => {
	return <hr className={className || "spile-divider"} />;
};

export const DefaultTable: React.FC<SpileTableComponentProps> = ({
	rows,
	renderInline,
	className,
}) => {
	if (!rows || rows.length === 0) return null;
	return (
		<table className={className || "spile-table"}>
			<tbody>
				{rows.map((row, rIdx) => {
					const isHeader = rIdx === 0;
					const CellTag = isHeader ? "th" : "td";
					return (
						// biome-ignore lint/suspicious/noArrayIndexKey: blocknote tables have ordered rows
						<tr key={rIdx}>
							{(row.cells || []).map((cell, cIdx) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: blocknote table cells are ordered
								<CellTag key={cIdx}>{renderInline(cell)}</CellTag>
							))}
						</tr>
					);
				})}
			</tbody>
		</table>
	);
};

export const DefaultMathBlock: React.FC<SpileMathComponentProps> = ({
	latex,
	className,
}) => {
	return (
		<div className={className || "spile-math-block"} data-latex={latex}>
			<code>{latex}</code>
		</div>
	);
};

export const DefaultParamField: React.FC<SpileParamFieldComponentProps> = ({
	name,
	type,
	required,
	children,
	className,
}) => {
	return (
		<div className={className || "spile-param-field"}>
			<div className="spile-param-header">
				<code className="spile-param-name">{name}</code>
				<span className="spile-param-type">{type}</span>
				{required && <span className="spile-param-required">required</span>}
			</div>
			<div className="spile-param-description">{children}</div>
		</div>
	);
};

export const DefaultResponseField: React.FC<
	SpileResponseFieldComponentProps
> = ({ name, type, children, className }) => {
	return (
		<div className={className || "spile-response-field"}>
			<div className="spile-response-header">
				<code className="spile-response-name">{name}</code>
				<span className="spile-response-type">{type}</span>
			</div>
			<div className="spile-response-description">{children}</div>
		</div>
	);
};

export const DefaultLink: React.FC<SpileLinkComponentProps> = ({
	href,
	children,
	className,
}) => {
	return (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			className={className || "spile-link"}
		>
			{children}
		</a>
	);
};

export const DefaultAccordion: React.FC<SpileAccordionComponentProps> = ({
	block,
	children,
	renderInline,
	className,
}) => {
	return (
		<details className={className || "spile-accordion"}>
			<summary className="spile-accordion-title">
				{renderInline(block.content)}
			</summary>
			<div className="spile-accordion-content">{children}</div>
		</details>
	);
};

export const DefaultCodeGroup: React.FC<SpileCodeGroupComponentProps> = ({
	tabs,
	activeTabIndex: initialActive = 0,
	className,
}) => {
	const [activeIdx, setActiveIdx] = useState(initialActive);
	const currentTab = tabs[activeIdx] || tabs[0];

	if (!tabs || tabs.length === 0) return null;

	return (
		<div className={className || "spile-code-group"}>
			<div className="spile-code-group-tabs">
				{tabs.map((tab, idx) => (
					<button
						key={tab.id || `tab-${idx}`}
						type="button"
						className={`spile-code-group-tab${idx === activeIdx ? " active" : ""}`}
						onClick={() => setActiveIdx(idx)}
					>
						{tab.label || tab.language || `Tab ${idx + 1}`}
					</button>
				))}
			</div>
			{currentTab && (
				<div className="spile-code-group-panels">
					<pre className="spile-code-block">
						<code className={`language-${currentTab.language || "text"}`}>
							{currentTab.code}
						</code>
					</pre>
				</div>
			)}
		</div>
	);
};

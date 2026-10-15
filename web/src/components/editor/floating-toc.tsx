import { ChevronRight, ListCollapse } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { slugifyGitHub } from "@/lib/slug";
import { cn } from "@/lib/utils";

interface HeadingItem {
	id: string;
	el: HTMLElement;
	text: string;
	level: number;
}

function sameHeadings(a: HeadingItem[], b: HeadingItem[]): boolean {
	if (a.length !== b.length) return false;
	return a.every(
		(item, i) =>
			item.id === b[i].id &&
			item.text === b[i].text &&
			item.level === b[i].level &&
			item.el === b[i].el,
	);
}

export function FloatingToc({
	editorContainerRef,
}: {
	editorContainerRef: React.RefObject<HTMLDivElement | null>;
}) {
	const [headings, setHeadings] = useState<HeadingItem[]>([]);
	const [activeId, setActiveId] = useState<string | null>(null);
	const [isExpanded, setIsExpanded] = useState(true);
	// Maps a heading DOM element to its anchor id. This mapping must live outside
	// the editor DOM: writing attributes (e.g. `id`) onto ProseMirror-managed
	// nodes corrupts the editor's DOM <-> document position mapping, which breaks
	// the caret, arrow-key navigation and text selection.
	const anchorByElRef = useRef(new Map<HTMLElement, string>());

	// 1. Collect headings & observe changes as user writes
	useEffect(() => {
		const container = editorContainerRef.current;
		if (!container) return;

		const updateHeadings = () => {
			const elements = Array.from(
				container.querySelectorAll<HTMLElement>(
					".bn-editor :is(h1, h2, h3, h4, h5, h6)",
				),
			);

			const seenAnchors = new Map<string, number>();
			const anchorByEl = anchorByElRef.current;
			const liveEls = new Set<HTMLElement>();
			const items: HeadingItem[] = elements
				.map((el) => {
					const text = el.textContent?.trim() || "";
					const anchor = slugifyGitHub(text, seenAnchors);
					anchorByEl.set(el, anchor);
					liveEls.add(el);
					const blockContent = el.closest<HTMLElement>(
						"[data-content-type='heading']",
					);
					const parsedLevel =
						Number(blockContent?.getAttribute("data-level")) ||
						Number(el.tagName.replace("H", "")) ||
						2;
					return {
						id: anchor,
						el,
						text,
						level: parsedLevel,
					};
				})
				.filter((item) => item.text.length > 0);

			// Prune anchors for headings that no longer exist
			for (const el of Array.from(anchorByEl.keys())) {
				if (!liveEls.has(el)) anchorByEl.delete(el);
			}

			// Only update state when the heading list actually changed, so typing
			// in regular paragraphs doesn't re-render the panel (and re-run the
			// scroll-spy effect) on every keystroke.
			setHeadings((prev) => (sameHeadings(prev, items) ? prev : items));
		};

		let rafId: number | null = null;
		const debouncedUpdate = () => {
			if (rafId !== null) return;
			rafId = requestAnimationFrame(() => {
				rafId = null;
				updateHeadings();
			});
		};

		updateHeadings();

		const observer = new MutationObserver((mutations) => {
			const isRelevant = mutations.some((m) => {
				// Attribute-only changes never add/remove/rename headings.
				if (m.type === "attributes") return false;
				if (m.type === "characterData") {
					return Boolean(
						m.target.parentElement?.closest("[data-content-type='heading']") ||
							m.target.parentElement?.closest(":is(h1, h2, h3, h4, h5, h6)"),
					);
				}
				return true;
			});
			if (!isRelevant) return;

			debouncedUpdate();
		});

		observer.observe(container, {
			childList: true,
			subtree: true,
			characterData: true,
		});

		return () => {
			if (rafId !== null) cancelAnimationFrame(rafId);
			observer.disconnect();
		};
	}, [editorContainerRef]);

	// 2. Scroll Spy using IntersectionObserver
	useEffect(() => {
		if (headings.length === 0) return;

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						setActiveId(
							anchorByElRef.current.get(entry.target as HTMLElement) ?? null,
						);
						break;
					}
				}
			},
			{
				rootMargin: "-80px 0% -60% 0%",
				threshold: 0,
			},
		);

		for (const h of headings) {
			observer.observe(h.el);
		}

		return () => observer.disconnect();
	}, [headings]);

	// Don't render if there are no headings in the post
	if (headings.length === 0) return null;

	const minLevel = Math.min(...headings.map((h) => h.level));

	const scrollToHeading = (el: HTMLElement) => {
		el.scrollIntoView({ behavior: "smooth", block: "start" });
	};

	return (
		<aside
			aria-label="Table of contents"
			className={cn(
				// pointer-events-none so the floating panel never blocks mouse
				// selection / clicks in the editor text underneath it.
				"pointer-events-none fixed right-6 top-20 z-20 hidden lg:flex flex-col transition-all duration-200 select-none",
				isExpanded ? "w-60" : "w-10 items-end",
			)}
		>
			<div className="pointer-events-auto flex items-center justify-between w-full pb-2 mb-1 border-b border-border/40">
				{isExpanded && (
					<span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground/80">
						Outline
					</span>
				)}
				<button
					type="button"
					onClick={() => setIsExpanded(!isExpanded)}
					className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
					title={isExpanded ? "Collapse outline" : "Expand outline"}
				>
					{isExpanded ? (
						<ListCollapse className="w-4 h-4" />
					) : (
						<ChevronRight className="w-4 h-4 rotate-180" />
					)}
				</button>
			</div>

			{/* Expanded list */}
			{isExpanded ? (
				<nav className="pointer-events-auto flex flex-col gap-0.5 max-h-[calc(100vh-160px)] overflow-y-auto pr-1">
					{headings.map((h) => {
						const depth = Math.max(0, h.level - minLevel);
						const isActive = activeId === h.id;
						return (
							<button
								key={h.id}
								type="button"
								onMouseDown={(e) => e.preventDefault()} // Keeps editor focus
								onClick={() => scrollToHeading(h.el)}
								style={{ paddingLeft: `${depth * 0.75 + 0.5}rem` }}
								className={cn(
									"group flex items-center w-full text-left py-1 pr-2 rounded text-xs transition-colors truncate",
									isActive
										? "font-medium text-primary bg-primary/10"
										: "text-muted-foreground hover:text-foreground hover:bg-accent/50",
								)}
							>
								<span className="truncate">{h.text}</span>
							</button>
						);
					})}
				</nav>
			) : (
				/* Notion mini-indicator mode (thin bars on hover) */
				<button
					type="button"
					onClick={() => setIsExpanded(true)}
					className="pointer-events-auto flex flex-col gap-1.5 py-2 cursor-pointer group w-full items-end bg-transparent border-0"
					title="Expand outline"
				>
					{headings.map((h) => {
						const depth = Math.max(0, h.level - minLevel);
						const isActive = activeId === h.id;
						return (
							<div
								key={h.id}
								style={{ width: `${Math.max(10, 24 - depth * 6)}px` }}
								className={cn(
									"h-1 rounded-full transition-all duration-150 self-end",
									isActive
										? "bg-primary w-6"
										: "bg-muted-foreground/30 group-hover:bg-muted-foreground/60",
								)}
							/>
						);
					})}
				</button>
			)}
		</aside>
	);
}

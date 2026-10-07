import { ChevronRight, ListCollapse } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface HeadingItem {
	id: string;
	el: HTMLElement;
	text: string;
	level: number;
}

export function FloatingToc({
	editorContainerRef,
}: {
	editorContainerRef: React.RefObject<HTMLDivElement | null>;
}) {
	const [headings, setHeadings] = useState<HeadingItem[]>([]);
	const [activeId, setActiveId] = useState<string | null>(null);
	const [isExpanded, setIsExpanded] = useState(true);

	// 1. Collect headings & observe changes as user writes
	useEffect(() => {
		const container = editorContainerRef.current;
		if (!container) return;

		const updateHeadings = () => {
			const elements = Array.from(
				container.querySelectorAll<HTMLElement>(
					"h1.ce-header, h2.ce-header, h3.ce-header, h4.ce-header",
				),
			);

			const items: HeadingItem[] = elements
				.map((el, i) => {
					// Ensure each heading has an anchor ID
					if (!el.id)
						el.id = `heading-${i}-${el.textContent?.slice(0, 15).replace(/\s+/g, "-") || i}`;
					return {
						id: el.id,
						el,
						text: el.textContent?.trim() || "",
						level: Number(el.tagName.replace("H", "")) || 2,
					};
				})
				.filter((item) => item.text.length > 0);

			setHeadings(items);
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
			// Ignore mutations caused by our own id assignments
			const isOnlyIdChange = mutations.every(
				(m) => m.type === "attributes" && m.attributeName === "id",
			);
			if (isOnlyIdChange) return;

			debouncedUpdate();
		});

		observer.observe(container, {
			childList: true,
			subtree: true,
			// characterData:true removed — it fired on every keystroke, triggering
			// heading scans on each character. childList+subtree is enough to catch
			// heading blocks being added, removed, or reordered.
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
						setActiveId(entry.target.id);
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
	if (headings.length < 2) return null;

	const minLevel = Math.min(...headings.map((h) => h.level));

	const scrollToHeading = (el: HTMLElement) => {
		el.scrollIntoView({ behavior: "smooth", block: "start" });
	};

	return (
		<aside
			aria-label="Table of contents"
			className={cn(
				"fixed right-6 top-20 z-20 hidden 2xl:flex flex-col transition-all duration-200 select-none",
				isExpanded ? "w-60" : "w-10 items-end",
			)}
		>
			<div className="flex items-center justify-between w-full pb-2 mb-1 border-b border-border/40">
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
				<nav className="flex flex-col gap-0.5 max-h-[calc(100vh-160px)] overflow-y-auto pr-1">
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
					className="flex flex-col gap-1.5 py-2 cursor-pointer group w-full items-end bg-transparent border-0"
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

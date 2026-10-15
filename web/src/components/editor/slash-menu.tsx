import type {
	DefaultReactSuggestionItem,
	SuggestionMenuProps,
} from "@blocknote/react";
import { useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";

export function CustomSlashMenu(
	props: SuggestionMenuProps<DefaultReactSuggestionItem>,
) {
	const { items, selectedIndex, onItemClick, loadingState } = props;
	const selectedItemRef = useRef<HTMLButtonElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);

	// Automatically scroll selected item into view when navigating with keyboard
	useEffect(() => {
		if (
			selectedIndex !== undefined &&
			selectedIndex >= 0 &&
			selectedItemRef.current
		) {
			selectedItemRef.current.scrollIntoView({
				block: "nearest",
			});
		}
	}, [selectedIndex]);

	// Group items by category; empty groups are inherently omitted
	const groupedItems = useMemo(() => {
		const groups = new Map<
			string,
			Array<{ item: DefaultReactSuggestionItem; originalIndex: number }>
		>();

		items.forEach((item, index) => {
			const groupName = item.group || "Other";
			let list = groups.get(groupName);
			if (!list) {
				list = [];
				groups.set(groupName, list);
			}
			list.push({ item, originalIndex: index });
		});

		return Array.from(groups.entries());
	}, [items]);

	if (items.length === 0) {
		if (loadingState === "loading" || loadingState === "loading-initial") {
			return (
				<div
					ref={menuRef}
					className="w-[320px] rounded-lg border border-border bg-popover/95 p-3 text-center text-xs text-muted-foreground shadow-lg backdrop-blur-md"
				>
					Loading...
				</div>
			);
		}
		return (
			<div
				ref={menuRef}
				className="w-[320px] rounded-lg border border-border bg-popover/95 p-3 text-center text-xs text-muted-foreground shadow-lg backdrop-blur-md"
			>
				No matching blocks
			</div>
		);
	}

	return (
		<div
			ref={menuRef}
			role="listbox"
			className="w-[320px] max-h-75 overflow-x-hidden overflow-y-auto rounded-lg border border-border bg-popover/95 p-1 shadow-xl backdrop-blur-md editor-scroll"
		>
			{groupedItems.map(([groupName, groupEntries]) => (
				<div key={groupName} className="py-0.5">
					<div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80 select-none">
						{groupName}
					</div>
					<div className="space-y-0.5">
						{groupEntries.map(({ item, originalIndex }) => {
							const isSelected = originalIndex === selectedIndex;
							return (
								<button
									key={item.title}
									type="button"
									tabIndex={-1}
									ref={isSelected ? selectedItemRef : undefined}
									role="option"
									aria-selected={isSelected}
									onMouseDown={(e) => {
										// Prevent blur so editor selection is preserved
										e.preventDefault();
									}}
									onClick={() => onItemClick?.(item)}
									className={cn(
										"group flex w-full cursor-pointer select-none items-center gap-2.5 rounded-md px-2 py-1.5 text-xs transition-colors text-left",
										isSelected
											? "bg-accent text-accent-foreground font-medium"
											: "text-popover-foreground hover:bg-accent/60 hover:text-accent-foreground",
									)}
								>
									{item.icon && (
										<div className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground group-hover:text-foreground">
											{item.icon}
										</div>
									)}
									<div className="flex-1 min-w-0">
										<div className="truncate text-xs font-medium leading-tight">
											{item.title}
										</div>
										{item.subtext && (
											<div className="truncate text-[10px] text-muted-foreground leading-tight">
												{item.subtext}
											</div>
										)}
									</div>
									{item.badge && (
										<span className="shrink-0 rounded bg-muted/80 px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-muted-foreground">
											{item.badge}
										</span>
									)}
								</button>
							);
						})}
					</div>
				</div>
			))}
		</div>
	);
}

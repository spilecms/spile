"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import { cn } from "cn";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import * as React from "react";

interface SelectContextValue {
	registerItem: (value: unknown, label: React.ReactNode) => void;
	getItemLabel: (value: unknown) => React.ReactNode;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

function Select<Value, Multiple extends boolean | undefined = false>({
	children,
	items,
	...props
}: SelectPrimitive.Root.Props<Value, Multiple>) {
	const itemsMapRef = React.useRef<Map<unknown, React.ReactNode>>(new Map());
	const [, forceUpdate] = React.useState({});

	const registerItem = React.useCallback(
		(val: unknown, label: React.ReactNode) => {
			if (val === undefined || label === undefined) return;
			if (itemsMapRef.current.get(val) !== label) {
				itemsMapRef.current.set(val, label);
				forceUpdate({});
			}
		},
		[],
	);

	const getItemLabel = React.useCallback((val: unknown) => {
		return itemsMapRef.current.get(val);
	}, []);

	// Convert itemsMap to record for Base UI's items prop if not already provided
	const effectiveItems = React.useMemo(() => {
		if (items) return items;
		const obj: Record<string, React.ReactNode> = {};
		for (const [k, v] of itemsMapRef.current.entries()) {
			obj[String(k)] = v;
		}
		return obj;
	}, [items]);

	return (
		<SelectContext.Provider value={{ registerItem, getItemLabel }}>
			<SelectPrimitive.Root items={effectiveItems} {...props}>
				{children}
			</SelectPrimitive.Root>
		</SelectContext.Provider>
	);
}

function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
	return (
		<SelectPrimitive.Group
			data-slot="select-group"
			className={cn("scroll-my-1", className)}
			{...props}
		/>
	);
}

function SelectValue({
	className,
	placeholder,
	children,
	...props
}: SelectPrimitive.Value.Props) {
	const ctx = React.useContext(SelectContext);

	return (
		<SelectPrimitive.Value
			data-slot="select-value"
			placeholder={placeholder}
			className={cn(
				"flex flex-1 text-left truncate items-center gap-1.5",
				className,
			)}
			{...props}
		>
			{typeof children === "function"
				? children
				: (val: unknown) => {
						if (val === null || val === undefined || val === "") {
							return placeholder ?? "";
						}
						if (children) return children;
						const registered = ctx?.getItemLabel(val);
						if (registered) return registered;
						return String(val);
					}}
		</SelectPrimitive.Value>
	);
}

function SelectTrigger({
	className,
	size = "default",
	children,
	...props
}: SelectPrimitive.Trigger.Props & {
	size?: "sm" | "default";
}) {
	return (
		<SelectPrimitive.Trigger
			data-slot="select-trigger"
			data-size={size}
			className={cn(
				"flex w-full items-center justify-between gap-2 rounded-md border border-input bg-background py-1.5 px-3 text-xs shadow-xs transition-colors outline-none select-none hover:bg-accent/40 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground data-[size=default]:h-8 data-[size=sm]:h-7 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
				className,
			)}
			{...props}
		>
			{children}
			<SelectPrimitive.Icon
				render={
					<ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground opacity-60" />
				}
			/>
		</SelectPrimitive.Trigger>
	);
}

function SelectContent({
	className,
	children,
	side = "bottom",
	sideOffset = 4,
	align = "start",
	alignOffset = 0,
	alignItemWithTrigger = false,
	...props
}: SelectPrimitive.Popup.Props &
	Pick<
		SelectPrimitive.Positioner.Props,
		"align" | "alignOffset" | "side" | "sideOffset" | "alignItemWithTrigger"
	>) {
	return (
		<SelectPrimitive.Portal>
			<SelectPrimitive.Positioner
				side={side}
				sideOffset={sideOffset}
				align={align}
				alignOffset={alignOffset}
				alignItemWithTrigger={alignItemWithTrigger}
				className="isolate z-50"
			>
				<SelectPrimitive.Popup
					data-slot="select-content"
					data-align-trigger={alignItemWithTrigger}
					className={cn(
						"relative isolate z-50 max-h-(--available-height) w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-md border border-border/80 bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[align-trigger=true]:animate-none data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
						className,
					)}
					{...props}
				>
					<SelectScrollUpButton />
					<SelectPrimitive.List className="space-y-0.5">
						{children}
					</SelectPrimitive.List>
					<SelectScrollDownButton />
				</SelectPrimitive.Popup>
			</SelectPrimitive.Positioner>
		</SelectPrimitive.Portal>
	);
}

function SelectLabel({
	className,
	...props
}: SelectPrimitive.GroupLabel.Props) {
	return (
		<SelectPrimitive.GroupLabel
			data-slot="select-label"
			className={cn(
				"px-2 py-1.5 text-xs font-semibold text-muted-foreground",
				className,
			)}
			{...props}
		/>
	);
}

function SelectItem({
	className,
	children,
	value,
	...props
}: SelectPrimitive.Item.Props & { value: unknown }) {
	const ctx = React.useContext(SelectContext);

	React.useEffect(() => {
		if (value !== undefined && children !== undefined) {
			ctx?.registerItem(value, children);
		}
	}, [value, children, ctx]);

	return (
		<SelectPrimitive.Item
			data-slot="select-item"
			value={value}
			className={cn(
				"relative flex w-full cursor-pointer items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-xs outline-hidden select-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
				className,
			)}
			{...props}
		>
			<SelectPrimitive.ItemText className="flex flex-1 shrink-0 gap-2 whitespace-nowrap">
				{children}
			</SelectPrimitive.ItemText>
			<SelectPrimitive.ItemIndicator
				render={
					<span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center text-primary" />
				}
			>
				<CheckIcon className="pointer-events-none size-3.5" />
			</SelectPrimitive.ItemIndicator>
		</SelectPrimitive.Item>
	);
}

function SelectSeparator({
	className,
	...props
}: SelectPrimitive.Separator.Props) {
	return (
		<SelectPrimitive.Separator
			data-slot="select-separator"
			className={cn("pointer-events-none -mx-1 my-1 h-px bg-border", className)}
			{...props}
		/>
	);
}

function SelectScrollUpButton({
	className,
	...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
	return (
		<SelectPrimitive.ScrollUpArrow
			data-slot="select-scroll-up-button"
			className={cn(
				"top-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
				className,
			)}
			{...props}
		>
			<ChevronUpIcon />
		</SelectPrimitive.ScrollUpArrow>
	);
}

function SelectScrollDownButton({
	className,
	...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
	return (
		<SelectPrimitive.ScrollDownArrow
			data-slot="select-scroll-down-button"
			className={cn(
				"bottom-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
				className,
			)}
			{...props}
		>
			<ChevronDownIcon />
		</SelectPrimitive.ScrollDownArrow>
	);
}

export {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectScrollDownButton,
	SelectScrollUpButton,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
};

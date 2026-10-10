import type { FlagComponent } from "country-flag-icons/react/3x2";
import * as Flags from "country-flag-icons/react/3x2";
import { cn } from "@/lib/utils";

interface CountryFlagProps {
	countryCode?: string;
	className?: string;
	fallbackText?: string;
	title?: string;
}

export function CountryFlag({
	countryCode,
	className,
	fallbackText,
	title,
}: CountryFlagProps) {
	if (!countryCode) {
		return fallbackText ? (
			<span className="text-xs">{fallbackText}</span>
		) : null;
	}

	const codeUpper = countryCode.toUpperCase();
	const Flag = (Flags as Record<string, FlagComponent | undefined>)[codeUpper];

	if (!Flag) {
		return fallbackText ? (
			<span className="text-xs">{fallbackText}</span>
		) : (
			<span className="text-[10px] font-mono uppercase text-muted-foreground">
				{codeUpper}
			</span>
		);
	}

	return (
		<Flag
			title={title}
			className={cn(
				"size-4 shrink-0 rounded-[2px] object-cover shadow-[0_0_0_1px_rgba(0,0,0,0.06)]",
				className,
			)}
		/>
	);
}

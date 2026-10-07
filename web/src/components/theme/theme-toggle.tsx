import { Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/components/theme/theme-provider";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

export function ModeToggle() {
	const { theme, setTheme } = useTheme();
	const { t } = useTranslation();

	const isDark =
		theme === "dark" ||
		(theme === "system" &&
			typeof window !== "undefined" &&
			window.matchMedia("(prefers-color-scheme: dark)").matches);

	function toggleTheme() {
		setTheme(isDark ? "light" : "dark");
	}

	const label = isDark ? t("theme.switchToLight") : t("theme.switchToDark");

	return (
		<TooltipProvider delay={250}>
			<Tooltip>
				<TooltipTrigger
					render={
						<Button
							aria-label={label}
							className="size-8 rounded-md text-muted-foreground "
							onClick={toggleTheme}
							size="icon"
							variant="ghost"
						>
							<span className="relative flex size-4 items-center justify-center">
								<Moon
									aria-hidden="true"
									className={`absolute transition-all duration-300 ease-out ${
										isDark
											? "rotate-90 scale-0 opacity-0"
											: "rotate-0 scale-100 opacity-100"
									}`}
								/>
								<Sun
									aria-hidden="true"
									className={`absolute transition-all duration-300 ease-out ${
										isDark
											? "rotate-0 scale-100 opacity-100"
											: "-rotate-90 scale-0 opacity-0"
									}`}
								/>
							</span>
							<span className="sr-only">{label}</span>
						</Button>
					}
				/>
				<TooltipContent side="bottom">{label}</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

export default ModeToggle;

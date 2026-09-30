import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

export function ModeToggle() {
	const [isDark, setIsDark] = useState(false);

	useEffect(() => {
		setIsDark(document.documentElement.classList.contains("dark"));
	}, []);

	function toggleTheme() {
		const nextIsDark = !isDark;
		document.documentElement.classList.toggle("dark", nextIsDark);
		setIsDark(nextIsDark);
	}

	const label = isDark ? "Switch to light theme" : "Switch to dark theme";

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

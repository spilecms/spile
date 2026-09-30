import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { ModeToggle } from "@/components/theme/theme-toggle";
import { CircleUserRound, Redo2, Undo2 } from "lucide-react";
import { SaveStatus } from "./save-status";

interface NavbarProps {
	title: string;
	onTitleChange: (title: string) => void;
	onUndo: () => void;
	onRedo: () => void;
	saving: boolean;
	savedAt: number | null;
}

export default function Navbar({
	title,
	onTitleChange,
	onUndo,
	onRedo,
	saving,
	savedAt,
}: NavbarProps) {
	return (
		<header className="sticky top-0 z-40 flex h-12 items-center justify-between gap-3 border-b bg-background/80 px-4 backdrop-blur-sm mb-1">
			<div className="flex min-w-0 flex-1 items-center gap-3">
				{title ? (
					title.length < 15 ? (
						<p>{title}</p>
					) : (
						<p className="truncate">{title}...</p>
					)
				) : (
					<p>untitled</p>
				)}
				<SaveStatus saving={saving} savedAt={savedAt} />
			</div>

			<nav
				aria-label="Editor actions"
				className="flex shrink-0 items-center gap-0.5"
			>
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger
							render={
								<Button
									size="icon-sm"
									variant="ghost"
									aria-label="Undo"
									onClick={onUndo}
								/>
							}
						>
							<Undo2 />
						</TooltipTrigger>
						<TooltipContent>Undo</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger
							render={
								<Button
									size="icon-sm"
									variant="ghost"
									aria-label="Redo"
									onClick={onRedo}
								/>
							}
						>
							<Redo2 />
						</TooltipTrigger>
						<TooltipContent>Redo</TooltipContent>
					</Tooltip>
				</TooltipProvider>

				<div className="mx-2 h-5 w-px bg-border" />

				<ModeToggle />

				<div className="mx-2 h-5 w-px bg-border" />

				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<Button
								size="icon-sm"
								variant="ghost"
								aria-label="Open account menu"
								className="rounded-full"
							/>
						}
					>
						<Avatar className="size-7">
							<AvatarFallback>
								<CircleUserRound />
							</AvatarFallback>
						</Avatar>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuGroup>
							<DropdownMenuLabel>My account</DropdownMenuLabel>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuItem>Profile</DropdownMenuItem>
						<DropdownMenuItem>Settings</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem variant="destructive">Sign out</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</nav>
		</header>
	);
}

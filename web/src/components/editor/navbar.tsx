import { ChevronLeftIcon, CircleUserRound, Redo2, Undo2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ModeToggle } from "@/components/theme/theme-toggle";
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
import { SaveStatus } from "./save-status";

interface NavbarProps {
	title: string;
	onTitleChange: (title: string) => void;
	onUndo: () => void;
	onRedo: () => void;
	onPublish: () => void;
	saving: boolean;
	savedAt: number | null;
}

export default function Navbar({
	title,
	onTitleChange,
	onUndo,
	onRedo,
	onPublish,
	saving,
	savedAt,
}: NavbarProps) {
	const navigate = useNavigate();

	return (
		<header className="sticky top-0 z-40 flex h-12 items-center justify-between gap-3 border-b bg-background/80 px-4 backdrop-blur-sm mb-1">
			<div className="flex min-w-0 flex-1 items-center gap-2">
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger
							render={
								<Button
									size="icon-sm"
									variant="ghost"
									aria-label="Back to posts"
									onClick={() => navigate("/posts")}
								/>
							}
						>
							<ChevronLeftIcon />
						</TooltipTrigger>
						<TooltipContent>Back to posts</TooltipContent>
					</Tooltip>
				</TooltipProvider>

				<input
					value={title}
					onChange={(e) => onTitleChange(e.target.value)}
					placeholder="Untitled"
					aria-label="Post title"
					className="min-w-0 max-w-md flex-1 truncate rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-medium outline-none transition-colors hover:border-border focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
				/>
			</div>

			<nav
				aria-label="Editor actions"
				className="flex shrink-0 items-center gap-0.7"
			>
				<SaveStatus saving={saving} savedAt={savedAt} />
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

				<Button
					size="sm"
					className="font-bold text-[0.775rem] "
					onClick={onPublish}
				>
					Publish
				</Button>

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

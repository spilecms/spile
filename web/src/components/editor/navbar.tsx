import { useQuery } from "@tanstack/react-query";
import {
	ChevronLeftIcon,
	CircleUserRound,
	History,
	PanelLeftCloseIcon,
	PanelLeftIcon,
	Redo2,
	Send,
	Undo2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
	ROLE_LABELS,
	UserPersonaSubmenu,
} from "@/components/common/role-switcher";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { mockApi } from "@/lib/mock/api";
import { SaveStatus } from "./save-status";

interface NavbarProps {
	title: string;
	onTitleChange: (title: string) => void;
	onUndo: () => void;
	onRedo: () => void;
	onPublish: () => void;
	saving: boolean;
	savedAt: number | null;
	backUrl?: string;
	onToggleSidebar?: () => void;
	isSidebarOpen?: boolean;
	isContributor?: boolean;
	isLocked?: boolean;
	onHistory?: () => void;
	onSubmitReview?: () => void;
}

function initials(name: string): string {
	return name
		.split(/\s+/)
		.map((part) => part[0])
		.filter(Boolean)
		.slice(0, 2)
		.join("")
		.toUpperCase();
}

export default function Navbar({
	title,
	onTitleChange,
	onUndo,
	onRedo,
	onPublish,
	saving,
	savedAt,
	backUrl = "/posts",
	onToggleSidebar,
	isSidebarOpen,
	isContributor,
	isLocked,
	onHistory,
	onSubmitReview,
}: NavbarProps) {
	const navigate = useNavigate();
	const { data: currentUser } = useQuery({
		queryKey: ["users", "current"],
		queryFn: () => mockApi.users.current(),
	});

	const role = currentUser?.role || "owner";
	const roleInfo = ROLE_LABELS[role] || ROLE_LABELS.owner;

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
									aria-label="Back"
									onClick={() => navigate(backUrl)}
								/>
							}
						>
							<ChevronLeftIcon />
						</TooltipTrigger>
						<TooltipContent>Back</TooltipContent>
					</Tooltip>

					{onToggleSidebar && (
						<Tooltip>
							<TooltipTrigger
								render={
									<Button
										size="icon-sm"
										variant="ghost"
										aria-label={
											isSidebarOpen ? "Hide Docs Sidebar" : "Show Docs Sidebar"
										}
										onClick={onToggleSidebar}
									/>
								}
							>
								{isSidebarOpen ? <PanelLeftCloseIcon /> : <PanelLeftIcon />}
							</TooltipTrigger>
							<TooltipContent>
								{isSidebarOpen ? "Hide Docs Sidebar" : "Show Docs Sidebar"}
							</TooltipContent>
						</Tooltip>
					)}
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

				{onHistory && (
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger
								render={
									<Button
										size="icon-sm"
										variant="ghost"
										aria-label="Version history"
										onClick={onHistory}
									/>
								}
							>
								<History />
							</TooltipTrigger>
							<TooltipContent>Version History</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				)}

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

				{isContributor ? (
					<Button
						size="sm"
						variant="default"
						className="gap-1.5 font-bold text-[0.775rem] bg-amber-600 hover:bg-amber-500 text-white"
						onClick={onSubmitReview}
						disabled={isLocked}
					>
						<Send className="size-3.5" />
						{isLocked ? "In Review" : "Submit for Review"}
					</Button>
				) : (
					<Button
						size="sm"
						className="font-bold text-[0.775rem]"
						onClick={onPublish}
					>
						Publish
					</Button>
				)}

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
							<AvatarFallback className="text-xs">
								{currentUser ? initials(currentUser.name) : <CircleUserRound />}
							</AvatarFallback>
						</Avatar>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-56">
						<DropdownMenuGroup>
							<DropdownMenuLabel className="p-0 font-normal">
								<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
									<Avatar className="size-7">
										<AvatarFallback className="text-xs">
											{currentUser ? initials(currentUser.name) : "?"}
										</AvatarFallback>
									</Avatar>
									<div className="grid flex-1 text-left text-sm leading-tight">
										<div className="flex items-center gap-1.5 min-w-0">
											<span className="truncate font-medium">
												{currentUser?.name}
											</span>
											<Badge
												variant="outline"
												className={`h-4 px-1 text-[9px] font-semibold uppercase tracking-wider shrink-0 ${roleInfo.color}`}
											>
												{roleInfo.badge}
											</Badge>
										</div>
										<span className="truncate text-xs text-muted-foreground">
											{currentUser?.email}
										</span>
									</div>
								</div>
							</DropdownMenuLabel>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem onClick={() => navigate("/settings")}>
								Settings
							</DropdownMenuItem>
							<UserPersonaSubmenu />
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuItem variant="destructive">Sign out</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</nav>
		</header>
	);
}

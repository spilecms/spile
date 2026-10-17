import { ArrowUpTrayIcon } from "@heroicons/react/24/solid";
import {
	ChevronLeftIcon,
	History,
	PanelLeftCloseIcon,
	PanelLeftIcon,
	Send,
} from "lucide-react";
import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

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
	onImport?: (file: File) => void;
	readOnly?: boolean;
}

export default function Navbar({
	title,
	onTitleChange,
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
	onImport,
	readOnly,
}: NavbarProps) {
	const navigate = useNavigate();
	const fileInputRef = useRef<HTMLInputElement>(null);

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
					onKeyDown={(e) => e.stopPropagation()}
					onKeyUp={(e) => e.stopPropagation()}
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

				{onImport && !readOnly && !isLocked && (
					<>
						<input
							type="file"
							ref={fileInputRef}
							onChange={(e) => {
								const file = e.target.files?.[0];
								if (file) {
									onImport(file);
								}
								e.target.value = "";
							}}
							accept=".md,.markdown,.html,.htm,.txt,text/markdown,text/html,text/plain"
							className="hidden"
							tabIndex={-1}
						/>
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger
									render={
										<Button
											size="icon-sm"
											variant="ghost"
											aria-label="Import document"
											onMouseDown={(e) => {
												e.preventDefault();
											}}
											onClick={() => fileInputRef.current?.click()}
										/>
									}
								>
									<ArrowUpTrayIcon />
								</TooltipTrigger>
								<TooltipContent>Import (.md, .html, .txt)</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</>
				)}

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
			</nav>
		</header>
	);
}

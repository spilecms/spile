import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Globe, Plus } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { mockApi } from "@/lib/mock/api";
import { useEditorStore } from "@/lib/store/editor-store";
import { cn } from "@/lib/utils";
import type { Post, WorkspaceLocale } from "@/types/domain";
import { AddTranslationDialog } from "./add-translation-dialog";

export function TranslationsSection({
	onNavigate,
}: {
	onNavigate?: () => void;
}) {
	const navigate = useNavigate();
	const currentPostId = useEditorStore((s) => s.postId);
	const translationGroupId = useEditorStore(
		(s) => s.translationGroupId || s.postId || "",
	);

	const [addDialogOpen, setAddDialogOpen] = React.useState(false);

	const { data: locales } = useQuery({
		queryKey: ["workspace", "locales"],
		queryFn: () => mockApi.locales.list(),
	});

	const { data: translations, isLoading } = useQuery({
		queryKey: ["posts", "translations", translationGroupId],
		queryFn: () => mockApi.posts.getTranslations(translationGroupId),
		enabled: Boolean(translationGroupId),
	});

	const existingLocales = React.useMemo(() => {
		return (translations ?? []).map((t) => t.locale ?? "en");
	}, [translations]);

	const availableCount = (locales ?? []).filter(
		(l) => !existingLocales.includes(l.code),
	).length;

	const handleSwitch = (post: Post) => {
		if (post.id === currentPostId) return;
		onNavigate?.();
		navigate(`/editor/${post.id}`);
	};

	const getLocaleInfo = (code: string): WorkspaceLocale => {
		return (
			locales?.find((l) => l.code === code) ?? {
				code,
				name: code.toUpperCase(),
				flag: "🌐",
			}
		);
	};

	return (
		<div className="flex flex-col gap-2.5">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-1.5">
					<Globe className="size-3.5 text-muted-foreground" />
					<span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
						Translations
					</span>
					{translations && translations.length > 0 && (
						<span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px] font-medium text-muted-foreground">
							{translations.length}/{locales?.length ?? 6}
						</span>
					)}
				</div>

				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger
							render={
								<Button
									size="icon-xs"
									variant="ghost"
									disabled={availableCount === 0}
									onClick={() => setAddDialogOpen(true)}
									className="size-6 rounded-md hover:bg-accent"
									aria-label="Add translation"
								/>
							}
						>
							<Plus className="size-3.5" />
						</TooltipTrigger>
						<TooltipContent>
							{availableCount === 0
								? "All languages added"
								: "Add language translation"}
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>

			<div className="flex flex-col gap-1.5">
				{isLoading ? (
					<div className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground animate-pulse">
						Loading translations…
					</div>
				) : (translations ?? []).length === 0 ? (
					<div className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
						No translations for this post.
					</div>
				) : (
					translations?.map((trans) => {
						const isCurrent = trans.id === currentPostId;
						const loc = getLocaleInfo(trans.locale ?? "en");
						const isDefault = trans.isDefaultLocale || trans.locale === "en";

						return (
							<button
								type="button"
								key={trans.id}
								onClick={() => handleSwitch(trans)}
								disabled={isCurrent}
								className={cn(
									"group flex w-full items-center justify-between rounded-lg border p-2 text-left text-xs transition-all",
									isCurrent
										? "border-primary/50 bg-primary/5 shadow-xs cursor-default"
										: "cursor-pointer border-border hover:border-muted-foreground/30 hover:bg-muted/40",
								)}
							>
								<div className="flex items-center gap-2 min-w-0">
									<span className="text-sm shrink-0">{loc.flag}</span>
									<div className="flex flex-col min-w-0">
										<div className="flex items-center gap-1.5">
											<span className="font-medium truncate text-foreground">
												{loc.name}
											</span>
											{isDefault && (
												<span className="text-[10px] text-muted-foreground font-normal">
													(Default)
												</span>
											)}
										</div>
									</div>
								</div>

								<div className="flex items-center gap-1.5 shrink-0">
									{isCurrent ? (
										<Badge
											variant="default"
											className="h-5 px-1.5 text-[10px] font-semibold gap-1"
										>
											<Check className="size-2.5" />
											<span>Active</span>
										</Badge>
									) : (
										<>
											<Badge
												variant={
													trans.status === "published" ? "default" : "secondary"
												}
												className={cn(
													"h-5 px-1.5 text-[10px] capitalize font-normal",
													trans.status === "published" &&
														"bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
												)}
											>
												{trans.status}
											</Badge>
											<ArrowRight className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
										</>
									)}
								</div>
							</button>
						);
					})
				)}

				{availableCount > 0 && (
					<button
						type="button"
						onClick={() => setAddDialogOpen(true)}
						className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed py-2 text-xs font-medium text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
					>
						<Plus className="size-3.5" />
						<span>Add translation ({availableCount} available)</span>
					</button>
				)}
			</div>

			{currentPostId && (
				<AddTranslationDialog
					open={addDialogOpen}
					onOpenChange={setAddDialogOpen}
					sourcePostId={currentPostId}
					translationGroupId={translationGroupId}
					existingLocales={existingLocales}
					onSuccess={() => onNavigate?.()}
				/>
			)}
		</div>
	);
}

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Globe } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { mockApi } from "@/lib/mock/api";
import { cn } from "@/lib/utils";
import type { WorkspaceLocale } from "@/types/domain";

interface AddTranslationDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	sourcePostId: string;
	translationGroupId: string;
	existingLocales: string[];
	onSuccess?: () => void;
}

export function AddTranslationDialog({
	open,
	onOpenChange,
	sourcePostId,
	translationGroupId,
	existingLocales,
	onSuccess,
}: AddTranslationDialogProps) {
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	const { data: locales } = useQuery({
		queryKey: ["workspace", "locales"],
		queryFn: () => mockApi.locales.list(),
		enabled: open,
	});

	const availableLocales = React.useMemo(() => {
		return (locales ?? []).filter((l) => !existingLocales.includes(l.code));
	}, [locales, existingLocales]);

	const [selectedLocale, setSelectedLocale] = React.useState<string>("");
	const [copyContent, setCopyContent] = React.useState(true);
	const [creating, setCreating] = React.useState(false);

	React.useEffect(() => {
		if (open) {
			setSelectedLocale((current) => {
				if (current && availableLocales.some((l) => l.code === current)) {
					return current;
				}
				return availableLocales[0]?.code ?? "";
			});
			setCopyContent(true);
			setCreating(false);
		}
	}, [open, availableLocales]);

	const handleCreate = async () => {
		if (!selectedLocale) return;
		setCreating(true);
		try {
			const newPost = await mockApi.posts.createTranslation(
				sourcePostId,
				selectedLocale,
				copyContent,
			);
			await queryClient.invalidateQueries({ queryKey: ["posts"] });
			await queryClient.invalidateQueries({
				queryKey: ["posts", "translations", translationGroupId],
			});

			const localeObj = locales?.find((l) => l.code === selectedLocale);
			toast.success(
				`Created ${localeObj ? `${localeObj.flag} ${localeObj.name}` : selectedLocale} translation!`,
			);
			onOpenChange(false);
			onSuccess?.();
			navigate(`/editor/${newPost.id}`);
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to create translation",
			);
		} finally {
			setCreating(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<div className="flex items-center gap-2">
						<div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
							<Globe className="size-4" />
						</div>
						<DialogTitle>Add Translation</DialogTitle>
					</div>
					<DialogDescription>
						Translate this document into another language. Content and slugs
						will be localized independently.
					</DialogDescription>
				</DialogHeader>

				{availableLocales.length === 0 ? (
					<div className="py-6 text-center text-sm text-muted-foreground">
						All supported languages have already been created for this document.
					</div>
				) : (
					<div className="flex flex-col gap-4 py-2">
						<div className="flex flex-col gap-2">
							<Label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
								Select target language
							</Label>
							<div className="grid grid-cols-2 gap-2">
								{availableLocales.map((loc: WorkspaceLocale) => {
									const isSelected = selectedLocale === loc.code;
									return (
										<button
											key={loc.code}
											type="button"
											onClick={() => setSelectedLocale(loc.code)}
											className={cn(
												"flex items-center justify-between rounded-lg border p-2.5 text-left text-sm transition-all",
												isSelected
													? "border-primary bg-primary/5 font-medium text-foreground ring-1 ring-primary"
													: "border-border hover:border-muted-foreground/40 hover:bg-muted/50",
											)}
										>
											<div className="flex items-center gap-2 truncate">
												<span className="text-base">{loc.flag}</span>
												<div className="flex flex-col truncate">
													<span className="truncate text-xs font-medium">
														{loc.name}
													</span>
													<span className="text-[10px] text-muted-foreground uppercase">
														{loc.code}
													</span>
												</div>
											</div>
											{isSelected && (
												<Check className="size-4 shrink-0 text-primary" />
											)}
										</button>
									);
								})}
							</div>
						</div>

						<div className="rounded-lg border bg-muted/30 p-3">
							<button
								type="button"
								onClick={() => setCopyContent(!copyContent)}
								className="flex w-full items-start gap-2.5 text-left"
							>
								<div
									className={cn(
										"mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
										copyContent
											? "border-primary bg-primary text-primary-foreground"
											: "border-muted-foreground/40 bg-background",
									)}
								>
									{copyContent && <Check className="size-3" />}
								</div>
								<div className="flex flex-col gap-0.5">
									<div className="flex items-center gap-1.5 text-xs font-medium">
										<Copy className="size-3 text-muted-foreground" />
										<span>Duplicate current content</span>
										<span className="rounded bg-primary/10 px-1 py-0.2 text-[10px] font-semibold text-primary">
											Recommended
										</span>
									</div>
									<p className="text-[11px] text-muted-foreground leading-normal">
										Copies all headings, text, media, and formatting so you can
										translate in place without rebuilding blocks.
									</p>
								</div>
							</button>
						</div>
					</div>
				)}

				<DialogFooter>
					<Button
						variant="outline"
						size="sm"
						onClick={() => onOpenChange(false)}
						disabled={creating}
					>
						Cancel
					</Button>
					<Button
						size="sm"
						onClick={handleCreate}
						disabled={
							creating || !selectedLocale || availableLocales.length === 0
						}
					>
						{creating ? "Creating…" : "Create Translation"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

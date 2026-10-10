import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	CN,
	DE,
	ES,
	ET,
	type FlagComponent,
	FR,
	IT,
	JP,
	PT,
	SA,
	US,
} from "country-flag-icons/react/3x2";
import { Check, Globe, Plus, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { mockApi } from "@/lib/mock/api";
import type { WorkspaceLocale } from "@/types/domain";

const PRESET_LANGUAGES: WorkspaceLocale[] = [
	{ code: "en", name: "English", flag: "🇬🇧" },
	{ code: "es", name: "Spanish", flag: "🇪🇸" },
	{ code: "fr", name: "French", flag: "🇫🇷" },
	{ code: "de", name: "German", flag: "🇩🇪" },
	{ code: "am", name: "Amharic", flag: "🇪🇹" },
	{ code: "ar", name: "Arabic", flag: "🇸🇦" },
	{ code: "zh", name: "Chinese", flag: "🇨🇳" },
	{ code: "ja", name: "Japanese", flag: "🇯🇵" },
	{ code: "pt", name: "Portuguese", flag: "🇵🇹" },
	{ code: "it", name: "Italian", flag: "🇮🇹" },
];

const flags: Record<string, FlagComponent> = {
	en: US,
	es: ES,
	fr: FR,
	de: DE,
	am: ET,
	ar: SA,
	zh: CN,
	ja: JP,
	pt: PT,
	it: IT,
};

function LocaleFlag({ code, flag }: { code: string; flag: string }) {
	const Flag = flags[code];
	if (Flag) {
		return <Flag className="size-6 h-4 shrink-0 rounded-[2px]" />;
	}
	return <span className="text-base">{flag}</span>;
}

export function LocalesSection() {
	const queryClient = useQueryClient();
	const [addOpen, setAddOpen] = React.useState(false);
	const [selectedCode, setSelectedCode] = React.useState("");
	const [searchLang, setSearchLang] = React.useState("");
	const [defaultCode, setDefaultCode] = React.useState("en");

	const { data: locales, isLoading } = useQuery({
		queryKey: ["workspace", "locales"],
		queryFn: () => mockApi.locales.list(),
	});

	React.useEffect(() => {
		const def = locales?.find((l) => l.isDefault)?.code;
		if (def) setDefaultCode(def);
	}, [locales]);

	const setDefaultMutation = useMutation({
		mutationFn: (code: string) => mockApi.locales.setDefault(code),
		onSuccess: (updated) => {
			queryClient.invalidateQueries({ queryKey: ["workspace", "locales"] });
			toast.success(`Default locale set to ${updated.flag} ${updated.name}`);
		},
		onError: () => toast.error("Failed to update default locale"),
	});

	const addMutation = useMutation({
		mutationFn: (newLoc: WorkspaceLocale) => mockApi.locales.add(newLoc),
		onSuccess: (newLoc) => {
			queryClient.invalidateQueries({ queryKey: ["workspace", "locales"] });
			toast.success(`Added ${newLoc.flag} ${newLoc.name}`);
			setAddOpen(false);
			setSelectedCode("");
		},
		onError: () => toast.error("Failed to add language"),
	});

	const removeMutation = useMutation({
		mutationFn: (code: string) => mockApi.locales.remove(code),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["workspace", "locales"] });
			toast.success("Language removed");
		},
		onError: () => toast.error("Failed to remove language"),
	});

	const activeCodes = (locales ?? []).map((l) => l.code);
	const availableToAdd = PRESET_LANGUAGES.filter(
		(l) =>
			!activeCodes.includes(l.code) &&
			(l.name.toLowerCase().includes(searchLang.toLowerCase()) ||
				l.code.toLowerCase().includes(searchLang.toLowerCase())),
	);

	const handleAddLanguage = () => {
		const target = PRESET_LANGUAGES.find((l) => l.code === selectedCode);
		if (target) {
			addMutation.mutate(target);
		}
	};

	return (
		<div className="flex flex-col gap-6">
			<Card>
				<CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
					<div>
						<CardTitle className="text-base font-semibold flex items-center gap-2">
							<Globe className="size-4 text-primary" />
							<span>Active Languages</span>
						</CardTitle>
						<CardDescription className="text-xs mt-1">
							Configure the default language and active translation locales for
							posts and docs.
						</CardDescription>
					</div>
					<Button
						size="sm"
						onClick={() => setAddOpen(true)}
						className="gap-1.5 h-8 text-xs shrink-0"
					>
						<Plus className="size-3.5" />
						<span>Add Language</span>
					</Button>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
						<div className="flex flex-col gap-0.5">
							<span className="text-xs font-medium">
								Default (Canonical) Locale
							</span>
							<span className="text-[11px] text-muted-foreground">
								The fallback language when translated copies don't exist.
							</span>
						</div>
						<div className="w-40">
							<Select
								value={defaultCode}
								onValueChange={(val) => {
									if (typeof val === "string") {
										setDefaultCode(val);
										setDefaultMutation.mutate(val);
									}
								}}
							>
								<SelectTrigger className="h-8 text-xs rounded-none">
									<SelectValue>
										{(value) => {
											const loc = (locales ?? []).find((l) => l.code === value);
											return (
												<>
													{loc && (
														<LocaleFlag code={loc.code} flag={loc.flag} />
													)}
													<span>{loc ? loc.name : String(value ?? "")}</span>
												</>
											);
										}}
									</SelectValue>
								</SelectTrigger>
								<SelectContent>
									{(locales ?? []).map((loc) => (
										<SelectItem
											key={loc.code}
											value={loc.code}
											className="text-xs"
										>
											<LocaleFlag code={loc.code} flag={loc.flag} />
											<span>{loc.name}</span>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="rounded-lg border overflow-hidden">
						<table className="w-full text-xs">
							<thead>
								<tr className="border-b bg-muted/40 text-left text-muted-foreground">
									<th className="py-2.5 px-3 font-medium">Language</th>
									<th className="py-2.5 px-3 font-medium">Code</th>
									<th className="py-2.5 px-3 font-medium">Status</th>
									<th className="py-2.5 px-3 text-right font-medium">
										Actions
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border/60">
								{isLoading ? (
									<tr>
										<td
											colSpan={4}
											className="py-6 text-center text-muted-foreground"
										>
											Loading languages…
										</td>
									</tr>
								) : (
									(locales ?? []).map((loc) => {
										const isDefault = loc.code === defaultCode;
										return (
											<tr
												key={loc.code}
												className="hover:bg-muted/30 transition-colors"
											>
												<td className="py-2.5 px-3 font-medium flex items-center gap-2">
													<LocaleFlag code={loc.code} flag={loc.flag} />
													<span>{loc.name}</span>
												</td>
												<td className="py-2.5 px-3 font-mono text-[11px] uppercase text-muted-foreground">
													{loc.code}
												</td>
												<td className="py-2.5 px-3">
													{isDefault ? (
														<Badge
															variant="default"
															className="text-[10px] h-5 px-1.5 font-normal"
														>
															Canonical Default
														</Badge>
													) : (
														<Badge
															variant="secondary"
															className="text-[10px] h-5 px-1.5 font-normal"
														>
															Active Locale
														</Badge>
													)}
												</td>
												<td className="py-2.5 px-3 text-right">
													{!isDefault && (
														<Button
															variant="ghost"
															size="icon"
															className="size-7 text-muted-foreground hover:text-destructive"
															onClick={() => removeMutation.mutate(loc.code)}
															disabled={removeMutation.isPending}
															title="Remove language"
														>
															<Trash2 className="size-3.5" />
														</Button>
													)}
												</td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>
					</div>
				</CardContent>
			</Card>

			{/* Add Language Dialog */}
			<Dialog open={addOpen} onOpenChange={setAddOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Globe className="size-4 text-primary" />
							<span>Add Translation Language</span>
						</DialogTitle>
						<DialogDescription className="text-xs">
							Enable a new target language for blog articles and technical
							documentation.
						</DialogDescription>
					</DialogHeader>

					<div className="flex flex-col gap-3 py-2">
						<Input
							placeholder="Search language name or ISO code…"
							value={searchLang}
							onChange={(e) => setSearchLang(e.target.value)}
							className="h-8 text-xs"
						/>

						<div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
							{availableToAdd.length === 0 ? (
								<p className="col-span-2 py-4 text-center text-xs text-muted-foreground">
									No languages found or all already added.
								</p>
							) : (
								availableToAdd.map((lang) => {
									const isSelected = selectedCode === lang.code;
									return (
										<button
											key={lang.code}
											type="button"
											onClick={() => setSelectedCode(lang.code)}
											className={`flex items-center justify-between p-2 rounded-lg border text-left text-xs transition-all ${
												isSelected
													? "border-primary bg-primary/5 text-foreground ring-1 ring-primary"
													: "hover:bg-muted/50 border-border"
											}`}
										>
											<div className="flex items-center gap-2 truncate">
												<span className="text-base">{lang.flag}</span>
												<div className="flex flex-col truncate">
													<span className="font-medium truncate">
														{lang.name}
													</span>
													<span className="text-[10px] text-muted-foreground uppercase">
														{lang.code}
													</span>
												</div>
											</div>
											{isSelected && (
												<Check className="size-3.5 text-primary shrink-0" />
											)}
										</button>
									);
								})
							)}
						</div>
					</div>

					<DialogFooter>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setAddOpen(false)}
						>
							Cancel
						</Button>
						<Button
							size="sm"
							onClick={handleAddLanguage}
							disabled={!selectedCode || addMutation.isPending}
						>
							{addMutation.isPending ? "Adding…" : "Add Language"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

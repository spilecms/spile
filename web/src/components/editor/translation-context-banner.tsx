import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { mockApi } from "@/lib/mock/api";
import { useEditorStore } from "@/lib/store/editor-store";

export function TranslationContextBanner() {
	const navigate = useNavigate();
	const locale = useEditorStore((s) => s.locale);
	const isDefaultLocale = useEditorStore((s) => s.isDefaultLocale);
	const translationGroupId = useEditorStore((s) => s.translationGroupId);
	const translationSourceId = useEditorStore((s) => s.translationSourceId);

	const itemType = useEditorStore((s) => s.type);
	const isDoc = itemType === "doc";

	const { data: locales } = useQuery({
		queryKey: ["workspace", "locales"],
		queryFn: () => mockApi.locales.list(),
	});

	// Only show when editing a translation that is not default English
	if (isDefaultLocale || locale === "en" || !locale) {
		return null;
	}

	const currentLocaleObj = locales?.find((l) => l.code === locale);
	const targetOriginalId = translationSourceId || translationGroupId;

	const handleSwitchToOriginal = () => {
		if (targetOriginalId) {
			if (isDoc) {
				navigate(`/editor/doc/${targetOriginalId}`);
			} else {
				navigate(`/editor/${targetOriginalId}`);
			}
		}
	};

	return (
		<div className="sticky top-12 z-30 flex items-center justify-between border-b bg-amber-500/10 px-4 py-1.5 text-xs text-amber-900 backdrop-blur-sm dark:bg-amber-500/15 dark:text-amber-200 sheet-content-scroll">
			<div className="flex items-center gap-2 truncate">
				<span className="text-sm shrink-0">
					{currentLocaleObj?.flag ?? "🌐"}
				</span>
				<span className="font-semibold truncate">
					Editing {currentLocaleObj?.name ?? locale.toUpperCase()} Translation
				</span>
				<span className="hidden sm:inline text-amber-800/70 dark:text-amber-300/70">
					• Content & slug are localized independently
				</span>
			</div>

			{targetOriginalId && (
				<Button
					size="xs"
					variant="ghost"
					onClick={handleSwitchToOriginal}
					className="h-6 gap-1 text-[11px] font-medium text-amber-900 hover:bg-amber-500/20 dark:text-amber-200 dark:hover:bg-amber-500/30"
				>
					<ArrowLeft className="size-3" />
					<span>Switch to English Original</span>
				</Button>
			)}
		</div>
	);
}

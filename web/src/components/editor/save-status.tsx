import { Check, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

interface SaveStatusProps {
	saving: boolean;
	savedAt: number | null;
}

export function SaveStatus({ saving, savedAt }: SaveStatusProps) {
	const [showSaved, setShowSaved] = useState(false);

	useEffect(() => {
		if (!savedAt) return;
		setShowSaved(true);
		const timer = setTimeout(() => setShowSaved(false), 2000);
		return () => clearTimeout(timer);
	}, [savedAt]);

	if (saving) {
		return (
			<span className="flex items-center gap-1.5 text-xs text-muted-foreground mr-0.5">
				<LoaderCircle className="size-3.5 animate-spin" aria-hidden />
				Saving…
			</span>
		);
	}

	if (showSaved) {
		return (
			<span className="flex items-center gap-1.5 text-xs text-muted-foreground mr-0.5">
				<Check className="size-3.5 text-primary" aria-hidden />
				Saved
			</span>
		);
	}

	return null;
}

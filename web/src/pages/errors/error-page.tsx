import {
	AlertTriangleIcon,
	ChevronDownIcon,
	HomeIcon,
	RotateCcwIcon,
} from "lucide-react";
import { useState } from "react";
import {
	isRouteErrorResponse,
	useNavigate,
	useRouteError,
} from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import NotFoundPage from "./not-found-page";

export default function ErrorPage() {
	const error = useRouteError();
	const navigate = useNavigate();
	const [showDetails, setShowDetails] = useState(false);

	if (isRouteErrorResponse(error) && error.status === 404) {
		return <NotFoundPage />;
	}

	let statusLabel = "Application Error";
	const title = "Something went wrong";
	let message =
		"An unexpected error occurred while rendering this page. You can try reloading or return to the dashboard.";
	let details: string | undefined;

	if (isRouteErrorResponse(error)) {
		statusLabel = `${error.status} ${error.statusText || "Error"}`;
		if (typeof error.data === "string" && error.data.trim()) {
			message = error.data;
		} else if (
			error.data &&
			typeof error.data === "object" &&
			"message" in error.data &&
			typeof (error.data as { message?: unknown }).message === "string"
		) {
			message = (error.data as { message: string }).message;
		}
	} else if (error instanceof Error) {
		if (error.message) {
			message = error.message;
		}
		details = error.stack;
	} else if (typeof error === "string" && error.trim()) {
		message = error;
	}

	return (
		<div className="flex min-h-screen w-full flex-1 flex-col items-center justify-center bg-background px-4 py-16 text-center text-foreground">
			<div className="flex max-w-lg flex-col items-center gap-4">
				<div className="flex size-14 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 text-destructive shadow-xs">
					<AlertTriangleIcon className="size-6" />
				</div>

				<Badge
					variant="outline"
					className="border-destructive/30 bg-destructive/10 font-mono text-[11px] tracking-wider text-destructive uppercase px-2.5 py-0.5"
				>
					{statusLabel}
				</Badge>

				<div className="space-y-1.5">
					<h1 className="text-2xl font-bold tracking-tight text-foreground">
						{title}
					</h1>
					<p className="text-sm text-muted-foreground leading-relaxed">
						{message}
					</p>
				</div>

				<div className="mt-2 flex flex-wrap items-center justify-center gap-2.5">
					<Button
						variant="outline"
						size="sm"
						onClick={() => window.location.reload()}
						className="gap-1.5 text-xs"
					>
						<RotateCcwIcon className="size-3.5" />
						Reload Page
					</Button>
					<Button
						size="sm"
						onClick={() => navigate("/", { replace: true })}
						className="gap-1.5 text-xs"
					>
						<HomeIcon className="size-3.5" />
						Back to Dashboard
					</Button>
				</div>

				{details && (
					<div className="mt-4 w-full text-left">
						<button
							type="button"
							onClick={() => setShowDetails((v) => !v)}
							className="mx-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
						>
							<span>{showDetails ? "Hide" : "Show"} technical details</span>
							<ChevronDownIcon
								className={`size-3.5 transition-transform ${showDetails ? "rotate-180" : ""}`}
							/>
						</button>
						{showDetails && (
							<pre className="mt-2 max-h-56 overflow-auto rounded-lg border border-border/60 bg-muted/40 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
								{details}
							</pre>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

import { ArrowLeftIcon, CompassIcon, HomeIcon } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface NotFoundPageProps {
	title?: string;
	description?: string;
	backTo?: string;
	backLabel?: string;
}

export default function NotFoundPage({
	title = "Page not found",
	description = "The page or resource you are looking for doesn't exist or may have been moved.",
	backTo = "/",
	backLabel = "Back to Dashboard",
}: NotFoundPageProps) {
	const navigate = useNavigate();
	const location = useLocation();

	return (
		<div className="flex min-h-[calc(100vh-3.5rem)] w-full flex-1 flex-col items-center justify-center px-4 py-16 text-center">
			<div className="flex max-w-md flex-col items-center gap-4">
				<div className="relative flex size-14 items-center justify-center rounded-2xl border border-border/60 bg-muted/40 text-muted-foreground shadow-xs">
					<CompassIcon className="size-6 text-primary" />
				</div>

				<Badge
					variant="outline"
					className="font-mono text-[11px] tracking-wider uppercase px-2.5 py-0.5 text-muted-foreground"
				>
					404 Error
				</Badge>

				<div className="space-y-1.5">
					<h1 className="text-2xl font-bold tracking-tight text-foreground">
						{title}
					</h1>
					<p className="text-sm text-muted-foreground leading-relaxed">
						{description}
					</p>
				</div>

				{location.pathname && (
					<code className="rounded-md border border-border/60 bg-muted/40 px-2.5 py-1 font-mono text-xs text-muted-foreground max-w-full truncate">
						{location.pathname}
						{location.search}
					</code>
				)}

				<div className="mt-2 flex flex-wrap items-center justify-center gap-2.5">
					<Button
						variant="outline"
						size="sm"
						onClick={() => navigate(-1)}
						className="gap-1.5 text-xs"
					>
						<ArrowLeftIcon className="size-3.5" />
						Go Back
					</Button>
					<Button
						size="sm"
						onClick={() => navigate(backTo, { replace: true })}
						className="gap-1.5 text-xs"
					>
						<HomeIcon className="size-3.5" />
						{backLabel}
					</Button>
				</div>
			</div>
		</div>
	);
}

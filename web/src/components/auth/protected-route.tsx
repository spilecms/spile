import type * as React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/lib/auth-context";

export function ProtectedRoute({ children }: { children?: React.ReactNode }) {
	const { isAuthenticated, isLoading } = useAuth();

	if (isLoading) {
		return (
			<div className="h-screen w-screen flex flex-col items-center justify-center gap-3 bg-background">
				<Spinner className="size-8 text-primary" />
				<span className="text-xs text-muted-foreground animate-pulse">
					Authenticating workspace…
				</span>
			</div>
		);
	}

	if (!isAuthenticated) {
		return <Navigate to="/login" replace />;
	}

	return children ? children : <Outlet />;
}

import { Outlet } from "react-router-dom";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import {
	HeaderTargetProvider,
	useRegisterHeaderTarget,
} from "./header-actions";
import { SiteHeader } from "./site-header";

export function DashboardShell() {
	const { target, setTarget } = useRegisterHeaderTarget();

	return (
		<HeaderTargetProvider value={target}>
			<SidebarProvider>
				<AppSidebar />
				<SidebarInset>
					<SiteHeader onActionsRef={setTarget} />
					<main className="flex flex-1 flex-col">
						<Outlet />
					</main>
				</SidebarInset>
			</SidebarProvider>
		</HeaderTargetProvider>
	);
}

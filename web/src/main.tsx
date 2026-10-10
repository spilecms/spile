import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createBrowserRouter,
	Navigate,
	RouterProvider,
} from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardShell } from "@/components/dashboard/shell";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { AuthProvider } from "@/lib/auth-context";
import LoginPage from "./pages/auth/login-page";
import AnalyticsPage from "./pages/dashboard/analytics";
import DocsPage from "./pages/dashboard/docs";
import MediaPage from "./pages/dashboard/media";
import MembersPage from "./pages/dashboard/members";
import NewslettersPage from "./pages/dashboard/newsletters";
import Overview from "./pages/dashboard/overview";
import PlaceholderPage from "./pages/dashboard/placeholder";
import PostsPage from "./pages/dashboard/posts";
import SettingsPage from "./pages/dashboard/settings";
import EditorPage from "./pages/editor/editor-page";

import "./i18n/i18n"; // Import the i18n configuration

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 30_000,
			retry: 1,
		},
	},
});

const router = createBrowserRouter([
	{
		path: "/login",
		element: <LoginPage />,
	},
	{
		element: (
			<ProtectedRoute>
				<DashboardShell />
			</ProtectedRoute>
		),
		children: [
			{ index: true, element: <Overview /> },
			{ path: "posts", element: <PostsPage /> },
			{ path: "newsletters", element: <NewslettersPage /> },
			{ path: "members", element: <MembersPage /> },
			{ path: "docs", element: <DocsPage /> },
			{ path: "tags", element: <Navigate to="/settings?tab=tags" replace /> },
			{ path: "media", element: <MediaPage /> },
			{ path: "analytics", element: <AnalyticsPage /> },
			{ path: "team", element: <Navigate to="/settings?tab=team" replace /> },
			{ path: "settings", element: <SettingsPage /> },
			{
				path: "integrations",
				element: <Navigate to="/settings?tab=integrations" replace />,
			},
			{ path: "help", element: <PlaceholderPage /> },
		],
	},
	{
		path: "/editor/new",
		element: (
			<ProtectedRoute>
				<EditorPage />
			</ProtectedRoute>
		),
	},
	{
		path: "/editor/:id",
		element: (
			<ProtectedRoute>
				<EditorPage />
			</ProtectedRoute>
		),
	},
	{
		path: "/editor/doc/:id",
		element: (
			<ProtectedRoute>
				<EditorPage />
			</ProtectedRoute>
		),
	},
	{
		path: "/editor/newsletter/:id",
		element: (
			<ProtectedRoute>
				<EditorPage />
			</ProtectedRoute>
		),
	},
	{ path: "*", element: <Navigate to="/" replace /> },
]);

const rootElement = document.getElementById("root");
if (!rootElement) {
	throw new Error("Root element #root not found");
}

createRoot(rootElement).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<AuthProvider>
				<ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
					<RouterProvider router={router} />
				</ThemeProvider>
			</AuthProvider>
		</QueryClientProvider>
	</StrictMode>,
);

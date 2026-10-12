import { lazy, StrictMode, Suspense } from "react";
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

import "./i18n/i18n"; // Import the i18n configuration

const LoginPage = lazy(() => import("./pages/auth/login-page"));
const AnalyticsPage = lazy(() => import("./pages/dashboard/analytics"));
const DocsPage = lazy(() => import("./pages/dashboard/docs"));
const MediaPage = lazy(() => import("./pages/dashboard/media"));
const MembersPage = lazy(() => import("./pages/dashboard/members"));
const NewslettersPage = lazy(() => import("./pages/dashboard/newsletters"));
const Overview = lazy(() => import("./pages/dashboard/overview"));
const PlaceholderPage = lazy(() => import("./pages/dashboard/placeholder"));
const PostsPage = lazy(() => import("./pages/dashboard/posts"));
const SettingsPage = lazy(() => import("./pages/dashboard/settings"));
const EditorPage = lazy(() => import("./pages/editor/editor-page"));

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
					<Suspense fallback={null}>
						<RouterProvider router={router} />
					</Suspense>
				</ThemeProvider>
			</AuthProvider>
		</QueryClientProvider>
	</StrictMode>,
);

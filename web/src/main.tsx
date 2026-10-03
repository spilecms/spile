import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createBrowserRouter,
	Navigate,
	RouterProvider,
} from "react-router-dom";
import { DashboardShell } from "@/components/dashboard/shell";
import { ThemeProvider } from "@/components/theme/theme-provider";
import Overview from "./pages/dashboard/overview";
import PlaceholderPage from "./pages/dashboard/placeholder";
import PostsPage from "./pages/dashboard/posts";
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
		element: <DashboardShell />,
		children: [
			{ index: true, element: <Overview /> },
			{ path: "posts", element: <PostsPage /> },
			{ path: "tags", element: <PlaceholderPage /> },
			{ path: "media", element: <PlaceholderPage /> },
			{ path: "members", element: <PlaceholderPage /> },
			{ path: "newsletters", element: <PlaceholderPage /> },
			{ path: "analytics", element: <PlaceholderPage /> },
			{ path: "team", element: <PlaceholderPage /> },
			{ path: "settings", element: <PlaceholderPage /> },
			{ path: "integrations", element: <PlaceholderPage /> },
			{ path: "help", element: <PlaceholderPage /> },
		],
	},
	{ path: "/editor/new", element: <EditorPage /> },
	{ path: "/editor/:id", element: <EditorPage /> },
	{ path: "*", element: <Navigate to="/" replace /> },
]);

const rootElement = document.getElementById("root");
if (!rootElement) {
	throw new Error("Root element #root not found");
}

createRoot(rootElement).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
				<RouterProvider router={router} />
			</ThemeProvider>
		</QueryClientProvider>
	</StrictMode>,
);

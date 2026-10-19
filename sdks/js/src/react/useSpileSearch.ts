import { useCallback, useEffect, useRef, useState } from "react";
import type { SpileClient } from "../client.js";
import type { SearchResult } from "../types/index.js";

export interface UseSpileSearchOptions {
	/** Spile API client instance */
	client: SpileClient;
	/** Optional project ID to limit search to documentation project */
	projectId?: string;
	/** Optional locale code */
	locale?: string;
	/** Maximum number of results to return (default: 10) */
	limit?: number;
	/** Debounce wait in milliseconds before firing search query (default: 200) */
	debounceMs?: number;
	/** Enable Cmd+K / Ctrl+K keyboard shortcut to toggle dialog (default: true) */
	shortcut?: boolean;
	/** Initial search query */
	initialQuery?: string;
	/** Initial open dialog state */
	initialOpen?: boolean;
}

export interface UseSpileSearchResult {
	/** Whether the search command dialog is open */
	open: boolean;
	/** Open/close setter */
	setOpen: React.Dispatch<React.SetStateAction<boolean>>;
	/** Current search query string */
	query: string;
	/** Query setter */
	setQuery: React.Dispatch<React.SetStateAction<string>>;
	/** Array of search results */
	results: SearchResult[];
	/** Search loading state */
	isLoading: boolean;
	/** Search error if any */
	error: Error | null;
	/** Imperatively trigger search */
	search: (customQuery?: string) => Promise<void>;
	/** Clear query and results */
	reset: () => void;
}

/**
 * Headless search hook designed for command palettes and shadcn/ui <CommandDialog>.
 * Automatically manages Ctrl+K / Cmd+K listener, debouncing, and search state.
 *
 * @example
 * ```tsx
 * const { open, setOpen, query, setQuery, results, isLoading } = useSpileSearch({
 *   client: spile,
 *   projectId: "doc-123"
 * });
 * ```
 */
export function useSpileSearch(
	options: UseSpileSearchOptions,
): UseSpileSearchResult {
	const {
		client,
		projectId,
		locale,
		limit = 10,
		debounceMs = 200,
		shortcut = true,
		initialQuery = "",
		initialOpen = false,
	} = options;

	const [open, setOpen] = useState<boolean>(initialOpen);
	const [query, setQuery] = useState<string>(initialQuery);
	const [results, setResults] = useState<SearchResult[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<Error | null>(null);

	const activeRequestIdRef = useRef<number>(0);
	const queryRef = useRef<string>(query);
	queryRef.current = query;

	// Keyboard shortcut handler (Cmd+K / Ctrl+K)
	useEffect(() => {
		if (!shortcut || typeof window === "undefined") {
			return;
		}

		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				setOpen((prev) => !prev);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [shortcut]);

	// Execute search query
	const executeSearch = useCallback(
		async (searchQuery?: string) => {
			const targetQuery =
				typeof searchQuery === "string" ? searchQuery : queryRef.current;
			const trimmed = targetQuery.trim();
			if (!trimmed) {
				setResults([]);
				setIsLoading(false);
				setError(null);
				return;
			}

			const requestId = ++activeRequestIdRef.current;
			setIsLoading(true);
			setError(null);

			try {
				const response = await client.search.query({
					q: trimmed,
					projectId,
					locale,
					limit,
				});

				// Discard response if a newer query was fired in the meantime
				if (requestId === activeRequestIdRef.current) {
					setResults(response.results);
					setIsLoading(false);
				}
			} catch (err) {
				if (requestId === activeRequestIdRef.current) {
					setError(
						err instanceof Error
							? err
							: new Error(String(err) || "Failed to execute search"),
					);
					setIsLoading(false);
				}
			}
		},
		[client, projectId, locale, limit],
	);

	// Debounced query execution
	useEffect(() => {
		if (!query.trim()) {
			setResults([]);
			setIsLoading(false);
			setError(null);
			return;
		}

		const timer = setTimeout(() => {
			executeSearch(query);
		}, debounceMs);

		return () => {
			clearTimeout(timer);
		};
	}, [query, debounceMs, executeSearch]);

	const reset = useCallback(() => {
		activeRequestIdRef.current++;
		setQuery("");
		setResults([]);
		setIsLoading(false);
		setError(null);
	}, []);

	return {
		open,
		setOpen,
		query,
		setQuery,
		results,
		isLoading,
		error,
		search: executeSearch,
		reset,
	};
}

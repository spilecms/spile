/**
 * Spile CMS Universal Client
 * Zero external dependencies — powered by native Fetch and Web APIs.
 */

import type {
	ClientSearchIndexResponse,
	DocNavigationManifest,
	DocNavigationOptions,
	DocPage,
	DocPageOptions,
	DocProject,
	DocProjectOptions,
	Member,
	PaginatedResponse,
	PaginationMeta,
	Post,
	PostGetOptions,
	PostListParams,
	RequestOptions,
	SearchQueryOptions,
	SearchResponse,
	SpileConfig,
	SubscribeOptions,
} from "./types/index.js";

export class SpileError extends Error {
	public status: number;
	public statusText: string;
	public data?: unknown;

	constructor(
		message: string,
		status: number,
		statusText: string,
		data?: unknown,
	) {
		super(message);
		this.name = "SpileError";
		this.status = status;
		this.statusText = statusText;
		this.data = data;
	}
}

export class SpileClient {
	private baseUrl: string;
	private apiKey?: string;
	private defaultHeaders: Record<string, string>;
	private customFetch: typeof globalThis.fetch;

	constructor(config: SpileConfig) {
		if (!config.baseUrl) {
			throw new Error("SpileClient requires a 'baseUrl' configuration option.");
		}
		this.baseUrl = config.baseUrl.replace(/\/+$/, "");
		this.apiKey = config.apiKey;
		this.defaultHeaders = config.headers || {};
		this.customFetch = config.fetch || globalThis.fetch;
	}

	/**
	 * Universal fetch helper handling auth headers, URL building, and error parsing.
	 */
	public async request<T>(
		endpoint: string,
		options: RequestOptions = {},
	): Promise<{ data: T; headers: Headers; status: number }> {
		const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
		const url = cleanEndpoint.startsWith("/api/v1")
			? `${this.baseUrl}${cleanEndpoint}`
			: `${this.baseUrl}/api/v1${cleanEndpoint}`;

		const headers = new Headers();
		headers.set("Accept", "application/json");

		if (this.apiKey) {
			headers.set("Authorization", `Bearer ${this.apiKey}`);
		}

		// Apply default headers
		for (const [key, val] of Object.entries(this.defaultHeaders)) {
			headers.set(key, val);
		}

		// Apply call-specific headers
		if (options.headers) {
			const callHeaders = new Headers(options.headers);
			callHeaders.forEach((val, key) => {
				headers.set(key, val);
			});
		}

		const res = await this.customFetch(url, {
			...options,
			headers,
		});

		if (!res.ok) {
			let errorMessage = `HTTP ${res.status}: ${res.statusText}`;
			let errorBody: unknown;
			try {
				errorBody = await res.json();
				if (
					errorBody &&
					typeof errorBody === "object" &&
					"error" in errorBody &&
					typeof (errorBody as { error: unknown }).error === "string"
				) {
					errorMessage = (errorBody as { error: string }).error;
				}
			} catch {
				// Response was not JSON
			}
			throw new SpileError(errorMessage, res.status, res.statusText, errorBody);
		}

		const data = (await res.json()) as T;
		return { data, headers: res.headers, status: res.status };
	}

	// ============================================================================
	// Posts Module
	// ============================================================================
	public posts = {
		/**
		 * List published blog posts with optional filtering and pagination.
		 */
		list: async (
			params: PostListParams = {},
			options: RequestOptions = {},
		): Promise<PaginatedResponse<Post>> => {
			const query = new URLSearchParams();
			if (params.status) query.set("status", params.status);
			if (params.query) query.set("query", params.query);
			if (params.tagId) query.set("tagId", params.tagId);
			if (params.authorId) query.set("authorId", params.authorId);
			if (params.locale) query.set("locale", params.locale);
			if (params.page) query.set("page", String(params.page));
			if (params.limit) query.set("limit", String(params.limit));

			const qs = query.toString();
			const endpoint = qs ? `/posts?${qs}` : "/posts";

			const { data, headers } = await this.request<Post[]>(endpoint, options);

			// Parse pagination metadata from response headers
			const page = Number(headers.get("X-Page")) || params.page || 1;
			const pageSize =
				Number(headers.get("X-Page-Size")) || params.limit || data.length;
			const total = Number(headers.get("X-Total-Count")) || data.length;
			const totalPages =
				Number(headers.get("X-Total-Pages")) ||
				Math.ceil(total / (pageSize || 1));

			const pagination: PaginationMeta = {
				page,
				pageSize,
				total,
				totalPages,
				hasMore: page < totalPages,
			};

			return { data, pagination };
		},

		/**
		 * Get a single post by slug, with optional locale resolution and canonical fallback.
		 */
		getBySlug: async (
			slug: string,
			options: PostGetOptions = {},
		): Promise<Post> => {
			const query = new URLSearchParams();
			if (options.locale) query.set("locale", options.locale);
			const qs = query.toString();
			const endpoint = qs
				? `/posts/${encodeURIComponent(slug)}?${qs}`
				: `/posts/${encodeURIComponent(slug)}`;

			const { data } = await this.request<Post>(endpoint, options);
			return data;
		},

		/**
		 * Get a single post by UUID, with optional locale resolution.
		 */
		getById: async (
			id: string,
			options: PostGetOptions = {},
		): Promise<Post> => {
			return this.posts.getBySlug(id, options);
		},

		/**
		 * Get all language translations for a post's translation group.
		 */
		getTranslations: async (
			groupId: string,
			options: RequestOptions = {},
		): Promise<Post[]> => {
			const { data } = await this.request<Post[]>(
				`/posts/translations/${encodeURIComponent(groupId)}`,
				options,
			);
			return data;
		},
	};

	// ============================================================================
	// Documentation Module
	// ============================================================================
	public docs = {
		/**
		 * List all published documentation projects.
		 */
		listProjects: async (
			options: DocProjectOptions = {},
		): Promise<DocProject[]> => {
			const query = new URLSearchParams();
			if (options.locale) query.set("locale", options.locale);
			const qs = query.toString();
			const endpoint = qs ? `/docs/projects?${qs}` : "/docs/projects";

			const { data } = await this.request<DocProject[]>(endpoint, options);
			return data;
		},

		/**
		 * Get a documentation project by UUID or slug.
		 */
		getProject: async (
			idOrSlug: string,
			options: DocProjectOptions = {},
		): Promise<DocProject> => {
			const query = new URLSearchParams();
			if (options.locale) query.set("locale", options.locale);
			const qs = query.toString();
			const endpoint = qs
				? `/docs/projects/${encodeURIComponent(idOrSlug)}?${qs}`
				: `/docs/projects/${encodeURIComponent(idOrSlug)}`;

			const { data } = await this.request<DocProject>(endpoint, options);
			return data;
		},

		/**
		 * Get the navigation manifest tree for a documentation project.
		 */
		getNavigation: async (
			projectIdOrSlug: string,
			options: DocNavigationOptions = {},
		): Promise<DocNavigationManifest> => {
			const query = new URLSearchParams();
			if (options.locale) query.set("locale", options.locale);
			const qs = query.toString();
			const endpoint = qs
				? `/docs/projects/${encodeURIComponent(projectIdOrSlug)}/navigation?${qs}`
				: `/docs/projects/${encodeURIComponent(projectIdOrSlug)}/navigation`;

			const { data } = await this.request<DocNavigationManifest>(
				endpoint,
				options,
			);
			return data;
		},

		/**
		 * Get a single documentation page by slug or UUID with locale resolution and fallback.
		 */
		getPage: async (
			idOrSlug: string,
			options: DocPageOptions = {},
		): Promise<DocPage> => {
			const query = new URLSearchParams();
			if (options.locale) query.set("locale", options.locale);
			const qs = query.toString();
			const endpoint = qs
				? `/docs/pages/${encodeURIComponent(idOrSlug)}?${qs}`
				: `/docs/pages/${encodeURIComponent(idOrSlug)}`;

			const { data } = await this.request<DocPage>(endpoint, options);
			return data;
		},

		/**
		 * Get the client-side search index for offline/instant doc searching.
		 */
		getSearchIndex: async (
			projectIdOrSlug: string,
			options: RequestOptions = {},
		): Promise<ClientSearchIndexResponse> => {
			const { data } = await this.request<ClientSearchIndexResponse>(
				`/docs/projects/${encodeURIComponent(projectIdOrSlug)}/search-index`,
				options,
			);
			return data;
		},
	};

	// ============================================================================
	// Full-Text Search Module
	// ============================================================================
	public search = {
		/**
		 * Search published articles and doc pages using Spile's SQLite FTS5 engine.
		 */
		query: async (
			queryOptions: SearchQueryOptions,
			options: RequestOptions = {},
		): Promise<SearchResponse> => {
			const query = new URLSearchParams();
			query.set("q", queryOptions.q);
			if (queryOptions.type) query.set("type", queryOptions.type);
			if (queryOptions.projectId)
				query.set("projectId", queryOptions.projectId);
			if (queryOptions.locale) query.set("locale", queryOptions.locale);
			if (queryOptions.limit) query.set("limit", String(queryOptions.limit));

			const { data } = await this.request<SearchResponse>(
				`/search?${query.toString()}`,
				options,
			);
			return data;
		},
	};

	// ============================================================================
	// Members & Newsletter Module
	// ============================================================================
	public members = {
		/**
		 * Subscribe a new member/reader to the newsletter.
		 */
		subscribe: async (
			data: SubscribeOptions,
			options: RequestOptions = {},
		): Promise<Member> => {
			const { data: member } = await this.request<Member>("/members", {
				...options,
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(options.headers || {}),
				},
				body: JSON.stringify(data),
			});
			return member;
		},
	};

	// ============================================================================
	// Telemetry & Analytics Module
	// ============================================================================
	public analytics = {
		/**
		 * Track a headless pageview or doc visit.
		 */
		track: async (
			data: {
				path: string;
				referrer?: string;
				entityType?: string;
				entityId?: string;
			},
			options: RequestOptions = {},
		): Promise<{ status: string }> => {
			const { data: res } = await this.request<{ status: string }>(
				"/analytics/track",
				{
					...options,
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						...(options.headers || {}),
					},
					body: JSON.stringify(data),
				},
			);
			return res;
		},
	};
}

/**
 * Creates and initializes a new Spile CMS client.
 *
 * @example
 * ```ts
 * import { createSpileClient } from "@spilecms/sdk";
 *
 * export const spile = createSpileClient({
 *   baseUrl: process.env.SPILE_URL!,
 *   apiKey: process.env.SPILE_API_KEY,
 * });
 * ```
 */
export function createSpileClient(config: SpileConfig): SpileClient {
	return new SpileClient(config);
}

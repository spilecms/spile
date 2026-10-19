/**
 * Spile CMS TypeScript Domain & API Types
 */

// --- Base & Client Types ---

export interface SpileConfig {
	/**
	 * Base URL of your Spile CMS instance (e.g. "https://cms.mycompany.com" or "http://localhost:8080")
	 */
	baseUrl: string;
	/**
	 * Public Read-Only API token (e.g. "pk_live_...") or Admin session token
	 */
	apiKey?: string;
	/**
	 * Optional default request headers
	 */
	headers?: Record<string, string>;
	/**
	 * Custom fetch function (defaults to globalThis.fetch)
	 */
	fetch?: typeof globalThis.fetch;
}

export interface RequestOptions extends RequestInit {
	/**
	 * Next.js App Router cache & revalidation options
	 */
	next?: {
		revalidate?: number | false;
		tags?: string[];
	};
}

export interface PaginationMeta {
	page: number;
	pageSize: number;
	total: number;
	totalPages: number;
	hasMore: boolean;
}

export interface PaginatedResponse<T> {
	data: T[];
	pagination: PaginationMeta;
}

// --- BlockNote Content Types ---

export interface BlockNoteInlineContent {
	type: "text" | "link";
	text?: string;
	href?: string;
	styles?: {
		bold?: boolean;
		italic?: boolean;
		underline?: boolean;
		strike?: boolean;
		code?: boolean;
		textColor?: string;
		backgroundColor?: string;
		[key: string]: unknown;
	};
}

export interface BlockNoteBlock<P = Record<string, unknown>> {
	id: string;
	type: string;
	props?: P;
	content?: BlockNoteInlineContent[];
	children?: BlockNoteBlock[];
}

// Custom block prop helpers
export interface CalloutBlockProps {
	type?: "tip" | "warning" | "info" | "danger" | "note";
	title?: string;
	[key: string]: unknown;
}

export interface CodeBlockProps {
	language?: string;
	code?: string;
	[key: string]: unknown;
}

export interface MathBlockProps {
	latex?: string;
	[key: string]: unknown;
}

// --- Taxonomy & Locale Types ---

export interface WorkspaceLocale {
	code: string;
	name: string;
	flag?: string;
	direction?: "ltr" | "rtl";
	isDefault?: boolean;
}

export interface Tag {
	id: string;
	name: string;
	slug: string;
	color: string;
	postCount: number;
}

// --- Post & Article Types ---

export type PostStatus = "draft" | "published" | "scheduled" | "trashed";

export interface PostSEO {
	metaTitle?: string;
	metaDescription?: string;
}

export interface UserSummary {
	id: string;
	name: string;
	email: string;
	avatar?: string;
	role?: string;
}

export interface Post {
	id: string;
	type: string;
	title: string;
	excerpt: string;
	status: PostStatus;
	slug: string;
	featuredImage?: string;
	seo: PostSEO;
	views: number;
	readingTime: number;
	authorIds: string[];
	authors?: UserSummary[];
	tagIds: string[];
	tags?: Tag[];
	locale: string;
	isDefaultLocale: boolean;
	translationGroupId: string;
	translationSourceId?: string | null;
	publishedAt: number | null;
	scheduledFor: number | null;
	createdAt: number;
	updatedAt: number;
	content: BlockNoteBlock[];
}

export interface PostListParams {
	status?: PostStatus | "all";
	query?: string;
	tagId?: string;
	authorId?: string;
	locale?: string;
	page?: number;
	limit?: number;
}

export interface PostGetOptions extends RequestOptions {
	locale?: string;
}

// --- Documentation Types ---

export interface DocTreeItem {
	id: string;
	canonicalId?: string;
	parentId?: string | null;
	pageId?: string;
	title: string;
	slug: string;
	icon?: string;
	status?: string;
	locale?: string;
	order?: number;
	children?: DocTreeItem[];
}

export interface DocNavigationManifest {
	id: string;
	locale: string;
	items: DocTreeItem[];
	updatedAt: number;
}

export interface DocProject {
	id: string;
	title: string;
	description?: string;
	slug: string;
	status: string;
	pagesCount: number;
	createdAt: number;
	updatedAt: number;
	navigation: DocNavigationManifest;
}

export interface DocPage {
	id: string;
	projectId: string;
	parentId?: string | null;
	title: string;
	slug: string;
	icon?: string;
	status: string;
	locale: string;
	isDefaultLocale: boolean;
	translationGroupId: string;
	translationSourceId?: string | null;
	content: BlockNoteBlock[];
	createdAt: number;
	updatedAt: number;
}

export interface DocProjectOptions extends RequestOptions {
	locale?: string;
}

export interface DocNavigationOptions extends RequestOptions {
	locale?: string;
}

export interface DocPageOptions extends RequestOptions {
	locale?: string;
}

// --- Search Types ---

export interface MatchRange {
	start: number;
	end: number;
}

export interface SearchResult {
	entityId: string;
	entityType: "doc" | "post";
	projectId?: string;
	pageId?: string;
	title: string;
	slug: string;
	sectionTitle?: string;
	sectionAnchor?: string;
	contentSnippet: string;
	locale: string;
	matchRanges?: {
		title?: MatchRange[];
		snippet?: MatchRange[];
	};
}

export interface SearchResponse {
	query: string;
	total: number;
	results: SearchResult[];
}

export interface SearchQueryOptions {
	q: string;
	type?: "all" | "docs" | "posts";
	projectId?: string;
	locale?: string;
	limit?: number;
}

export interface ClientSearchIndexItem {
	id: string;
	projectId?: string;
	pageId?: string;
	entityType: string;
	title: string;
	sectionTitle?: string;
	anchor?: string;
	slug: string;
	content: string;
	locale: string;
}

export interface ClientSearchIndexResponse {
	projectId: string;
	locale: string;
	items: ClientSearchIndexItem[];
	updatedAt: number;
}

// --- Members & Newsletters Types ---

export type MemberStatus =
	| "active"
	| "unconfirmed"
	| "unsubscribed"
	| "bounced";

export interface Member {
	id: string;
	email: string;
	name?: string;
	status: MemberStatus;
	locale: string;
	subscribedAt: number;
}

export interface SubscribeOptions {
	email: string;
	name?: string;
	locale?: string;
}

// --- Webhook Types ---

export type WebhookEvent =
	| "post.created"
	| "post.updated"
	| "post.published"
	| "post.deleted"
	| "doc.created"
	| "doc.updated"
	| "doc.published"
	| "doc.deleted";

export interface WebhookPayload<T = unknown> {
	id: string;
	event: WebhookEvent;
	createdAt: number;
	data: T;
}

export interface VerifyWebhookOptions {
	/**
	 * The raw body string from the HTTP request
	 */
	payload: string;
	/**
	 * The value of the `x-spile-signature` or `x-hub-signature-256` header
	 */
	signature: string | null;
	/**
	 * Your webhook secret key configured in Spile CMS
	 */
	secret: string;
	/**
	 * Maximum allowed age of the webhook request in seconds (default: 300 / 5 minutes)
	 */
	toleranceSeconds?: number;
}

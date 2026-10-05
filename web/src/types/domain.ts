import type { OutputData } from "@editorjs/editorjs";

export type PostStatus = "draft" | "published" | "scheduled" | "trashed";

export type PostType = "post";

export type UserRole = "owner" | "admin" | "editor" | "author";

export interface User {
	id: string;
	name: string;
	email: string;
	avatar: string;
	role: UserRole;
}

export interface Tag {
	id: string;
	name: string;
	slug: string;
	color: string;
	postCount: number;
}

export interface PostSeo {
	metaTitle?: string;
	metaDescription?: string;
}

export interface WorkspaceLocale {
	code: string;
	name: string;
	flag: string;
	direction?: "ltr" | "rtl";
	isDefault?: boolean;
}

export interface Post {
	id: string;
	type?: PostType;
	title: string;
	excerpt: string;
	status: PostStatus;
	authorIds: string[];
	tagIds: string[];
	slug: string;
	featuredImage?: string;
	seo: PostSeo;
	views: number;
	readingTime: number;
	createdAt: number;
	updatedAt: number;
	publishedAt: number | null;
	scheduledFor: number | null;
	content: OutputData | null;
	locale?: string;
	isDefaultLocale?: boolean;
	translationGroupId?: string;
	translationSourceId?: string;
}

export type PostPatch = Partial<Omit<Post, "id" | "createdAt" | "updatedAt">>;

export type PostListParams = {
	status?: PostStatus | "all";
	query?: string;
	tagId?: string;
	authorId?: string;
};

// --- Members (Subscribers) ---
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
	subscribedAt: number;
	openRate?: number;
	locale?: string;
}

export type MemberPatch = Partial<Omit<Member, "id" | "subscribedAt">>;

export type MemberListParams = {
	status?: MemberStatus | "all";
	query?: string;
};

// --- Newsletters (Broadcasts) ---
export type NewsletterStatus = "draft" | "scheduled" | "sending" | "sent";

export interface Newsletter {
	id: string;
	title: string; // Internal campaign name
	subject: string; // Email inbox subject
	previewText?: string; // Preheader snippet
	content: OutputData | null; // Editor.js blocks
	status: NewsletterStatus;
	senderName?: string;
	senderEmail?: string;
	recipientsCount: number;
	deliveredCount: number;
	openedCount: number;
	clickedCount: number;
	scheduledFor: number | null;
	sentAt: number | null;
	createdAt: number;
	updatedAt: number;
}

export type NewsletterPatch = Partial<
	Omit<Newsletter, "id" | "createdAt" | "updatedAt">
>;

export type NewsletterListParams = {
	status?: NewsletterStatus | "all";
	query?: string;
};

// --- Analytics & Activity ---
export interface ActivityItem {
	id: string;
	type: "published" | "created" | "updated" | "scheduled" | "member";
	text: string;
	at: number;
}

export interface OverviewStats {
	totalViews: number;
	viewsTrend: number;
	published: number;
	drafts: number;
	members: number;
	membersTrend: number;
	avgReadTime: number;
}

export interface ViewsPoint {
	date: string;
	views: number;
	visitors: number;
}

export type ViewsRange = "7d" | "30d" | "90d";

// --- Documentation System (Notion-Style Recursive Docs) ---
export type DocPageStatus = "draft" | "published";

export interface DocPage {
	id: string;
	projectId?: string;
	parentId?: string | null;
	translationGroupId?: string;
	translationSourceId?: string | null;
	locale: string;
	isDefaultLocale?: boolean;
	title: string;
	slug: string;
	icon?: string;
	status: DocPageStatus;
	content: OutputData | null;
	createdAt: number;
	updatedAt: number;
}

export type DocPagePatch = Partial<
	Omit<DocPage, "id" | "createdAt" | "updatedAt">
>;

export interface DocTreeItem {
	id: string;
	parentId?: string | null;
	translationGroupId?: string;
	locale?: string;
	title?: string;
	slug?: string;
	icon?: string;
	status?: DocPageStatus;
	children?: DocTreeItem[];
}

export interface DocNavigationManifest {
	id: string;
	locale: string;
	items: DocTreeItem[];
	updatedAt: number;
}

export interface DocumentationProject {
	id: string;
	title: string;
	description?: string;
	slug: string;
	status: DocPageStatus;
	pagesCount: number;
	createdAt: number;
	updatedAt: number;
	navigation: DocNavigationManifest;
}

export type DocumentationProjectPatch = Partial<
	Omit<DocumentationProject, "id" | "createdAt" | "updatedAt">
>;

// --- Settings & Integrations ---
export type StorageProviderType = "r2" | "s3" | "minio" | "local";

export interface StorageSettings {
	provider: StorageProviderType;
	bucket: string;
	endpoint?: string;
	region?: string;
	accessKey?: string;
	secretKey?: string;
	publicUrl: string;
}

export type EmailProviderType = "resend" | "ses" | "postmark" | "smtp";

export interface EmailSettings {
	fromName: string;
	fromEmail: string;
	replyTo: string;
	provider: EmailProviderType;
	apiKey?: string;
	region?: string;
	smtpHost?: string;
	smtpPort?: number;
	smtpUser?: string;
	smtpPassword?: string;
	smtpSecure?: boolean;
}

export type AiProviderType = "gemini" | "openai";

export interface AiSettings {
	provider: AiProviderType;
	apiKey: string;
	model: string;
	enableTranslations: boolean;
	enableSummaries: boolean;
	enableWritingAssistant: boolean;
}

export interface ApiKey {
	id: string;
	name: string;
	prefix: string;
	type: "public_read" | "admin_secret";
	createdAt: number;
	lastUsedAt: number | null;
}

export interface Webhook {
	id: string;
	name: string;
	url: string;
	events: string[];
	active: boolean;
	createdAt: number;
}

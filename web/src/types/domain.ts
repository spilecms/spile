import type { OutputData } from "@editorjs/editorjs";

export type PostStatus = "draft" | "published" | "scheduled" | "trashed";

export type PostType = "post" | "page" | "doc";

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

export interface PostDistribution {
	web: boolean;
	newsletter: boolean;
	newsletterSentAt?: number | null;
}

export interface Post {
	id: string;
	type: PostType;
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
	distribution?: PostDistribution;
}

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

export type PostListParams = {
	status?: PostStatus | "all";
	query?: string;
	tagId?: string;
	authorId?: string;
	type?: PostType;
	channel?: "all" | "web" | "newsletter";
};

export type PostPatch = Partial<Omit<Post, "id" | "createdAt" | "updatedAt">>;

export type DocPageStatus = "draft" | "published";

export interface DocPage {
	id: string;
	title: string;
	slug: string;
	status: DocPageStatus;
	content: OutputData | null;
	locale: string;
	createdAt: number;
	updatedAt: number;
}

export type DocPagePatch = Partial<
	Omit<DocPage, "id" | "createdAt" | "updatedAt">
>;

export interface DocTreeItem {
	id: string;
	title?: string;
	slug?: string;
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

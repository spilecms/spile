import type { OutputData } from "@editorjs/editorjs";

export type PostStatus = "draft" | "published" | "scheduled" | "trashed";

export type PostType = "post" | "page";

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
};

export type PostPatch = Partial<Omit<Post, "id" | "createdAt" | "updatedAt">>;

import type {
	ActivityItem,
	OverviewStats,
	Post,
	PostListParams,
	PostPatch,
	User,
	ViewsPoint,
	ViewsRange,
	WorkspaceLocale,
} from "@/types/domain";
import {
	currentUser,
	activity as seedActivity,
	posts as seedPosts,
	stats as seedStats,
	tags as seedTags,
	users as seedUsers,
	viewsSeries,
	workspaceLocales,
} from "./db";

const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));

let posts: Post[] = [...seedPosts];
let nextId = posts.length + 1;

function matches(post: Post, params: PostListParams): boolean {
	if (params.type && post.type !== params.type) return false;
	if (
		params.status &&
		params.status !== "all" &&
		post.status !== params.status
	) {
		return false;
	}
	if (params.tagId && !post.tagIds.includes(params.tagId)) return false;
	if (params.authorId && !post.authorIds.includes(params.authorId))
		return false;
	if (params.query) {
		const q = params.query.toLowerCase();
		const haystack = `${post.title} ${post.excerpt}`.toLowerCase();
		if (!haystack.includes(q)) return false;
	}
	return true;
}

export const mockApi = {
	posts: {
		async list(params: PostListParams = {}): Promise<Post[]> {
			await delay();
			return posts
				.filter((post) => matches(post, params))
				.sort((a, b) => b.updatedAt - a.updatedAt);
		},
		async get(id: string): Promise<Post> {
			await delay();
			const post = posts.find((p) => p.id === id);
			if (!post) throw new Error(`Post ${id} not found`);
			return { ...post };
		},
		async create(input: Partial<Post> = {}): Promise<Post> {
			await delay();
			const now = Date.now();
			const id = input.id ?? `p${nextId++}`;
			const locale = input.locale ?? "en";
			const post: Post = {
				id,
				type: input.type ?? "post",
				title: input.title ?? "Untitled",
				excerpt: input.excerpt ?? "",
				status: input.status ?? "draft",
				authorIds: input.authorIds ?? [currentUser.id],
				tagIds: input.tagIds ?? [],
				slug: input.slug ?? "untitled",
				featuredImage: input.featuredImage,
				seo: input.seo ?? {},
				views: 0,
				readingTime: input.readingTime ?? 1,
				createdAt: now,
				updatedAt: now,
				publishedAt: input.status === "published" ? now : null,
				scheduledFor: input.scheduledFor ?? null,
				content: input.content ?? { blocks: [] },
				locale,
				isDefaultLocale: input.isDefaultLocale ?? locale === "en",
				translationGroupId: input.translationGroupId ?? id,
				translationSourceId: input.translationSourceId,
			};
			posts = [post, ...posts];
			return { ...post };
		},
		async update(id: string, patch: PostPatch): Promise<Post> {
			await delay();
			const index = posts.findIndex((p) => p.id === id);
			if (index === -1) throw new Error(`Post ${id} not found`);
			const current = posts[index];
			const nextStatus = patch.status ?? current.status;
			const next: Post = {
				...current,
				...patch,
				id: current.id,
				createdAt: current.createdAt,
				updatedAt: Date.now(),
				publishedAt:
					nextStatus === "published"
						? (current.publishedAt ?? Date.now())
						: null,
			};
			posts = posts.map((p, i) => (i === index ? next : p));
			return { ...next };
		},
		async remove(id: string): Promise<void> {
			await delay();
			posts = posts.filter((p) => p.id !== id);
		},
		async duplicate(id: string): Promise<Post> {
			const source = await mockApi.posts.get(id);
			return mockApi.posts.create({
				...source,
				id: undefined,
				title: `${source.title} (copy)`,
				status: "draft",
				views: 0,
			});
		},
		async getTranslations(translationGroupId: string): Promise<Post[]> {
			await delay(80);
			return posts.filter(
				(p) => (p.translationGroupId || p.id) === translationGroupId,
			);
		},
		async createTranslation(
			sourcePostId: string,
			targetLocale: string,
			copyContent = true,
		): Promise<Post> {
			await delay();
			const source = await mockApi.posts.get(sourcePostId);
			const translationGroupId = source.translationGroupId || source.id;

			const existing = posts.find(
				(p) =>
					(p.translationGroupId || p.id) === translationGroupId &&
					p.locale === targetLocale,
			);
			if (existing) return { ...existing };

			const targetLocaleObj = workspaceLocales.find(
				(l) => l.code === targetLocale,
			);
			const targetName = targetLocaleObj
				? targetLocaleObj.name
				: targetLocale.toUpperCase();

			const cleanSlug = source.slug.replace(/^[a-z]{2}\//, "");
			const newTranslation = await mockApi.posts.create({
				type: source.type,
				title: copyContent ? `${source.title} (${targetName})` : "Untitled",
				excerpt: copyContent ? source.excerpt : "",
				status: "draft",
				authorIds: [currentUser.id],
				tagIds: [...source.tagIds],
				slug: `${targetLocale}/${cleanSlug}`,
				featuredImage: source.featuredImage,
				seo: copyContent ? { ...source.seo } : {},
				content: copyContent
					? JSON.parse(JSON.stringify(source.content ?? { blocks: [] }))
					: { blocks: [] },
				locale: targetLocale,
				isDefaultLocale: false,
				translationGroupId,
				translationSourceId: source.id,
			});
			return newTranslation;
		},
	},
	locales: {
		async list(): Promise<WorkspaceLocale[]> {
			await delay(50);
			return [...workspaceLocales];
		},
	},
	overview: {
		async stats(): Promise<OverviewStats> {
			await delay();
			return { ...seedStats };
		},
		async views(range: ViewsRange = "30d"): Promise<ViewsPoint[]> {
			await delay();
			return viewsSeries[range];
		},
		async activity(): Promise<ActivityItem[]> {
			await delay();
			return [...seedActivity];
		},
	},
	users: {
		async current(): Promise<User> {
			await delay(50);
			return { ...currentUser };
		},
		async list(): Promise<User[]> {
			await delay(50);
			return seedUsers.map((user) => ({ ...user }));
		},
	},
	tags: {
		async list() {
			await delay(50);
			return seedTags.map((tag) => ({ ...tag }));
		},
	},
};

import type {
	ActivityItem,
	OverviewStats,
	Post,
	PostListParams,
	PostPatch,
	User,
	ViewsPoint,
	ViewsRange,
} from "@/types/domain";
import {
	currentUser,
	activity as seedActivity,
	posts as seedPosts,
	stats as seedStats,
	tags as seedTags,
	users as seedUsers,
	viewsSeries,
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
			const post: Post = {
				id: `p${nextId++}`,
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
				title: `${source.title} (copy)`,
				status: "draft",
				views: 0,
			});
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

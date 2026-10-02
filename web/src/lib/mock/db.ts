import type {
	ActivityItem,
	Post,
	Tag,
	User,
	ViewsPoint,
	ViewsRange,
	WorkspaceLocale,
} from "@/types/domain";

export const workspaceLocales: WorkspaceLocale[] = [
	{
		code: "en",
		name: "English",
		flag: "🇺🇸",
		isDefault: true,
		direction: "ltr",
	},
	{
		code: "es",
		name: "Spanish",
		flag: "🇪🇸",
		isDefault: false,
		direction: "ltr",
	},
	{
		code: "fr",
		name: "French",
		flag: "🇫🇷",
		isDefault: false,
		direction: "ltr",
	},
	{
		code: "de",
		name: "German",
		flag: "🇩🇪",
		isDefault: false,
		direction: "ltr",
	},
	{
		code: "ja",
		name: "Japanese",
		flag: "🇯🇵",
		isDefault: false,
		direction: "ltr",
	},
	{
		code: "am",
		name: "Amharic",
		flag: "🇪🇹",
		isDefault: false,
		direction: "ltr",
	},
];

const DAY = 24 * 60 * 60 * 1000;

const now = Date.now();
const day = (n: number) => now - n * DAY;

function mulberry32(seed: number) {
	let state = seed;
	return () => {
		state += 0x6d2b79f5;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export const users: User[] = [
	{
		id: "u1",
		name: "Mara Lindqvist",
		email: "mara@spile.dev",
		avatar: "",
		role: "owner",
	},
	{
		id: "u2",
		name: "Jonas Okafor",
		email: "jonas@spile.dev",
		avatar: "",
		role: "admin",
	},
	{
		id: "u3",
		name: "Priya Raman",
		email: "priya@spile.dev",
		avatar: "",
		role: "editor",
	},
	{
		id: "u4",
		name: "Diego Alvarez",
		email: "diego@spile.dev",
		avatar: "",
		role: "author",
	},
];

export const currentUser = users[0];

export const tags: Tag[] = [
	{
		id: "t1",
		name: "Engineering",
		slug: "engineering",
		color: "#3b82f6",
		postCount: 6,
	},
	{
		id: "t2",
		name: "Product",
		slug: "product",
		color: "#8b5cf6",
		postCount: 4,
	},
	{ id: "t3", name: "Design", slug: "design", color: "#ec4899", postCount: 3 },
	{
		id: "t4",
		name: "Tutorials",
		slug: "tutorials",
		color: "#10b981",
		postCount: 5,
	},
	{
		id: "t5",
		name: "Changelog",
		slug: "changelog",
		color: "#f59e0b",
		postCount: 3,
	},
	{
		id: "t6",
		name: "Community",
		slug: "community",
		color: "#06b6d4",
		postCount: 2,
	},
];

function blocks(paragraphs: string[]) {
	return {
		blocks: paragraphs.map((text) => ({
			id: Math.random().toString(36).slice(2, 10),
			type: "paragraph",
			data: { text },
		})),
	};
}

interface PostSeed {
	title: string;
	excerpt: string;
	status: Post["status"];
	authorIds: string[];
	tagIds: string[];
	views: number;
	readingTime: number;
	updatedDaysAgo: number;
	publishedDaysAgo?: number;
	scheduledInDays?: number;
	type?: Post["type"];
	featuredImage?: string;
}

const postSeeds: PostSeed[] = [
	{
		title: "Designing Spile's block editor: what we learned shipping Editor.js",
		excerpt:
			"A deep dive into custom tools, autosave, and the trade-offs behind our writing experience.",
		status: "published",
		authorIds: ["u1", "u3"],
		tagIds: ["t1", "t3"],
		views: 12840,
		readingTime: 9,
		updatedDaysAgo: 1,
		publishedDaysAgo: 2,
	},
	{
		title: "Introducing webhooks: automate everything around your content",
		excerpt:
			"Trigger workflows on publish, member signup, and more with signed webhook deliveries.",
		status: "published",
		authorIds: ["u2"],
		tagIds: ["t5", "t1"],
		views: 8320,
		readingTime: 6,
		updatedDaysAgo: 3,
		publishedDaysAgo: 3,
	},
	{
		title: "How to build a newsletter workflow that doesn't wake you up at 3am",
		excerpt:
			"Scheduling, segmentation, and retries: the anatomy of reliable newsletter delivery.",
		status: "published",
		authorIds: ["u3"],
		tagIds: ["t2", "t4"],
		views: 6210,
		readingTime: 7,
		updatedDaysAgo: 5,
		publishedDaysAgo: 5,
	},
	{
		title: "The case for self-hosting your publishing platform",
		excerpt:
			"Ownership, portability, and why teams are moving content back to infrastructure they control.",
		status: "published",
		authorIds: ["u1"],
		tagIds: ["t2"],
		views: 9450,
		readingTime: 8,
		updatedDaysAgo: 8,
		publishedDaysAgo: 8,
	},
	{
		title: "KaTeX in the editor: math that actually survives copy-paste",
		excerpt:
			"Shadow DOM, sanitization, and the nitty-grirty of inline formulas in a block editor.",
		status: "published",
		authorIds: ["u4"],
		tagIds: ["t1", "t4"],
		views: 4120,
		readingTime: 5,
		updatedDaysAgo: 12,
		publishedDaysAgo: 12,
	},
	{
		title: "Spile 0.4 release notes",
		excerpt: "Media tool rewrite, table of contents block, and 30+ bug fixes.",
		status: "published",
		authorIds: ["u2"],
		tagIds: ["t5"],
		views: 3890,
		readingTime: 3,
		updatedDaysAgo: 15,
		publishedDaysAgo: 15,
	},
	{
		title: "Content modeling for documentation sites",
		excerpt:
			"Collections, internal tags, and how to structure docs so readers actually find them.",
		status: "published",
		authorIds: ["u3", "u4"],
		tagIds: ["t4", "t2"],
		views: 5230,
		readingTime: 10,
		updatedDaysAgo: 20,
		publishedDaysAgo: 20,
	},
	{
		title: "Migrating from a traditional CMS without losing your mind",
		excerpt:
			"A practical checklist for exports, redirects, SEO parity, and editorial handover.",
		status: "published",
		authorIds: ["u1", "u2"],
		tagIds: ["t4"],
		views: 7680,
		readingTime: 11,
		updatedDaysAgo: 27,
		publishedDaysAgo: 27,
	},
	{
		title: "Community spotlight: how Acme Docs runs on Spile",
		excerpt:
			"An interview with the team behind one of the fastest-growing documentation hubs.",
		status: "published",
		authorIds: ["u4"],
		tagIds: ["t6"],
		views: 2140,
		readingTime: 6,
		updatedDaysAgo: 34,
		publishedDaysAgo: 34,
	},
	{
		title: "Analytics that respect your readers",
		excerpt:
			"Cookieless measurement, aggregate trends, and what we deliberately leave out.",
		status: "published",
		authorIds: ["u2", "u3"],
		tagIds: ["t2", "t6"],
		views: 6890,
		readingTime: 7,
		updatedDaysAgo: 41,
		publishedDaysAgo: 41,
	},
	{
		title: "Draft: Extending Spile with custom editor tools",
		excerpt:
			"Work-in-progress guide to the block tool API, paste configs, and sanitization.",
		status: "draft",
		authorIds: ["u1"],
		tagIds: ["t1", "t4"],
		views: 0,
		readingTime: 8,
		updatedDaysAgo: 0,
	},
	{
		title: "Draft: Onboarding flow redesign",
		excerpt:
			"Notes on the new setup wizard: fewer steps, better defaults, and a faster first publish.",
		status: "draft",
		authorIds: ["u3"],
		tagIds: ["t3", "t2"],
		views: 0,
		readingTime: 4,
		updatedDaysAgo: 2,
	},
	{
		title: "Draft: Why we chose Go for the backend",
		excerpt:
			"Single binary deploys, boring concurrency, and the performance budget behind the API.",
		status: "draft",
		authorIds: ["u2"],
		tagIds: ["t1"],
		views: 0,
		readingTime: 6,
		updatedDaysAgo: 4,
	},
	{
		title: "Roadmap: what's next for Spile in 2026",
		excerpt:
			"Themes marketplace, multi-site, and the plugin API — what we're building next.",
		status: "scheduled",
		authorIds: ["u1"],
		tagIds: ["t2", "t5"],
		views: 0,
		readingTime: 5,
		updatedDaysAgo: 1,
		scheduledInDays: 2,
	},
	{
		title: "Scheduled: Spring community AMA recap",
		excerpt:
			"Answers to the most upvoted questions from the community AMA session.",
		status: "scheduled",
		authorIds: ["u4"],
		tagIds: ["t6"],
		views: 0,
		readingTime: 4,
		updatedDaysAgo: 3,
		scheduledInDays: 6,
	},
	{
		title: "Deprecated: legacy theme configuration",
		excerpt:
			"Removed after the theme engine rewrite. Kept here for reference until migration is done.",
		status: "trashed",
		authorIds: ["u2"],
		tagIds: ["t5"],
		views: 0,
		readingTime: 3,
		updatedDaysAgo: 10,
	},
	{
		title: "About",
		excerpt: "What Spile is, who builds it, and why it exists.",
		status: "published",
		authorIds: ["u1"],
		tagIds: [],
		views: 15200,
		readingTime: 2,
		updatedDaysAgo: 30,
		publishedDaysAgo: 30,
		type: "page",
	},
	{
		title: "Contact",
		excerpt: "Get in touch with the team for support, partnerships, or press.",
		status: "published",
		authorIds: ["u1"],
		tagIds: [],
		views: 4300,
		readingTime: 1,
		updatedDaysAgo: 30,
		publishedDaysAgo: 30,
		type: "page",
	},
	{
		title: "Careers",
		excerpt: "Open roles and what it's like to work on Spile.",
		status: "draft",
		authorIds: ["u3"],
		tagIds: [],
		views: 0,
		readingTime: 2,
		updatedDaysAgo: 6,
		type: "page",
	},
];

export const posts: Post[] = postSeeds.map((seed, index) => {
	const updatedAt = day(seed.updatedDaysAgo);
	const publishedAt =
		seed.publishedDaysAgo !== undefined ? day(seed.publishedDaysAgo) : null;
	const scheduledFor =
		seed.scheduledInDays !== undefined
			? now + seed.scheduledInDays * DAY
			: null;
	const id = `p${index + 1}`;
	return {
		id,
		type: seed.type ?? "post",
		title: seed.title,
		excerpt: seed.excerpt,
		status: seed.status,
		authorIds: seed.authorIds,
		tagIds: seed.tagIds,
		slug: seed.title
			.toLowerCase()
			.replace(/[^\w\s-]/g, "")
			.replace(/\s+/g, "-")
			.slice(0, 60),
		seo: {
			metaTitle: seed.title,
			metaDescription: seed.excerpt,
		},
		views: seed.views,
		readingTime: seed.readingTime,
		createdAt: day(seed.updatedDaysAgo + 3),
		updatedAt,
		publishedAt,
		scheduledFor,
		content: blocks([seed.excerpt, "This is mock content for the editor."]),
		locale: "en",
		isDefaultLocale: true,
		translationGroupId: id,
	};
});

// Sample Spanish translation for the first post to showcase the feature immediately
posts.push({
	...posts[0],
	id: "p1-es",
	title:
		"Diseñando el editor de bloques de Spile: lo que aprendimos con Editor.js",
	excerpt:
		"Una inmersión profunda en herramientas personalizadas, autoguardado y la experiencia de escritura.",
	slug: "es/disenando-editor-de-bloques",
	status: "draft",
	locale: "es",
	isDefaultLocale: false,
	translationGroupId: "p1",
	translationSourceId: "p1",
	content: blocks([
		"Una inmersión profunda en herramientas personalizadas, autoguardado y la experiencia de escritura.",
		"Este es contenido de prueba en español para el editor de Spile.",
	]),
	updatedAt: day(1),
	publishedAt: null,
});

export const activity: ActivityItem[] = [
	{
		id: "a1",
		type: "published",
		text: "“Designing Spile's block editor” was published",
		at: day(2),
	},
	{
		id: "a2",
		type: "member",
		text: "12 new members subscribed this week",
		at: day(2),
	},
	{
		id: "a3",
		type: "updated",
		text: "“Introducing webhooks” was updated by Jonas",
		at: day(3),
	},
	{
		id: "a4",
		type: "scheduled",
		text: "“Roadmap: what's next for Spile in 2026” was scheduled",
		at: day(1),
	},
	{
		id: "a5",
		type: "created",
		text: "Priya created draft “Onboarding flow redesign”",
		at: day(2),
	},
	{
		id: "a6",
		type: "published",
		text: "“How to build a newsletter workflow” was published",
		at: day(5),
	},
];

export const viewsSeries: Record<ViewsRange, ViewsPoint[]> = (() => {
	const ranges: ViewsRange[] = ["7d", "30d", "90d"];
	const out = {} as Record<ViewsRange, ViewsPoint[]>;
	for (const range of ranges) {
		const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
		const rand = mulberry32(days * 991);
		const points: ViewsPoint[] = [];
		for (let i = days - 1; i >= 0; i--) {
			const date = new Date(day(i));
			const wave = 1 + 0.35 * Math.sin((days - i) / 6);
			const baseline = 900 + days * 6;
			const views = Math.round((baseline * wave + rand() * 420) * 10) / 10;
			points.push({
				date: date.toISOString().slice(0, 10),
				views: Math.round(views),
				visitors: Math.round(views * (0.55 + rand() * 0.15)),
			});
		}
		out[range] = points;
	}
	return out;
})();

export const stats = {
	totalViews: 82160,
	viewsTrend: 12.4,
	published: posts.filter((p) => p.type === "post" && p.status === "published")
		.length,
	drafts: posts.filter((p) => p.type === "post" && p.status === "draft").length,
	members: 4832,
	membersTrend: 8.1,
	avgReadTime: 6.4,
};

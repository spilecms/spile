import type {
	ActivityItem,
	ContentRevision,
	DocNavigationManifest,
	DocPage,
	DocumentationProject,
	Member,
	Newsletter,
	Notification,
	Post,
	ReviewRequest,
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
	{
		id: "u5",
		name: "Oliyad Tesfaye",
		email: "oliyad@spile.dev",
		avatar: "",
		role: "contributor",
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
		type: "post",
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
	published: posts.filter((p) => p.status === "published").length,
	drafts: posts.filter((p) => p.status === "draft").length,
	members: 4832,
	membersTrend: 8.1,
	avgReadTime: 6.4,
};

export const docPages: DocPage[] = [
	{
		id: "doc-1",
		projectId: "doc-proj-developer-docs",
		translationGroupId: "doc-1",
		isDefaultLocale: true,
		locale: "en",
		title: "Introduction to Spile",
		slug: "introduction",
		status: "published",
		createdAt: day(30),
		updatedAt: day(2),
		content: {
			time: day(2),
			blocks: [
				{
					id: "blk-intro-1",
					type: "header",
					data: {
						text: "Introduction to Spile",
						level: 1,
					},
				},
				{
					id: "blk-intro-2",
					type: "paragraph",
					data: {
						text: "Spile is a modern, headless developer-first content management platform designed for documentation, technical publications, and newsletters.",
					},
				},
				{
					id: "blk-intro-3",
					type: "paragraph",
					data: {
						text: "With a high-performance Go backend and a responsive React frontend, Spile delivers instantaneous content delivery with native multi-channel distribution.",
					},
				},
			],
			version: "2.31.7",
		},
	},
	{
		id: "doc-1-es",
		projectId: "doc-proj-developer-docs",
		translationGroupId: "doc-1",
		translationSourceId: "doc-1",
		isDefaultLocale: false,
		locale: "es",
		title: "Introducción a Spile",
		slug: "introduccion",
		status: "published",
		createdAt: day(29),
		updatedAt: day(2),
		content: {
			time: day(2),
			blocks: [
				{
					id: "blk-intro-1-es",
					type: "header",
					data: {
						text: "Introducción a Spile",
						level: 1,
					},
				},
				{
					id: "blk-intro-2-es",
					type: "paragraph",
					data: {
						text: "Spile es una plataforma moderna de gestión de contenidos diseñada para documentación, publicaciones técnicas y boletines informativos.",
					},
				},
			],
			version: "2.31.7",
		},
	},
	{
		id: "doc-2",
		projectId: "doc-proj-developer-docs",
		parentId: "doc-1",
		translationGroupId: "doc-2",
		isDefaultLocale: true,
		locale: "en",
		title: "Installation & Quickstart",
		slug: "installation",
		status: "published",
		createdAt: day(28),
		updatedAt: day(5),
		content: {
			time: day(5),
			blocks: [
				{
					id: "blk-inst-1",
					type: "header",
					data: {
						text: "Installation & Quickstart",
						level: 1,
					},
				},
				{
					id: "blk-inst-2",
					type: "paragraph",
					data: {
						text: "Get up and running with Spile in less than 3 minutes using Docker or direct binary execution.",
					},
				},
				{
					id: "blk-inst-3",
					type: "code",
					data: {
						code: "# Clone the repository\ngit clone https://github.com/spilecms/spile.git\ncd spile\n\n# Run with Docker Compose\ndocker compose up -d",
					},
				},
			],
			version: "2.31.7",
		},
	},
	{
		id: "doc-3",
		projectId: "doc-proj-developer-docs",
		translationGroupId: "doc-3",
		isDefaultLocale: true,
		locale: "en",
		title: "Architecture & Data Model",
		slug: "architecture",
		status: "published",
		createdAt: day(20),
		updatedAt: day(4),
		content: {
			time: day(4),
			blocks: [
				{
					id: "blk-arch-1",
					type: "header",
					data: {
						text: "Architecture & Data Model",
						level: 1,
					},
				},
				{
					id: "blk-arch-2",
					type: "paragraph",
					data: {
						text: "Spile separates documentation content from hierarchical navigation manifests to guarantee zero-sync penalty during drag-and-drop tree reordering.",
					},
				},
			],
			version: "2.31.7",
		},
	},
	{
		id: "doc-4",
		projectId: "doc-proj-developer-docs",
		parentId: "doc-3",
		translationGroupId: "doc-4",
		isDefaultLocale: true,
		locale: "en",
		title: "API Authentication",
		slug: "api-authentication",
		status: "draft",
		createdAt: day(10),
		updatedAt: day(1),
		content: {
			time: day(1),
			blocks: [
				{
					id: "blk-auth-1",
					type: "header",
					data: {
						text: "API Authentication",
						level: 1,
					},
				},
				{
					id: "blk-auth-2",
					type: "paragraph",
					data: {
						text: "Authenticate requests to the Spile Headless REST API using Bearer tokens generated from the Settings panel.",
					},
				},
			],
			version: "2.31.7",
		},
	},
];

export const docNavigation: DocNavigationManifest = {
	id: "nav-en",
	locale: "en",
	updatedAt: day(1),
	items: [
		{
			id: "doc-1",
			children: [
				{
					id: "doc-2",
				},
			],
		},
		{
			id: "doc-3",
			children: [
				{
					id: "doc-4",
				},
			],
		},
	],
};

export const docProjects: DocumentationProject[] = [
	{
		id: "doc-proj-developer-docs",
		title: "Developer Platform & API",
		description:
			"Guides, architecture overviews, and headless REST endpoints for Spile developers.",
		slug: "developer-docs",
		status: "published",
		pagesCount: 4,
		createdAt: day(30),
		updatedAt: day(1),
		navigation: docNavigation,
	},
	{
		id: "doc-proj-user-handbook",
		title: "Editorial Handbook & Style Guide",
		description:
			"Writing workflows, publishing standards, and newsletter best practices.",
		slug: "editorial-handbook",
		status: "draft",
		pagesCount: 1,
		createdAt: day(14),
		updatedAt: day(3),
		navigation: {
			id: "nav-editorial",
			locale: "en",
			updatedAt: day(3),
			items: [
				{
					id: "doc-1",
				},
			],
		},
	},
];

export const members: Member[] = [
	{
		id: "m1",
		email: "sophia.chen@example.com",
		name: "Sophia Chen",
		status: "active",
		subscribedAt: day(90),
		openRate: 85,
		locale: "en",
	},
	{
		id: "m2",
		email: "alex.kumar@example.com",
		name: "Alex Kumar",
		status: "active",
		subscribedAt: day(60),
		openRate: 92,
		locale: "en",
	},
	{
		id: "m3",
		email: "elena.rostova@example.com",
		name: "Elena Rostova",
		status: "active",
		subscribedAt: day(45),
		openRate: 70,
		locale: "en",
	},
	{
		id: "m4",
		email: "marcus.vance@example.com",
		name: "Marcus Vance",
		status: "active",
		subscribedAt: day(30),
		openRate: 64,
		locale: "en",
	},
	{
		id: "m5",
		email: "liam.o'connor@example.com",
		name: "Liam O'Connor",
		status: "unconfirmed",
		subscribedAt: day(5),
		openRate: 0,
		locale: "en",
	},
	{
		id: "m6",
		email: "clara.dupont@example.com",
		name: "Clara Dupont",
		status: "unsubscribed",
		subscribedAt: day(120),
		openRate: 40,
		locale: "fr",
	},
	{
		id: "m7",
		email: "daniel.kim@example.com",
		name: "Daniel Kim",
		status: "active",
		subscribedAt: day(15),
		openRate: 100,
		locale: "en",
	},
	{
		id: "m8",
		email: "amara.bekele@example.com",
		name: "Amara Bekele",
		status: "active",
		subscribedAt: day(2),
		openRate: 100,
		locale: "am",
	},
];

export const newsletters: Newsletter[] = [
	{
		id: "nl-1",
		title: "Spile v2.0 Architecture & Roadmap",
		subject: "🚀 Spile v2.0 is here: A new chapter in headless publishing",
		previewText:
			"Explore our overhauled block editor, i18n workflows, and developer API.",
		status: "sent",
		senderName: "Spile Team",
		senderEmail: "newsletter@spile.dev",
		recipientsCount: 4832,
		deliveredCount: 4812,
		openedCount: 2320,
		clickedCount: 685,
		scheduledFor: null,
		sentAt: day(4),
		createdAt: day(6),
		updatedAt: day(4),
		content: {
			time: day(4),
			blocks: [
				{
					id: "nl-blk-1",
					type: "header",
					data: {
						text: "Welcome to Spile v2.0",
						level: 2,
					},
				},
				{
					id: "nl-blk-2",
					type: "paragraph",
					data: {
						text: "We're thrilled to introduce our major release focusing on modern publishing, multi-language sync, and developer-first documentation.",
					},
				},
			],
			version: "2.31.7",
		},
	},
	{
		id: "nl-2",
		title: "Weekly Engineering Digest #42",
		subject: "Weekly Tech Digest: High-performance Go services and Web Vitals",
		previewText:
			"Tips for optimizing block editor performance and structuring recursive content.",
		status: "scheduled",
		senderName: "Spile Editorial",
		senderEmail: "editorial@spile.dev",
		recipientsCount: 4832,
		deliveredCount: 0,
		openedCount: 0,
		clickedCount: 0,
		scheduledFor: now + 2 * DAY,
		sentAt: null,
		createdAt: day(1),
		updatedAt: day(1),
		content: {
			time: day(1),
			blocks: [
				{
					id: "nl-blk-3",
					type: "header",
					data: {
						text: "Engineering Insights this Week",
						level: 2,
					},
				},
				{
					id: "nl-blk-4",
					type: "paragraph",
					data: {
						text: "In this issue, we examine backend architecture choices, database models, and editor performance.",
					},
				},
			],
			version: "2.31.7",
		},
	},
	{
		id: "nl-3",
		title: "Behind the Scenes: Editor.js Custom Plugins",
		subject: "Draft: Building custom rich block plugins with Editor.js",
		previewText:
			"How we engineered code highlighting, math formulas, and embed blocks.",
		status: "draft",
		senderName: "Spile Engineering",
		senderEmail: "newsletter@spile.dev",
		recipientsCount: 0,
		deliveredCount: 0,
		openedCount: 0,
		clickedCount: 0,
		scheduledFor: null,
		sentAt: null,
		createdAt: day(2),
		updatedAt: day(2),
		content: {
			time: day(2),
			blocks: [
				{
					id: "nl-blk-5",
					type: "paragraph",
					data: {
						text: "Drafting our deep-dive tutorial for the developer community...",
					},
				},
			],
			version: "2.31.7",
		},
	},
];

export const revisions: ContentRevision[] = [
	{
		id: "rev-1",
		targetType: "post",
		targetId: "post-1",
		versionNumber: 1,
		versionLabel: "v1.0",
		title: "Engineering high-performance rich text editors on the modern web",
		summary: "Initial publication by Mara",
		content: posts[0]?.content || null,
		authorId: "u1",
		authorName: "Mara Lindqvist",
		status: "published",
		createdAt: day(7),
	},
	{
		id: "rev-2",
		targetType: "post",
		targetId: "post-1",
		versionNumber: 2,
		versionLabel: "v2.0",
		title: "Engineering high-performance rich text editors on the modern web",
		summary: "Added API Reference parameters and code tabs breakdown",
		content: posts[0]?.content || null,
		authorId: "u5",
		authorName: "Oliyad Tesfaye",
		status: "in_review",
		createdAt: day(1),
	},
];

export const reviewRequests: ReviewRequest[] = [
	{
		id: "review-1",
		targetType: "post",
		targetId: "post-1",
		targetTitle:
			"Engineering high-performance rich text editors on the modern web",
		revisionId: "rev-2",
		authorId: "u5",
		authorName: "Oliyad Tesfaye",
		reviewerId: "u2",
		reviewerName: "Jonas Okafor",
		summary: "Added API Reference parameters and code tabs breakdown",
		status: "in_review",
		createdAt: day(1),
		updatedAt: day(1),
	},
];

export const notifications: Notification[] = [
	{
		id: "notif-1",
		type: "review_requested",
		title: "Review Requested",
		message:
			"Oliyad Tesfaye requested your review on 'Engineering high-performance rich text editors on the modern web'",
		targetType: "post",
		targetId: "post-1",
		reviewId: "review-1",
		read: false,
		createdAt: day(1),
	},
];

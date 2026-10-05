import type {
	ActivityItem,
	AiSettings,
	ApiKey,
	DocNavigationManifest,
	DocPage,
	DocPagePatch,
	DocTreeItem,
	DocumentationProject,
	DocumentationProjectPatch,
	EmailSettings,
	Member,
	MemberListParams,
	MemberPatch,
	Newsletter,
	NewsletterListParams,
	NewsletterPatch,
	OverviewStats,
	Post,
	PostListParams,
	PostPatch,
	StorageSettings,
	Tag,
	User,
	ViewsPoint,
	ViewsRange,
	Webhook,
	WorkspaceLocale,
} from "@/types/domain";
import {
	currentUser,
	activity as seedActivity,
	docPages as seedDocPages,
	docProjects as seedDocProjects,
	members as seedMembers,
	newsletters as seedNewsletters,
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

let membersList: Member[] = [...seedMembers];
let nextMemberId = membersList.length + 1;

let newslettersList: Newsletter[] = [...seedNewsletters];
let nextNewsletterId = newslettersList.length + 1;

let docPagesList: DocPage[] = [...seedDocPages];
let docProjectsList: DocumentationProject[] = JSON.parse(
	JSON.stringify(seedDocProjects),
);
let nextDocId = docPagesList.length + 1;
let nextProjectId = docProjectsList.length + 1;

let tagsList: Tag[] = [...seedTags];
const usersList: User[] = [...seedUsers];
let workspaceLocalesList: WorkspaceLocale[] = [...workspaceLocales];

let storageSettingsData: StorageSettings = {
	provider: "r2",
	bucket: "spile-media-assets",
	endpoint: "https://<account-id>.r2.cloudflarestorage.com",
	accessKey: "cf_acc_9831720184",
	secretKey: "••••••••••••••••••••••••••••••••",
	publicUrl: "https://media.spile.io",
};

let emailSettingsData: EmailSettings = {
	fromName: "Spile Editorial Team",
	fromEmail: "newsletter@spile.io",
	replyTo: "team@spile.io",
	provider: "resend",
	apiKey: "re_spile_test_key_849182379",
};

let aiSettingsData: AiSettings = {
	provider: "gemini",
	apiKey: "AIzaSyD-spile-mock-gemini-key",
	model: "gemini-1.5-flash",
	enableTranslations: true,
	enableSummaries: true,
	enableWritingAssistant: true,
};

let apiKeysList: ApiKey[] = [
	{
		id: "key-1",
		name: "Next.js Frontend Website",
		prefix: "pk_live_839a1...",
		type: "public_read",
		createdAt: Date.now() - 86400000 * 20,
		lastUsedAt: Date.now() - 3600000,
	},
	{
		id: "key-2",
		name: "CI/CD Auto Publisher Token",
		prefix: "sk_live_199d0...",
		type: "admin_secret",
		createdAt: Date.now() - 86400000 * 10,
		lastUsedAt: Date.now() - 7200000,
	},
];

let webhooksList: Webhook[] = [
	{
		id: "wh-1",
		name: "Vercel On-Demand Revalidation",
		url: "https://my-site.com/api/revalidate",
		events: ["post.published", "doc.updated"],
		active: true,
		createdAt: Date.now() - 86400000 * 14,
	},
];

function hydrateTreeItem(
	item: DocTreeItem,
	pageMap: Map<string, DocPage>,
	locale: string = "en",
	allPages: DocPage[] = [],
): DocTreeItem {
	const directPage = pageMap.get(item.id);
	// If a specific locale is requested, check if a translation exists for this group
	let page = directPage;
	if (directPage) {
		const groupId = directPage.translationGroupId || directPage.id;
		const localized = allPages.find(
			(p) => (p.translationGroupId || p.id) === groupId && p.locale === locale,
		);
		if (localized) {
			page = localized;
		}
	}

	return {
		id: page?.id ?? item.id,
		translationGroupId:
			page?.translationGroupId ?? directPage?.translationGroupId,
		locale: page?.locale ?? directPage?.locale ?? locale,
		title: page?.title ?? "Untitled Document",
		slug: page?.slug ?? item.id,
		status: page?.status ?? "draft",
		children: item.children?.map((child) =>
			hydrateTreeItem(child, pageMap, locale, allPages),
		),
	};
}

function hydrateTreeItems(
	items: DocTreeItem[],
	pages: DocPage[],
	locale: string = "en",
): DocTreeItem[] {
	const pageMap = new Map(pages.map((p) => [p.id, p]));
	return items.map((it) => hydrateTreeItem(it, pageMap, locale, pages));
}

function matches(post: Post, params: PostListParams): boolean {
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
				type: "post",
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
			return [...workspaceLocalesList];
		},
		async add(loc: WorkspaceLocale): Promise<WorkspaceLocale> {
			await delay(80);
			const exists = workspaceLocalesList.find((l) => l.code === loc.code);
			if (exists) return exists;
			workspaceLocalesList.push(loc);
			return { ...loc };
		},
		async remove(code: string): Promise<void> {
			await delay(80);
			workspaceLocalesList = workspaceLocalesList.filter(
				(l) => l.code !== code,
			);
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
			return usersList.map((user) => ({ ...user }));
		},
		async invite(email: string, role: string): Promise<User> {
			await delay(100);
			const newUser: User = {
				id: `user-${Date.now()}`,
				name: email.split("@")[0],
				email,
				role: role as User["role"],
				avatar: `https://images.unsplash.com/photo-${1534528741775 + usersList.length}?w=100&h=100&fit=crop&crop=faces`,
			};
			usersList.push(newUser);
			return newUser;
		},
	},
	tags: {
		async list() {
			await delay(50);
			return tagsList.map((tag) => ({ ...tag }));
		},
		async create(data: { name: string; slug?: string; color: string }) {
			await delay(80);
			const slug =
				data.slug ||
				data.name
					.toLowerCase()
					.replace(/[^a-z0-9]+/g, "-")
					.replace(/(^-|-$)/g, "");
			const newTag = {
				id: `t${Date.now()}`,
				name: data.name,
				slug,
				color: data.color,
				postCount: 0,
			};
			tagsList.push(newTag);
			return { ...newTag };
		},
		async update(
			id: string,
			patch: Partial<{ name: string; slug: string; color: string }>,
		) {
			await delay(80);
			const idx = tagsList.findIndex((t) => t.id === id);
			if (idx === -1) throw new Error("Tag not found");
			tagsList[idx] = { ...tagsList[idx], ...patch };
			return { ...tagsList[idx] };
		},
		async delete(id: string) {
			await delay(80);
			tagsList = tagsList.filter((t) => t.id !== id);
		},
	},
	settings: {
		async getStorage(): Promise<StorageSettings> {
			await delay(50);
			return { ...storageSettingsData };
		},
		async updateStorage(
			patch: Partial<StorageSettings>,
		): Promise<StorageSettings> {
			await delay(100);
			storageSettingsData = { ...storageSettingsData, ...patch };
			return { ...storageSettingsData };
		},
		async getEmail(): Promise<EmailSettings> {
			await delay(50);
			return { ...emailSettingsData };
		},
		async updateEmail(patch: Partial<EmailSettings>): Promise<EmailSettings> {
			await delay(100);
			emailSettingsData = { ...emailSettingsData, ...patch };
			return { ...emailSettingsData };
		},
		async getAi(): Promise<AiSettings> {
			await delay(50);
			return { ...aiSettingsData };
		},
		async updateAi(patch: Partial<AiSettings>): Promise<AiSettings> {
			await delay(100);
			aiSettingsData = { ...aiSettingsData, ...patch };
			return { ...aiSettingsData };
		},
		async listApiKeys(): Promise<ApiKey[]> {
			await delay(50);
			return [...apiKeysList];
		},
		async createApiKey(
			name: string,
			type: "public_read" | "admin_secret",
		): Promise<ApiKey> {
			await delay(80);
			const prefix = type === "public_read" ? "pk_live_" : "sk_live_";
			const newKey: ApiKey = {
				id: `key-${Date.now()}`,
				name,
				prefix: `${prefix}${Math.random().toString(36).substring(2, 8)}...`,
				type,
				createdAt: Date.now(),
				lastUsedAt: null,
			};
			apiKeysList.unshift(newKey);
			return newKey;
		},
		async deleteApiKey(id: string): Promise<void> {
			await delay(80);
			apiKeysList = apiKeysList.filter((k) => k.id !== id);
		},
		async listWebhooks(): Promise<Webhook[]> {
			await delay(50);
			return [...webhooksList];
		},
		async createWebhook(data: {
			name: string;
			url: string;
			events: string[];
		}): Promise<Webhook> {
			await delay(80);
			const newWebhook: Webhook = {
				id: `wh-${Date.now()}`,
				name: data.name,
				url: data.url,
				events: data.events,
				active: true,
				createdAt: Date.now(),
			};
			webhooksList.push(newWebhook);
			return newWebhook;
		},
		async deleteWebhook(id: string): Promise<void> {
			await delay(80);
			webhooksList = webhooksList.filter((w) => w.id !== id);
		},
	},
	members: {
		async list(params: MemberListParams = {}): Promise<Member[]> {
			await delay(80);
			let list = [...membersList];
			if (params.status && params.status !== "all") {
				list = list.filter((m) => m.status === params.status);
			}
			if (params.query) {
				const q = params.query.toLowerCase();
				list = list.filter(
					(m) =>
						m.email.toLowerCase().includes(q) ||
						Boolean(m.name?.toLowerCase().includes(q)),
				);
			}
			return list.sort((a, b) => b.subscribedAt - a.subscribedAt);
		},
		async get(id: string): Promise<Member> {
			await delay(50);
			const member = membersList.find((m) => m.id === id);
			if (!member) throw new Error(`Member ${id} not found`);
			return { ...member };
		},
		async create(data: Partial<Member>): Promise<Member> {
			await delay(100);
			const newMember: Member = {
				id: `m${nextMemberId++}`,
				email: data.email ?? "",
				name: data.name,
				status: data.status ?? "active",
				subscribedAt: Date.now(),
				openRate: 0,
				locale: data.locale ?? "en",
			};
			membersList = [newMember, ...membersList];
			return { ...newMember };
		},
		async update(id: string, patch: MemberPatch): Promise<Member> {
			await delay(80);
			const idx = membersList.findIndex((m) => m.id === id);
			if (idx === -1) throw new Error(`Member ${id} not found`);
			const updated: Member = {
				...membersList[idx],
				...patch,
			};
			membersList[idx] = updated;
			return { ...updated };
		},
		async remove(id: string): Promise<void> {
			await delay(80);
			membersList = membersList.filter((m) => m.id !== id);
		},
	},
	newsletters: {
		async list(params: NewsletterListParams = {}): Promise<Newsletter[]> {
			await delay(100);
			let list = [...newslettersList];
			if (params.status && params.status !== "all") {
				list = list.filter((n) => n.status === params.status);
			}
			if (params.query) {
				const q = params.query.toLowerCase();
				list = list.filter(
					(n) =>
						n.title.toLowerCase().includes(q) ||
						n.subject.toLowerCase().includes(q),
				);
			}
			return list.sort((a, b) => b.updatedAt - a.updatedAt);
		},
		async get(id: string): Promise<Newsletter> {
			await delay(80);
			const nl = newslettersList.find((n) => n.id === id);
			if (!nl) throw new Error(`Newsletter ${id} not found`);
			return { ...nl };
		},
		async create(input: Partial<Newsletter> = {}): Promise<Newsletter> {
			await delay(120);
			const now = Date.now();
			const id = `nl-${nextNewsletterId++}`;
			const newNl: Newsletter = {
				id,
				title: input.title ?? "Untitled Newsletter",
				subject: input.subject ?? "New Update from Spile",
				previewText: input.previewText ?? "",
				content: input.content ?? {
					time: now,
					blocks: [
						{
							id: `nl-init-${now}`,
							type: "paragraph",
							data: { text: "Write your newsletter issue here..." },
						},
					],
					version: "2.31.7",
				},
				status: input.status ?? "draft",
				senderName: input.senderName ?? "Spile Editorial",
				senderEmail: input.senderEmail ?? "newsletter@spile.dev",
				recipientsCount: input.recipientsCount ?? 0,
				deliveredCount: 0,
				openedCount: 0,
				clickedCount: 0,
				scheduledFor: input.scheduledFor ?? null,
				sentAt: input.status === "sent" ? now : null,
				createdAt: now,
				updatedAt: now,
			};
			newslettersList = [newNl, ...newslettersList];
			return { ...newNl };
		},
		async update(id: string, patch: NewsletterPatch): Promise<Newsletter> {
			await delay(100);
			const idx = newslettersList.findIndex((n) => n.id === id);
			if (idx === -1) throw new Error(`Newsletter ${id} not found`);
			const current = newslettersList[idx];
			const nextStatus = patch.status ?? current.status;
			const updated: Newsletter = {
				...current,
				...patch,
				sentAt:
					nextStatus === "sent"
						? (current.sentAt ?? Date.now())
						: current.sentAt,
				updatedAt: Date.now(),
			};
			newslettersList[idx] = updated;
			return { ...updated };
		},
		async remove(id: string): Promise<void> {
			await delay(100);
			newslettersList = newslettersList.filter((n) => n.id !== id);
		},
		async duplicate(id: string): Promise<Newsletter> {
			const source = await mockApi.newsletters.get(id);
			return mockApi.newsletters.create({
				...source,
				id: undefined,
				title: `${source.title} (copy)`,
				status: "draft",
				recipientsCount: 0,
				deliveredCount: 0,
				openedCount: 0,
				clickedCount: 0,
				sentAt: null,
				scheduledFor: null,
			});
		},
		async sendTest(
			id: string,
			email: string,
		): Promise<{ success: boolean; message: string }> {
			await delay(300);
			const nl = await mockApi.newsletters.get(id);
			return {
				success: true,
				message: `Test email for "${nl.subject}" sent to ${email}`,
			};
		},
		async send(id: string): Promise<Newsletter> {
			await delay(400);
			const activeCount = membersList.filter(
				(m) => m.status === "active",
			).length;
			return mockApi.newsletters.update(id, {
				status: "sent",
				recipientsCount: activeCount,
				deliveredCount: activeCount,
				sentAt: Date.now(),
			});
		},
	},
	docs: {
		async listProjects(): Promise<DocumentationProject[]> {
			await delay(100);
			function countItems(items: DocTreeItem[]): number {
				let count = 0;
				for (const item of items) {
					count += 1;
					if (item.children) count += countItems(item.children);
				}
				return count;
			}
			return docProjectsList.map((p) => ({
				...p,
				pagesCount: countItems(p.navigation.items),
			}));
		},
		async getProject(projectId: string): Promise<DocumentationProject | null> {
			await delay(80);
			const proj = docProjectsList.find((p) => p.id === projectId);
			if (!proj) return null;
			return {
				...proj,
				navigation: {
					...proj.navigation,
					items: hydrateTreeItems(proj.navigation.items, docPagesList),
				},
			};
		},
		async createProject(data: {
			title: string;
			description?: string;
		}): Promise<{ project: DocumentationProject; initialPage: DocPage }> {
			await delay(150);
			const projId = `doc-proj-${nextProjectId++}`;
			const rootDocId = `doc-${nextDocId++}`;
			const slug =
				data.title
					.toLowerCase()
					.replace(/[^a-z0-9]+/g, "-")
					.replace(/(^-|-$)/g, "") || `docs-${Date.now()}`;

			const initialPage: DocPage = {
				id: rootDocId,
				title: "Introduction",
				slug: "introduction",
				status: "draft",
				locale: "en",
				createdAt: Date.now(),
				updatedAt: Date.now(),
				content: {
					time: Date.now(),
					blocks: [
						{
							id: `blk-${Date.now()}`,
							type: "header",
							data: {
								text: `Welcome to ${data.title}`,
								level: 1,
							},
						},
						{
							id: `blk-${Date.now() + 1}`,
							type: "paragraph",
							data: {
								text: "Start writing your documentation guide here...",
							},
						},
					],
					version: "2.31.7",
				},
			};

			docPagesList.push(initialPage);

			const newNav: DocNavigationManifest = {
				id: `nav-${projId}`,
				locale: "en",
				updatedAt: Date.now(),
				items: [{ id: rootDocId }],
			};

			const newProject: DocumentationProject = {
				id: projId,
				title: data.title || "Untitled Docs",
				description: data.description || "",
				slug,
				status: "draft",
				pagesCount: 1,
				createdAt: Date.now(),
				updatedAt: Date.now(),
				navigation: newNav,
			};

			docProjectsList.unshift(newProject);

			return {
				project: {
					...newProject,
					navigation: {
						...newNav,
						items: hydrateTreeItems(newNav.items, docPagesList),
					},
				},
				initialPage,
			};
		},
		async updateProject(
			projectId: string,
			patch: DocumentationProjectPatch,
		): Promise<DocumentationProject> {
			await delay(100);
			const idx = docProjectsList.findIndex((p) => p.id === projectId);
			if (idx === -1) throw new Error("Project not found");
			const existing = docProjectsList[idx];
			const updated: DocumentationProject = {
				...existing,
				...patch,
				updatedAt: Date.now(),
			};
			docProjectsList[idx] = updated;
			return { ...updated };
		},
		async deleteProject(projectId: string): Promise<void> {
			await delay(120);
			docProjectsList = docProjectsList.filter((p) => p.id !== projectId);
		},
		async getNavigation(
			projectId?: string,
			locale: string = "en",
		): Promise<DocNavigationManifest> {
			await delay(100);
			const proj = projectId
				? docProjectsList.find((p) => p.id === projectId)
				: docProjectsList[0];
			const nav = proj
				? proj.navigation
				: { id: "empty", locale, items: [], updatedAt: Date.now() };
			return {
				...nav,
				locale,
				items: hydrateTreeItems(nav.items, docPagesList, locale),
			};
		},
		async updateNavigation(
			items: DocTreeItem[],
			projectId?: string,
		): Promise<DocNavigationManifest> {
			await delay(150);
			function cleanTreeItem(item: DocTreeItem): DocTreeItem {
				return {
					id: item.id,
					children: item.children?.map(cleanTreeItem),
				};
			}
			const cleanItems = items.map(cleanTreeItem);

			const targetProj = projectId
				? docProjectsList.find((p) => p.id === projectId)
				: docProjectsList[0];

			if (targetProj) {
				targetProj.navigation.items = cleanItems;
				targetProj.navigation.updatedAt = Date.now();
				targetProj.updatedAt = Date.now();
				return {
					...targetProj.navigation,
					items: hydrateTreeItems(targetProj.navigation.items, docPagesList),
				};
			}

			return {
				id: "empty",
				locale: "en",
				items: [],
				updatedAt: Date.now(),
			};
		},
		async listPages(): Promise<DocPage[]> {
			await delay(100);
			return docPagesList.map((p) => ({ ...p }));
		},
		async getPage(id: string): Promise<DocPage | null> {
			await delay(80);
			const page = docPagesList.find((p) => p.id === id);
			return page ? { ...page } : null;
		},
		async createPage(data: {
			title?: string;
			parentId?: string;
			projectId?: string;
		}): Promise<{ page: DocPage; navigation: DocNavigationManifest }> {
			await delay(120);
			const newId = `doc-${nextDocId++}`;
			const pageTitle = data.title || "Untitled";
			const slug =
				pageTitle
					.toLowerCase()
					.replace(/[^a-z0-9]+/g, "-")
					.replace(/(^-|-$)/g, "") || newId;

			const newPage: DocPage = {
				id: newId,
				title: pageTitle,
				slug,
				status: "draft",
				locale: "en",
				createdAt: Date.now(),
				updatedAt: Date.now(),
				content: {
					time: Date.now(),
					blocks: [
						{
							id: `blk-${Date.now()}`,
							type: "header",
							data: {
								text: pageTitle,
								level: 1,
							},
						},
						{
							id: `blk-${Date.now() + 1}`,
							type: "paragraph",
							data: {
								text: "Start writing document content here...",
							},
						},
					],
					version: "2.31.7",
				},
			};

			docPagesList.push(newPage);

			const targetProj = data.projectId
				? docProjectsList.find((p) => p.id === data.projectId)
				: docProjectsList[0];

			if (!targetProj) {
				const fallbackNav: DocNavigationManifest = {
					id: `nav-${Date.now()}`,
					locale: "en",
					updatedAt: Date.now(),
					items: [{ id: newId }],
				};
				return { page: { ...newPage }, navigation: fallbackNav };
			}

			const newItemNode: DocTreeItem = { id: newId };

			if (data.parentId) {
				// Recursively locate parent and append child
				function appendToParent(list: DocTreeItem[]): boolean {
					for (const node of list) {
						if (node.id === data.parentId) {
							node.children = node.children || [];
							node.children.push(newItemNode);
							return true;
						}
						if (node.children && appendToParent(node.children)) {
							return true;
						}
					}
					return false;
				}
				const appended = appendToParent(targetProj.navigation.items);
				if (!appended) {
					targetProj.navigation.items.push(newItemNode);
				}
			} else {
				targetProj.navigation.items.push(newItemNode);
			}

			targetProj.updatedAt = Date.now();

			return {
				page: { ...newPage },
				navigation: {
					...targetProj.navigation,
					items: hydrateTreeItems(targetProj.navigation.items, docPagesList),
				},
			};
		},
		async getTranslations(translationGroupId: string): Promise<DocPage[]> {
			await delay(80);
			return docPagesList.filter(
				(d) => (d.translationGroupId || d.id) === translationGroupId,
			);
		},
		async createTranslation(
			sourceDocId: string,
			targetLocale: string,
			options?: {
				title?: string;
				slug?: string;
				copyContent?: boolean;
				projectId?: string;
			},
		): Promise<DocPage> {
			await delay(120);
			const source = await mockApi.docs.getPage(sourceDocId);
			if (!source) throw new Error("Source document not found");
			const translationGroupId = source.translationGroupId || source.id;

			const existing = docPagesList.find(
				(d) =>
					(d.translationGroupId || d.id) === translationGroupId &&
					d.locale === targetLocale,
			);
			if (existing) return { ...existing };

			const targetLocaleObj = workspaceLocales.find(
				(l) => l.code === targetLocale,
			);
			const targetName = targetLocaleObj
				? targetLocaleObj.name
				: targetLocale.toUpperCase();

			const copyContent = options?.copyContent ?? true;
			const newId = `doc-${nextDocId++}`;
			const finalTitle =
				options?.title?.trim() ||
				(copyContent ? `${source.title} (${targetName})` : "Untitled");
			const cleanSlug =
				options?.slug?.trim() ||
				source.slug
					.toLowerCase()
					.replace(/[^a-z0-9]+/g, "-")
					.replace(/(^-|-$)/g, "");
			const finalSlug = `${cleanSlug}-${targetLocale}`;

			const newDocPage: DocPage = {
				id: newId,
				projectId: source.projectId || options?.projectId,
				parentId: source.parentId,
				translationGroupId,
				translationSourceId: source.id,
				locale: targetLocale,
				isDefaultLocale: false,
				title: finalTitle,
				slug: finalSlug,
				status: "draft",
				createdAt: Date.now(),
				updatedAt: Date.now(),
				content: copyContent
					? JSON.parse(JSON.stringify(source.content ?? { blocks: [] }))
					: { blocks: [] },
			};

			docPagesList.push(newDocPage);

			// Also link into the project's navigation if available
			const proj =
				source.projectId || options?.projectId
					? docProjectsList.find(
							(p) => p.id === (source.projectId || options?.projectId),
						)
					: docProjectsList[0];
			if (proj) {
				proj.navigation.items.push({ id: newId });
				proj.updatedAt = Date.now();
			}

			return { ...newDocPage };
		},
		async updatePage(id: string, patch: DocPagePatch): Promise<DocPage> {
			await delay(120);
			const index = docPagesList.findIndex((p) => p.id === id);
			if (index === -1) {
				throw new Error("Doc not found");
			}
			const existing = docPagesList[index];
			const updated: DocPage = {
				...existing,
				...patch,
				updatedAt: Date.now(),
			};
			docPagesList[index] = updated;
			return { ...updated };
		},
		async deletePage(
			id: string,
			projectId?: string,
		): Promise<DocNavigationManifest> {
			await delay(120);
			docPagesList = docPagesList.filter((p) => p.id !== id);

			// Recursively remove from navigation tree
			function removeFromItems(items: DocTreeItem[]): DocTreeItem[] {
				return items
					.filter((item) => item.id !== id)
					.map((item) => ({
						...item,
						children: item.children
							? removeFromItems(item.children)
							: undefined,
					}));
			}

			const targetProj = projectId
				? docProjectsList.find((p) => p.id === projectId)
				: docProjectsList[0];
			if (targetProj) {
				targetProj.navigation.items = removeFromItems(
					targetProj.navigation.items,
				);
				targetProj.updatedAt = Date.now();
				return {
					...targetProj.navigation,
					items: hydrateTreeItems(targetProj.navigation.items, docPagesList),
				};
			}
			return { id: "empty", locale: "en", items: [], updatedAt: Date.now() };
		},
	},
};

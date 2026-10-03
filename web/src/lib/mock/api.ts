import type {
	ActivityItem,
	DocNavigationManifest,
	DocPage,
	DocPagePatch,
	DocTreeItem,
	DocumentationProject,
	DocumentationProjectPatch,
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
	docPages as seedDocPages,
	docProjects as seedDocProjects,
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

let docPagesList: DocPage[] = [...seedDocPages];
let docProjectsList: DocumentationProject[] = JSON.parse(
	JSON.stringify(seedDocProjects),
);
let nextDocId = docPagesList.length + 1;
let nextProjectId = docProjectsList.length + 1;

function hydrateTreeItem(
	item: DocTreeItem,
	pageMap: Map<string, DocPage>,
): DocTreeItem {
	const page = pageMap.get(item.id);
	return {
		id: item.id,
		title: page?.title ?? "Untitled Document",
		slug: page?.slug ?? item.id,
		status: page?.status ?? "draft",
		children: item.children?.map((child) => hydrateTreeItem(child, pageMap)),
	};
}

function hydrateTreeItems(
	items: DocTreeItem[],
	pages: DocPage[],
): DocTreeItem[] {
	const pageMap = new Map(pages.map((p) => [p.id, p]));
	return items.map((it) => hydrateTreeItem(it, pageMap));
}

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
	if (params.channel && params.channel !== "all") {
		if (params.channel === "web" && !post.distribution?.web) return false;
		if (params.channel === "newsletter" && !post.distribution?.newsletter)
			return false;
	}
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
				distribution: input.distribution ?? {
					web: true,
					newsletter: false,
					newsletterSentAt: null,
				},
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

			const distribution = patch.distribution ?? current.distribution;
			let newsletterSentAt = distribution?.newsletterSentAt ?? null;
			if (
				nextStatus === "published" &&
				distribution?.newsletter &&
				!newsletterSentAt
			) {
				newsletterSentAt = Date.now();
			}
			const nextDistribution = distribution
				? { ...distribution, newsletterSentAt }
				: undefined;

			const next: Post = {
				...current,
				...patch,
				distribution: nextDistribution,
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
		async getNavigation(projectId?: string): Promise<DocNavigationManifest> {
			await delay(100);
			const proj = projectId
				? docProjectsList.find((p) => p.id === projectId)
				: docProjectsList[0];
			const nav = proj
				? proj.navigation
				: { id: "empty", locale: "en", items: [], updatedAt: Date.now() };
			return {
				...nav,
				items: hydrateTreeItems(nav.items, docPagesList),
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

import type {
	ActivityItem,
	DocNavigationManifest,
	DocPage,
	DocPagePatch,
	DocSection,
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

function hydrateSections(
	sections: DocSection[],
	pages: DocPage[],
): DocSection[] {
	const pageMap = new Map(pages.map((p) => [p.id, p]));
	return sections.map((sec) => ({
		...sec,
		items: sec.items.map((it) => hydrateTreeItem(it, pageMap)),
	}));
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
			return docProjectsList.map((p) => ({
				...p,
				pagesCount: p.navigation.sections.reduce(
					(acc, s) => acc + s.items.length,
					0,
				),
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
					sections: hydrateSections(proj.navigation.sections, docPagesList),
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
				sections: [
					{
						id: `sec-${Date.now()}`,
						title: "Getting Started",
						items: [{ id: rootDocId }],
					},
				],
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
						sections: hydrateSections(newNav.sections, docPagesList),
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
				: { id: "empty", locale: "en", sections: [], updatedAt: Date.now() };
			return {
				...nav,
				sections: hydrateSections(nav.sections, docPagesList),
			};
		},
		async updateNavigation(
			sections: DocSection[],
			projectId?: string,
		): Promise<DocNavigationManifest> {
			await delay(150);
			const cleanSections = sections.map((sec) => ({
				id: sec.id,
				title: sec.title,
				items: sec.items.map(function cleanItem(item): DocTreeItem {
					return {
						id: item.id,
						children: item.children?.map(cleanItem),
					};
				}),
			}));

			const targetProj = projectId
				? docProjectsList.find((p) => p.id === projectId)
				: docProjectsList[0];

			if (targetProj) {
				targetProj.navigation.sections = cleanSections;
				targetProj.navigation.updatedAt = Date.now();
				targetProj.updatedAt = Date.now();
				return {
					...targetProj.navigation,
					sections: hydrateSections(
						targetProj.navigation.sections,
						docPagesList,
					),
				};
			}

			return {
				id: "empty",
				locale: "en",
				sections: [],
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
			title: string;
			sectionId?: string;
			projectId?: string;
		}): Promise<{ page: DocPage; navigation: DocNavigationManifest }> {
			await delay(150);
			const newId = `doc-${nextDocId++}`;
			const slug = data.title
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/(^-|-$)/g, "");

			const newPage: DocPage = {
				id: newId,
				title: data.title || "Untitled Document",
				slug: slug || newId,
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
								text: data.title || "Untitled Document",
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
					sections: [
						{
							id: `sec-${Date.now()}`,
							title: "General",
							items: [{ id: newId }],
						},
					],
				};
				return {
					page: { ...newPage },
					navigation: fallbackNav,
				};
			}

			const activeNav = targetProj.navigation;
			const targetSectionId = data.sectionId || activeNav.sections[0]?.id;

			if (targetSectionId) {
				const section = activeNav.sections.find(
					(s) => s.id === targetSectionId,
				);
				if (section) {
					section.items.push({ id: newId });
				}
			} else {
				activeNav.sections.push({
					id: `sec-${Date.now()}`,
					title: "General",
					items: [{ id: newId }],
				});
			}

			targetProj.updatedAt = Date.now();

			return {
				page: { ...newPage },
				navigation: {
					...activeNav,
					sections: hydrateSections(activeNav.sections, docPagesList),
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
		async createSection(
			title: string,
			projectId?: string,
		): Promise<DocNavigationManifest> {
			await delay(100);
			const newSection: DocSection = {
				id: `sec-${Date.now()}`,
				title: title || "New Section",
				items: [],
			};
			const targetProj = projectId
				? docProjectsList.find((p) => p.id === projectId)
				: docProjectsList[0];
			if (targetProj) {
				targetProj.navigation.sections.push(newSection);
				targetProj.navigation.updatedAt = Date.now();
				return {
					...targetProj.navigation,
					sections: hydrateSections(
						targetProj.navigation.sections,
						docPagesList,
					),
				};
			}
			return { id: "empty", locale: "en", sections: [], updatedAt: Date.now() };
		},
		async updateSection(
			sectionId: string,
			title: string,
			projectId?: string,
		): Promise<DocNavigationManifest> {
			await delay(80);
			const targetProj = projectId
				? docProjectsList.find((p) => p.id === projectId)
				: docProjectsList[0];
			if (targetProj) {
				const sec = targetProj.navigation.sections.find(
					(s) => s.id === sectionId,
				);
				if (sec) sec.title = title;
				return {
					...targetProj.navigation,
					sections: hydrateSections(
						targetProj.navigation.sections,
						docPagesList,
					),
				};
			}
			return { id: "empty", locale: "en", sections: [], updatedAt: Date.now() };
		},
		async deleteSection(
			sectionId: string,
			projectId?: string,
		): Promise<DocNavigationManifest> {
			await delay(100);
			const targetProj = projectId
				? docProjectsList.find((p) => p.id === projectId)
				: docProjectsList[0];
			if (targetProj) {
				targetProj.navigation.sections = targetProj.navigation.sections.filter(
					(s) => s.id !== sectionId,
				);
				return {
					...targetProj.navigation,
					sections: hydrateSections(
						targetProj.navigation.sections,
						docPagesList,
					),
				};
			}
			return { id: "empty", locale: "en", sections: [], updatedAt: Date.now() };
		},
		async deletePage(
			id: string,
			projectId?: string,
		): Promise<DocNavigationManifest> {
			await delay(120);
			docPagesList = docPagesList.filter((p) => p.id !== id);

			// Remove from navigation tree
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
				targetProj.navigation.sections = targetProj.navigation.sections.map(
					(sec) => ({
						...sec,
						items: removeFromItems(sec.items),
					}),
				);
				return {
					...targetProj.navigation,
					sections: hydrateSections(
						targetProj.navigation.sections,
						docPagesList,
					),
				};
			}
			return { id: "empty", locale: "en", sections: [], updatedAt: Date.now() };
		},
	},
};

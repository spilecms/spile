import type {
	ActivityItem,
	AiSettings,
	ApiKey,
	ContentRevision,
	DocNavigationManifest,
	DocPage,
	DocPagePatch,
	DocumentationProject,
	DocumentationProjectPatch,
	EmailSettings,
	Member,
	MemberListParams,
	MemberPatch,
	Newsletter,
	NewsletterListParams,
	NewsletterPatch,
	Notification,
	OverviewStats,
	Post,
	PostListParams,
	PostPatch,
	ReviewRequest,
	StorageSettings,
	Tag,
	User,
	UserRole,
	ViewsPoint,
	ViewsRange,
	Webhook,
	WorkspaceLocale,
} from "@/types/domain";
import type {
	MediaItem,
	MediaListParams,
	MediaUpdatePayload,
	MediaUploadPayload,
} from "@/types/media";
import { http } from "./http";

export const api = {
	auth: {
		async login(
			email: string,
			password: string,
		): Promise<{ user: User; token: string }> {
			return http.post("/auth/login", { email, password });
		},
		async register(
			name: string,
			email: string,
			password: string,
			role?: UserRole,
		): Promise<{ user: User; token: string }> {
			return http.post("/auth/register", { name, email, password, role });
		},
		async me(): Promise<{ user: User }> {
			return http.get("/auth/me");
		},
		async logout(): Promise<void> {
			return http.post("/auth/logout");
		},
	},

	posts: {
		async list(params: PostListParams = {}): Promise<Post[]> {
			return http.get("/posts", params);
		},
		async get(id: string): Promise<Post> {
			return http.get(`/posts/${id}`);
		},
		async create(input: Partial<Post> = {}): Promise<Post> {
			return http.post("/posts", input);
		},
		async update(id: string, patch: PostPatch): Promise<Post> {
			return http.put(`/posts/${id}`, patch);
		},
		async remove(id: string): Promise<void> {
			await http.delete(`/posts/${id}`);
		},
		async duplicate(id: string): Promise<Post> {
			return http.post(`/posts/${id}/duplicate`);
		},
		async getTranslations(translationGroupId: string): Promise<Post[]> {
			return http.get(`/posts/translations/${translationGroupId}`);
		},
		async createTranslation(
			sourcePostId: string,
			targetLocale: string,
			copyContent = true,
		): Promise<Post> {
			return http.post(`/posts/${sourcePostId}/translations`, {
				locale: targetLocale,
				copyContent,
			});
		},
	},

	tags: {
		async list(): Promise<Tag[]> {
			return http.get("/tags");
		},
		async create(data: {
			name: string;
			slug?: string;
			color: string;
		}): Promise<Tag> {
			return http.post("/tags", data);
		},
		async update(
			id: string,
			patch: Partial<{ name: string; slug: string; color: string }>,
		): Promise<Tag> {
			return http.put(`/tags/${id}`, patch);
		},
		async delete(id: string): Promise<void> {
			await http.delete(`/tags/${id}`);
		},
	},

	locales: {
		async list(): Promise<WorkspaceLocale[]> {
			return http.get("/locales");
		},
		async add(loc: WorkspaceLocale): Promise<WorkspaceLocale> {
			return http.post("/locales", loc);
		},
		async remove(code: string): Promise<void> {
			await http.delete(`/locales/${code}`);
		},
		async setDefault(code: string): Promise<WorkspaceLocale> {
			return http.put(`/locales/${code}/default`);
		},
	},

	users: {
		async current(): Promise<User> {
			const res = await http.get<{ user: User }>("/auth/me");
			return res.user;
		},
		async list(): Promise<User[]> {
			return http.get("/users");
		},
		async invite(email: string, role: string, name?: string): Promise<User> {
			return http.post("/users/invite", { email, role, name });
		},
		async switchRole(role: UserRole): Promise<User> {
			return http.put("/users/profile", { role });
		},
		async setCurrentUser(userId: string): Promise<User> {
			const list = await http.get<User[]>("/users");
			const found = list.find((u) => u.id === userId);
			if (found) return found;
			return list[0];
		},
	},

	media: {
		async list(params: MediaListParams = {}): Promise<MediaItem[]> {
			return http.get("/media", params);
		},
		async get(id: string): Promise<MediaItem | null> {
			try {
				return await http.get(`/media/${id}`);
			} catch {
				return null;
			}
		},
		async upload(payload: MediaUploadPayload | FormData): Promise<MediaItem> {
			if (payload instanceof FormData) {
				return http.post("/media/upload", payload);
			}
			return http.post("/media/upload", payload);
		},
		async update(id: string, patch: MediaUpdatePayload): Promise<MediaItem> {
			return http.put(`/media/${id}`, patch);
		},
		async delete(id: string): Promise<void> {
			await http.delete(`/media/${id}`);
		},
		async bulkDelete(ids: string[]): Promise<void> {
			await http.post("/media/bulk-delete", { ids });
		},
		async getStats(): Promise<{
			totalCount: number;
			totalSize: number;
			imageCount: number;
			videoCount: number;
			audioCount: number;
			documentCount: number;
		}> {
			return http.get("/media/stats");
		},
		async getAllTags(): Promise<string[]> {
			return http.get("/media/tags");
		},
	},

	members: {
		async list(params: MemberListParams = {}): Promise<Member[]> {
			return http.get("/members", params);
		},
		async get(id: string): Promise<Member> {
			return http.get(`/members/${id}`);
		},
		async create(data: Partial<Member>): Promise<Member> {
			return http.post("/members", data);
		},
		async update(id: string, patch: MemberPatch): Promise<Member> {
			return http.put(`/members/${id}`, patch);
		},
		async remove(id: string): Promise<void> {
			await http.delete(`/members/${id}`);
		},
	},

	newsletters: {
		async list(params: NewsletterListParams = {}): Promise<Newsletter[]> {
			return http.get("/newsletters", params);
		},
		async get(id: string): Promise<Newsletter> {
			return http.get(`/newsletters/${id}`);
		},
		async create(input: Partial<Newsletter> = {}): Promise<Newsletter> {
			return http.post("/newsletters", input);
		},
		async update(id: string, patch: NewsletterPatch): Promise<Newsletter> {
			return http.put(`/newsletters/${id}`, patch);
		},
		async remove(id: string): Promise<void> {
			await http.delete(`/newsletters/${id}`);
		},
		async duplicate(id: string): Promise<Newsletter> {
			return http.post(`/newsletters/${id}/duplicate`);
		},
		async sendTest(
			id: string,
			email: string,
		): Promise<{ success: boolean; message: string }> {
			return http.post(`/newsletters/${id}/test`, { email });
		},
		async send(id: string): Promise<Newsletter> {
			return http.post(`/newsletters/${id}/send`);
		},
	},

	docs: {
		async listProjects(): Promise<DocumentationProject[]> {
			return http.get("/docs/projects");
		},
		async getProject(projectId: string): Promise<DocumentationProject | null> {
			try {
				return await http.get(`/docs/projects/${projectId}`);
			} catch {
				return null;
			}
		},
		async createProject(data: {
			title: string;
			description?: string;
		}): Promise<{ project: DocumentationProject; initialPage: DocPage }> {
			return http.post("/docs/projects", data);
		},
		async updateProject(
			projectId: string,
			patch: DocumentationProjectPatch,
		): Promise<DocumentationProject> {
			return http.put(`/docs/projects/${projectId}`, patch);
		},
		async deleteProject(projectId: string): Promise<void> {
			await http.delete(`/docs/projects/${projectId}`);
		},
		async getPage(pageId: string): Promise<DocPage | null> {
			try {
				return await http.get(`/docs/pages/${pageId}`);
			} catch {
				return null;
			}
		},
		async createPage(
			data: Partial<DocPage> & { projectId?: string; title?: string },
		): Promise<{ page: DocPage; navigation: DocNavigationManifest }> {
			const page = await http.post<DocPage>("/docs/pages", data);
			const proj = await http.get<DocumentationProject>(
				`/docs/projects/${data.projectId || page.projectId}`,
			);
			return { page, navigation: proj.navigation };
		},
		async updatePage(pageId: string, patch: DocPagePatch): Promise<DocPage> {
			return http.put(`/docs/pages/${pageId}`, patch);
		},
		async deletePage(pageId: string): Promise<void> {
			await http.delete(`/docs/pages/${pageId}`);
		},
	},

	revisions: {
		async list(
			targetType: "post" | "doc",
			targetId: string,
		): Promise<ContentRevision[]> {
			return http.get("/reviews/revisions", { targetType, targetId });
		},
		async get(id: string): Promise<ContentRevision | null> {
			try {
				return await http.get(`/reviews/revisions/${id}`);
			} catch {
				return null;
			}
		},
		async create(data: Partial<ContentRevision>): Promise<ContentRevision> {
			return http.post("/reviews/revisions", data);
		},
		async restore(revisionId: string): Promise<ContentRevision> {
			return http.post(`/reviews/revisions/${revisionId}/restore`);
		},
	},

	reviews: {
		async getPending(
			targetType: "post" | "doc",
			targetId: string,
		): Promise<ReviewRequest | null> {
			const list = await http.get<ReviewRequest[]>("/reviews/requests", {
				status: "in_review",
			});
			return (
				list.find(
					(r) => r.targetType === targetType && r.targetId === targetId,
				) ?? null
			);
		},
		async get(id: string): Promise<ReviewRequest | null> {
			try {
				return await http.get(`/reviews/requests/${id}`);
			} catch {
				return null;
			}
		},
		async list(): Promise<ReviewRequest[]> {
			return http.get("/reviews/requests");
		},
		async submit(data: {
			targetType: "post" | "doc";
			targetId: string;
			targetTitle: string;
			content: unknown;
			summary: string;
			reviewerId?: string;
		}): Promise<ReviewRequest> {
			// First create revision
			const rev = await http.post<ContentRevision>("/reviews/revisions", {
				targetType: data.targetType,
				targetId: data.targetId,
				title: data.targetTitle,
				summary: data.summary,
				content: data.content,
			});
			return http.post("/reviews/requests", {
				targetType: data.targetType,
				targetId: data.targetId,
				targetTitle: data.targetTitle,
				revisionId: rev.id,
				summary: data.summary,
			});
		},
		async approve(
			reviewId: string,
			notes?: string,
		): Promise<{ review: ReviewRequest; revision: ContentRevision }> {
			const review = await http.put<ReviewRequest>(
				`/reviews/requests/${reviewId}`,
				{
					status: "approved",
					reviewNotes: notes,
				},
			);
			return { review, revision: {} as ContentRevision };
		},
		async requestChanges(
			reviewId: string,
			notes: string,
		): Promise<ReviewRequest> {
			return http.put(`/reviews/requests/${reviewId}`, {
				status: "changes_requested",
				reviewNotes: notes,
			});
		},
		async withdraw(reviewId: string): Promise<ReviewRequest> {
			return http.put(`/reviews/requests/${reviewId}`, {
				status: "withdrawn",
			});
		},
	},

	notifications: {
		async list(): Promise<Notification[]> {
			return http.get("/notifications");
		},
		async markAsRead(id: string): Promise<void> {
			await http.put(`/notifications/${id}/read`);
		},
		async markAllAsRead(): Promise<void> {
			const list = await http.get<Notification[]>("/notifications");
			await Promise.all(
				list
					.filter((n) => !n.read)
					.map((n) => http.put(`/notifications/${n.id}/read`)),
			);
		},
		async countUnread(): Promise<number> {
			const list = await http.get<Notification[]>("/notifications");
			return list.filter((n) => !n.read).length;
		},
	},

	settings: {
		async getStorage(): Promise<StorageSettings> {
			return http.get("/settings/storage");
		},
		async updateStorage(
			patch: Partial<StorageSettings>,
		): Promise<StorageSettings> {
			return http.put("/settings/storage", patch);
		},
		async getEmail(): Promise<EmailSettings> {
			return http.get("/settings/email");
		},
		async updateEmail(patch: Partial<EmailSettings>): Promise<EmailSettings> {
			return http.put("/settings/email", patch);
		},
		async getAi(): Promise<AiSettings> {
			return http.get("/settings/ai");
		},
		async updateAi(patch: Partial<AiSettings>): Promise<AiSettings> {
			return http.put("/settings/ai", patch);
		},
		async listApiKeys(): Promise<ApiKey[]> {
			return http.get("/settings/api-keys");
		},
		async createApiKey(
			name: string,
			type: "public_read" | "admin_secret",
		): Promise<ApiKey> {
			return http.post("/settings/api-keys", { name, type });
		},
		async deleteApiKey(id: string): Promise<void> {
			await http.delete(`/settings/api-keys/${id}`);
		},
		async listWebhooks(): Promise<Webhook[]> {
			return http.get("/settings/webhooks");
		},
		async createWebhook(data: {
			name: string;
			url: string;
			events: string[];
		}): Promise<Webhook> {
			return http.post("/settings/webhooks", data);
		},
		async deleteWebhook(id: string): Promise<void> {
			await http.delete(`/settings/webhooks/${id}`);
		},
	},

	overview: {
		async stats(): Promise<OverviewStats> {
			return http.get("/overview/stats");
		},
		async views(range: ViewsRange = "30d"): Promise<ViewsPoint[]> {
			return http.get("/overview/views", { range });
		},
		async activity(): Promise<ActivityItem[]> {
			return http.get("/overview/activity");
		},
	},

	analytics: {
		async getOverview(
			timeRange: import("@/types/analytics").AnalyticsTimeRange = "30d",
		) {
			const { mockOverviewData } = await import("@/lib/mock/analytics-data");
			return mockOverviewData[timeRange] ?? mockOverviewData["30d"];
		},
		async getTimeSeries(
			timeRange: import("@/types/analytics").AnalyticsTimeRange = "30d",
		) {
			const { generateAnalyticsTimeSeries } = await import(
				"@/lib/mock/analytics-data"
			);
			return generateAnalyticsTimeSeries(timeRange);
		},
		async getDocPages() {
			const { mockDocPagesAnalytics } = await import(
				"@/lib/mock/analytics-data"
			);
			return mockDocPagesAnalytics;
		},
		async getPosts() {
			const { mockPostsAnalytics } = await import("@/lib/mock/analytics-data");
			return mockPostsAnalytics;
		},
		async getCountries() {
			const { mockCountryTraffic } = await import("@/lib/mock/analytics-data");
			return mockCountryTraffic;
		},
		async getReferrers() {
			const { mockReferrerSources } = await import("@/lib/mock/analytics-data");
			return mockReferrerSources;
		},
		async getDevices() {
			const { mockDeviceDistribution } = await import(
				"@/lib/mock/analytics-data"
			);
			return mockDeviceDistribution;
		},
		async getEntityDetail(
			entityType: "post" | "doc",
			entityId: string,
			timeRange: import("@/types/analytics").AnalyticsTimeRange = "30d",
		) {
			const { getEntityAnalyticsDetail } = await import(
				"@/lib/mock/analytics-data"
			);
			return getEntityAnalyticsDetail(entityType, entityId, timeRange);
		},
	},
};

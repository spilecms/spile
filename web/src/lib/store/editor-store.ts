import type { OutputData } from "@editorjs/editorjs";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
	DocPage,
	Newsletter,
	Post,
	PostSeo,
	PostStatus,
} from "@/types/domain";

export type ContentType = "post" | "doc" | "newsletter";

interface EditorState {
	postId: string | null;
	type: ContentType;
	status: PostStatus;
	blocks: OutputData;
	title: string;
	excerpt: string;
	slug: string;
	featuredImage: string | undefined;
	tagIds: string[];
	seo: PostSeo;
	publishedAt: number | null;
	scheduledFor: number | null;
	updatedAt: number | null;
	locale: string;
	isDefaultLocale: boolean;
	translationGroupId: string | null;
	translationSourceId: string | null;
	setBlocks: (blocks: OutputData) => void;
	setTitle: (title: string) => void;
	loadPost: (post: Post) => void;
	loadDoc: (doc: DocPage) => void;
	loadNewsletter: (newsletter: Newsletter) => void;
	patchMeta: (patch: Partial<Omit<EditorState, keyof EditorActions>>) => void;
	reset: () => void;
}

type EditorActions =
	| "setBlocks"
	| "setTitle"
	| "loadPost"
	| "loadDoc"
	| "loadNewsletter"
	| "patchMeta"
	| "reset";

const emptyState = {
	postId: null,
	type: "post" as ContentType,
	status: "draft" as PostStatus,
	blocks: { blocks: [] } as OutputData,
	title: "",
	excerpt: "",
	slug: "",
	featuredImage: undefined,
	tagIds: [] as string[],
	seo: {} as PostSeo,
	publishedAt: null,
	scheduledFor: null,
	updatedAt: null,
	locale: "en",
	isDefaultLocale: true,
	translationGroupId: null,
	translationSourceId: null,
};

export const useEditorStore = create<EditorState>()(
	persist(
		(set) => ({
			...emptyState,
			setBlocks: (blocks) => set({ blocks, updatedAt: Date.now() }),
			setTitle: (title) => set({ title, updatedAt: Date.now() }),
			loadPost: (post) =>
				set({
					postId: post.id,
					type: "post",
					status: post.status,
					blocks: post.content ?? { blocks: [] },
					title: post.title,
					excerpt: post.excerpt,
					slug: post.slug,
					featuredImage: post.featuredImage,
					tagIds: post.tagIds,
					seo: post.seo,
					publishedAt: post.publishedAt,
					scheduledFor: post.scheduledFor,
					updatedAt: post.updatedAt,
					locale: post.locale ?? "en",
					isDefaultLocale:
						post.isDefaultLocale ?? (post.locale === "en" || !post.locale),
					translationGroupId: post.translationGroupId ?? post.id,
					translationSourceId: post.translationSourceId ?? null,
				}),
			loadDoc: (doc) =>
				set({
					postId: doc.id,
					type: "doc",
					status: doc.status,
					blocks: doc.content ?? { blocks: [] },
					title: doc.title,
					excerpt: "",
					slug: doc.slug,
					featuredImage: undefined,
					tagIds: [],
					seo: {},
					publishedAt: doc.status === "published" ? doc.updatedAt : null,
					scheduledFor: null,
					updatedAt: doc.updatedAt,
					locale: doc.locale ?? "en",
					isDefaultLocale:
						doc.isDefaultLocale ?? (doc.locale === "en" || !doc.locale),
					translationGroupId: doc.translationGroupId ?? doc.id,
					translationSourceId: doc.translationSourceId ?? null,
				}),
			loadNewsletter: (nl) =>
				set({
					postId: nl.id,
					type: "newsletter",
					status: (nl.status === "sent" ? "published" : "draft") as PostStatus,
					blocks: nl.content ?? { blocks: [] },
					title: nl.subject,
					excerpt: nl.previewText ?? "",
					slug: nl.title,
					featuredImage: undefined,
					tagIds: [],
					seo: {},
					publishedAt: nl.sentAt,
					scheduledFor: nl.scheduledFor,
					updatedAt: nl.updatedAt,
					locale: "en",
					isDefaultLocale: true,
					translationGroupId: nl.id,
					translationSourceId: null,
				}),
			patchMeta: (patch) => set({ ...patch, updatedAt: Date.now() }),
			reset: () => set({ ...emptyState }),
		}),
		{
			name: "spile-editor",
			storage: createJSONStorage(() => localStorage),
			partialize: (state) => ({
				postId: state.postId,
				type: state.type,
				status: state.status,
				blocks: state.blocks,
				title: state.title,
				excerpt: state.excerpt,
				slug: state.slug,
				featuredImage: state.featuredImage,
				tagIds: state.tagIds,
				seo: state.seo,
				publishedAt: state.publishedAt,
				scheduledFor: state.scheduledFor,
				updatedAt: state.updatedAt,
				locale: state.locale,
				isDefaultLocale: state.isDefaultLocale,
				translationGroupId: state.translationGroupId,
				translationSourceId: state.translationSourceId,
			}),
		},
	),
);

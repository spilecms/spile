import type { OutputData } from "@editorjs/editorjs";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Post, PostSeo, PostStatus, PostType } from "@/types/domain";

interface EditorState {
	postId: string | null;
	type: PostType;
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
	setBlocks: (blocks: OutputData) => void;
	setTitle: (title: string) => void;
	loadPost: (post: Post) => void;
	patchMeta: (patch: Partial<Omit<EditorState, keyof EditorActions>>) => void;
	reset: () => void;
}

type EditorActions =
	| "setBlocks"
	| "setTitle"
	| "loadPost"
	| "patchMeta"
	| "reset";

const emptyState = {
	postId: null,
	type: "post" as PostType,
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
					type: post.type,
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
			}),
		},
	),
);

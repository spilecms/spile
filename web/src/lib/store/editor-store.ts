import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { OutputData } from "@editorjs/editorjs";

interface EditorState {
	blocks: OutputData;
	title: string;
	updatedAt: number | null;
	setBlocks: (blocks: OutputData) => void;
	setTitle: (title: string) => void;
}

export const useEditorStore = create<EditorState>()(
	persist(
		(set) => ({
			blocks: { blocks: [] },
			title: "",
			updatedAt: null,
			setBlocks: (blocks) => set({ blocks, updatedAt: Date.now() }),
			setTitle: (title) => set({ title, updatedAt: Date.now() }),
		}),
		{
			name: "spile-editor",
			storage: createJSONStorage(() => localStorage),
			partialize: (state) => ({
				blocks: state.blocks,
				title: state.title,
				updatedAt: state.updatedAt,
			}),
		},
	),
);

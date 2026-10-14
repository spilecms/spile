import {
	type Block,
	filterSuggestionItems,
	type PartialBlock,
} from "@blocknote/core";
import { SuggestionMenuController, useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { mockApi } from "@/lib/mock/api";
import { useEditorStore } from "@/lib/store/editor-store";
import { getCustomSlashMenuItems, schema } from "./blocks/schema";
import { FloatingToc } from "./floating-toc";
import Navbar from "./navbar";
import { TranslationContextBanner } from "./translation-context-banner";

const AUTOSAVE_DELAY = 800;

export default function Editor({
	onPublish,
	backUrl = "/posts",
	sidebar,
	isSidebarOpen,
	onToggleSidebar,
	readOnly = false,
	isContributor = false,
	isLocked = false,
	onSubmitReview,
	onHistory,
	banner,
}: {
	onPublish: () => void;
	backUrl?: string;
	sidebar?: React.ReactNode;
	isSidebarOpen?: boolean;
	onToggleSidebar?: () => void;
	readOnly?: boolean;
	isContributor?: boolean;
	isLocked?: boolean;
	onSubmitReview?: () => void;
	onHistory?: () => void;
	banner?: React.ReactNode;
}) {
	const queryClient = useQueryClient();
	const containerRef = useRef<HTMLDivElement>(null);
	const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const cancelledRef = useRef(false);
	const [saving, setSaving] = useState(false);
	const [savedAt, setSavedAt] = useState<number | null>(null);

	const blocks = useEditorStore((s) => s.blocks);
	const setBlocks = useEditorStore((s) => s.setBlocks);
	const title = useEditorStore((s) => s.title);
	const setTitle = useEditorStore((s) => s.setTitle);
	const setSaveContent = useEditorStore((s) => s.setSaveContent);
	const setRenderContent = useEditorStore((s) => s.setRenderContent);

	const editor = useCreateBlockNote({
		schema,
		initialContent:
			blocks && blocks.length > 0
				? (blocks as unknown as PartialBlock<(typeof schema)["blockSchema"]>[])
				: undefined,
		uploadFile: async (file: File) => {
			const formData = new FormData();
			formData.append("file", file);
			const item = await mockApi.media.upload(formData);
			return item.url;
		},
	});

	const flushSave = useCallback(async () => {
		if (cancelledRef.current || readOnly || !editor) return;
		if (autosaveTimer.current) {
			clearTimeout(autosaveTimer.current);
			autosaveTimer.current = null;
		}
		const { postId } = useEditorStore.getState();
		if (!postId) return;

		setSaving(true);
		try {
			const data = editor.document as unknown as Block[];
			setBlocks(data);
			const {
				type: itemType,
				title: currentTitle,
				excerpt,
				slug,
				status,
				tagIds,
				seo,
				scheduledFor,
				featuredImage,
			} = useEditorStore.getState();

			if (itemType === "doc") {
				const updated = await mockApi.docs.updatePage(postId, {
					title: currentTitle,
					content: data,
					slug,
					status: status === "published" ? "published" : "draft",
				});
				queryClient.setQueryData(["docs", postId], updated);
			} else if (itemType === "newsletter") {
				const updated = await mockApi.newsletters.update(postId, {
					subject: currentTitle,
					previewText: excerpt,
					content: data,
				});
				queryClient.setQueryData(["newsletters", postId], updated);
			} else {
				const updated = await mockApi.posts.update(postId, {
					title: currentTitle,
					content: data,
					excerpt,
					slug,
					status,
					tagIds,
					seo,
					scheduledFor,
					featuredImage,
				});
				queryClient.setQueryData(["posts", postId], updated);
			}
			if (!cancelledRef.current) {
				setSavedAt(Date.now());
			}
		} catch (err) {
			console.error("Save failed:", err);
		} finally {
			if (!cancelledRef.current) setSaving(false);
		}
	}, [editor, setBlocks, readOnly, queryClient]);

	const flushSaveRef = useRef(flushSave);
	flushSaveRef.current = flushSave;

	const scheduleSave = useCallback(() => {
		setSaving(true);
		if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
		autosaveTimer.current = setTimeout(() => {
			flushSaveRef.current();
		}, AUTOSAVE_DELAY);
	}, []);

	const scheduleSaveRef = useRef(scheduleSave);
	scheduleSaveRef.current = scheduleSave;

	useEffect(() => {
		setSaveContent(flushSave);
		return () => {
			setSaveContent(null);
		};
	}, [flushSave, setSaveContent]);

	useEffect(() => {
		if (!editor) return;
		return editor.onChange(() => {
			scheduleSaveRef.current();
		});
	}, [editor]);

	useEffect(() => {
		if (!editor) return;
		setRenderContent(async (data) => {
			if (editor && data) {
				editor.replaceBlocks(
					editor.document,
					data as unknown as PartialBlock<(typeof schema)["blockSchema"]>[],
				);
			}
			setBlocks(data as unknown as Block[]);
		});
		return () => {
			setRenderContent(null);
		};
	}, [editor, setBlocks, setRenderContent]);

	return (
		<div className="flex h-screen flex-col overflow-hidden bg-background">
			<Navbar
				title={title}
				onTitleChange={(newTitle) => {
					if (!readOnly) {
						setTitle(newTitle);
						scheduleSave();
					}
				}}
				onUndo={() => {
					const tiptap = (
						editor as unknown as {
							_tiptapEditor?: { commands?: { undo?: () => void } };
						}
					)?._tiptapEditor;
					tiptap?.commands?.undo?.();
				}}
				onRedo={() => {
					const tiptap = (
						editor as unknown as {
							_tiptapEditor?: { commands?: { redo?: () => void } };
						}
					)?._tiptapEditor;
					tiptap?.commands?.redo?.();
				}}
				onPublish={onPublish}
				saving={saving}
				savedAt={savedAt}
				backUrl={backUrl}
				isSidebarOpen={sidebar ? isSidebarOpen : false}
				onToggleSidebar={sidebar ? onToggleSidebar : undefined}
				isContributor={isContributor}
				isLocked={isLocked}
				onSubmitReview={onSubmitReview}
				onHistory={onHistory}
			/>
			{banner}
			<TranslationContextBanner />
			<div className="flex flex-1 min-h-0 overflow-hidden">
				{sidebar && isSidebarOpen && (
					<aside className="w-72 shrink-0 border-r md:w-80 h-full overflow-y-auto bg-background/95 editor-scroll">
						{sidebar}
					</aside>
				)}
				<main className="flex-1 h-full overflow-y-auto min-w-0 pt-6 editor-scroll">
					<FloatingToc editorContainerRef={containerRef} />
					<div
						ref={containerRef}
						className="px-6 md:px-12 py-4 max-w-4xl mx-auto"
					>
						<BlockNoteView
							editor={editor}
							editable={!readOnly}
							slashMenu={false}
						>
							<SuggestionMenuController
								triggerCharacter="/"
								getItems={async (query) =>
									filterSuggestionItems(getCustomSlashMenuItems(editor), query)
								}
							/>
						</BlockNoteView>
					</div>
				</main>
			</div>
		</div>
	);
}

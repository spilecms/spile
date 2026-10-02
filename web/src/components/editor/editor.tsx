import AttachesTool from "@editorjs/attaches";
import Checklist from "@editorjs/checklist";
import Delimiter from "@editorjs/delimiter";
import EditorJS, {
	type ToolConstructable,
} from "@editorjs/editorjs";
import Header from "@editorjs/header";
import ImageTool from "@editorjs/image";
import InlineCode from "@editorjs/inline-code";
import Marker from "@editorjs/marker";
import NestedList from "@editorjs/nested-list";
import Quote from "@editorjs/quote";
import Table from "@editorjs/table";
import Underline from "@editorjs/underline";
import DragDrop from "editorjs-dnd";
import Undo from "editorjs-undo";
import { useCallback, useEffect, useRef, useState } from "react";
import { mockApi } from "@/lib/mock/api";
import { useEditorStore } from "@/lib/store/editor-store";
import Navbar from "./navbar";
import CodeHighlightTool from "./plugins/code-highlight";
import HtmlEmbedTool from "./plugins/html-embed";
import InlineFormulaTool from "./plugins/inline-formula";
import { createMediaTool } from "./plugins/media";
import TocTool from "./plugins/toc";

const AUTOSAVE_DELAY = 800;

export default function Editor({ onPublish }: { onPublish: () => void }) {
	const containerRef = useRef<HTMLDivElement>(null);
	const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const undoRef = useRef<Undo | null>(null);
	const editorRef = useRef<EditorJS | null>(null);
	const cancelledRef = useRef(false);
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [savedAt, setSavedAt] = useState<number | null>(null);

	const setBlocks = useEditorStore((s) => s.setBlocks);
	const title = useEditorStore((s) => s.title);
	const setTitle = useEditorStore((s) => s.setTitle);

	const scheduleSave = useCallback(() => {
		setSaving(true);
		if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
		autosaveTimer.current = setTimeout(async () => {
			if (cancelledRef.current) return;
			const editor = editorRef.current;
			const { postId } = useEditorStore.getState();
			if (!postId) {
				setSaving(false);
				return;
			}

			try {
				let data = useEditorStore.getState().blocks;
				if (editor && typeof editor.save === "function") {
					data = await editor.save();
					setBlocks(data);
				}
				const {
					title: currentTitle,
					excerpt,
					slug,
					status,
					tagIds,
					seo,
					scheduledFor,
					featuredImage,
				} = useEditorStore.getState();

				await mockApi.posts.update(postId, {
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
				if (!cancelledRef.current) {
					setSavedAt(Date.now());
				}
			} catch (err) {
				console.error("Autosave failed:", err);
			} finally {
				if (!cancelledRef.current) setSaving(false);
			}
		}, AUTOSAVE_DELAY);
	}, [setBlocks]);

	const scheduleSaveRef = useRef(scheduleSave);
	scheduleSaveRef.current = scheduleSave;

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		cancelledRef.current = false;
		const holder = document.createElement("div");
		container.appendChild(holder);

		let editor: EditorJS | null = null;

		try {
			const { blocks } = useEditorStore.getState();
			editor = new EditorJS({
				holder,
				...(blocks.blocks.length > 0 ? { data: blocks } : {}),
				placeholder: "Start writing…",
				tools: {
					header: Header,
					list: {
						class: NestedList as unknown as ToolConstructable,
						inlineToolbar: true,
						config: {
							defaultStyle: "unordered",
						},
					},
					table: Table,
					code: CodeHighlightTool,
					inlineCode: InlineCode,
					quote: { class: Quote, inlineToolbar: true },
					delimiter: Delimiter,
					marker: { class: Marker, shortcut: "CMD+SHIFT+M" },
					checklist: Checklist,
					image: {
						class: ImageTool,
						config: {
							uploader: {
								async uploadByFile(file: File) {
									// TODO: upload to your backend and return this shape
									// const url = await upload(file);
									return {
										success: 1,
										file: { url: URL.createObjectURL(file) },
									};
								},
							},
						},
					},
					video: createMediaTool("video"),
					audio: createMediaTool("audio"),
					attaches: {
						class: AttachesTool,
						config: {
							uploader: {
								async uploadByFile(file: File) {
									// TODO: upload to your backend and return this shape
									return {
										success: 1,
										file: {
											url: URL.createObjectURL(file),
											name: file.name,
											size: file.size,
											extension: file.name.split(".").pop() ?? "",
										},
									};
								},
							},
						},
					},
					toc: TocTool,
					htmlEmbed: HtmlEmbedTool,
					underline: Underline,
					inlineFormula: { class: InlineFormulaTool },
				},
				onReady: () => {
					if (!cancelledRef.current && editor) {
						editorRef.current = editor;
						undoRef.current = new Undo({ editor });
						undoRef.current.initialize(blocks);
						const dragDrop = new DragDrop(editor, {
							dropLineColor: "oklch(0.398 0.195 277.366)",
							dropLineStyle: "solid",
							dropLineSize: 2,
						});
						holder.addEventListener("dragend", () => {
							dragDrop.startBlockIndex = null;
						});
					}
				},
				onChange: () => scheduleSaveRef.current(),
			});

			// Async init failures land here, not in the catch below
			editor.isReady.catch((err) => {
				if (!cancelledRef.current) {
					setError(
						err instanceof Error ? err.message : "Failed to initialize editor",
					);
				}
			});
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to initialize editor",
			);
		}

		return () => {
			cancelledRef.current = true;
			editorRef.current = null;
			if (autosaveTimer.current) {
				clearTimeout(autosaveTimer.current);
				autosaveTimer.current = null;
			}
			undoRef.current = null;
			const toDestroy = editor;
			editor = null;

			toDestroy?.isReady
				.then(() => toDestroy.destroy())
				.catch((err) => console.error("Editor.js cleanup error:", err))
				.finally(() => holder.remove());
		};
	}, []);

	if (error) {
		return (
			<div className="p-4 text-sm text-red-500 bg-red-50 rounded-md border border-red-200 dark:bg-red-950/50 dark:border-red-900">
				Error loading editor: {error}
			</div>
		);
	}

	return (
		<div className="flex min-h-screen flex-col">
			<Navbar
				title={title}
				onTitleChange={(newTitle) => {
					setTitle(newTitle);
					scheduleSave();
				}}
				onUndo={() => undoRef.current?.undo()}
				onRedo={() => undoRef.current?.redo()}
				onPublish={onPublish}
				saving={saving}
				savedAt={savedAt}
			/>
			<main className="flex-1 mt-14">
				<div ref={containerRef} />
			</main>
		</div>
	);
}

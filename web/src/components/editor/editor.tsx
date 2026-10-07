import AttachesTool from "@editorjs/attaches";
import Checklist from "@editorjs/checklist";
import Delimiter from "@editorjs/delimiter";
import EditorJS, {
	type OutputData,
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
import Warning from "@editorjs/warning";
import DragDrop from "editorjs-dnd";
import Undo from "editorjs-undo";
import { useCallback, useEffect, useRef, useState } from "react";
import { mockApi } from "@/lib/mock/api";
import { useEditorStore } from "@/lib/store/editor-store";
import { FloatingToc } from "./floating-toc";
import Navbar from "./navbar";
import AccordionTool from "./plugins/accordion";
import CalloutTool from "./plugins/callout";
import CodeGroupTool from "./plugins/code-group";
import CodeHighlightTool from "./plugins/code-highlight";
import ExpandableTool from "./plugins/expandable";
import HtmlEmbedTool from "./plugins/html-embed";
import ColorInlineTool from "./plugins/inline-color";
import InlineFormulaTool from "./plugins/inline-formula";
import { createMediaTool } from "./plugins/media";
import ParamFieldTool from "./plugins/param-field";
import RequestExampleTool from "./plugins/request-example";
import ResponseExampleTool from "./plugins/response-example";
import ResponseFieldTool from "./plugins/response-field";
import TocTool from "./plugins/toc";
import { setupToolboxOrganizer } from "./plugins/toolbox-organizer";
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
	const setSaveContent = useEditorStore((s) => s.setSaveContent);
	const setRenderContent = useEditorStore((s) => s.setRenderContent);

	const flushSave = useCallback(async () => {
		if (cancelledRef.current || readOnly) return;
		if (autosaveTimer.current) {
			clearTimeout(autosaveTimer.current);
			autosaveTimer.current = null;
		}
		const editor = editorRef.current;
		const { postId } = useEditorStore.getState();
		if (!postId) return;

		setSaving(true);
		try {
			let data = useEditorStore.getState().blocks;
			if (editor && typeof editor.save === "function") {
				data = await editor.save();
				setBlocks(data);
			}
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
				await mockApi.docs.updatePage(postId, {
					title: currentTitle,
					content: data,
					slug,
					status: status === "published" ? "published" : "draft",
				});
			} else if (itemType === "newsletter") {
				await mockApi.newsletters.update(postId, {
					subject: currentTitle,
					previewText: excerpt,
					content: data,
				});
			} else {
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
			}
			if (!cancelledRef.current) {
				setSavedAt(Date.now());
			}
		} catch (err) {
			console.error("Save failed:", err);
		} finally {
			if (!cancelledRef.current) setSaving(false);
		}
	}, [setBlocks, readOnly]);

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
		const container = containerRef.current;
		if (!container) return;

		cancelledRef.current = false;
		const holder = document.createElement("div");
		container.appendChild(holder);

		let editor: EditorJS | null = null;
		let cleanupOrganizer: (() => void) | null = null;

		try {
			const { blocks } = useEditorStore.getState();
			editor = new EditorJS({
				holder,
				readOnly: Boolean(readOnly),
				...(blocks.blocks.length > 0 ? { data: blocks } : {}),
				placeholder: "Start writing…",
				tools: {
					// 1. Basic Blocks
					header: Header,
					list: {
						class: NestedList as unknown as ToolConstructable,
						inlineToolbar: true,
						config: {
							defaultStyle: "unordered",
						},
					},
					checklist: Checklist,
					quote: { class: Quote, inlineToolbar: true },
					delimiter: Delimiter,

					// 2. Media
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

					// 3. Advanced & Technical Documentation Blocks
					table: Table,
					code: CodeHighlightTool,
					codeGroup: CodeGroupTool,
					callout: CalloutTool,
					accordion: AccordionTool,
					warning: Warning,
					toc: TocTool,
					htmlEmbed: HtmlEmbedTool,

					// 4. API Reference Blocks
					paramField: ParamFieldTool,
					responseField: ResponseFieldTool,
					expandable: ExpandableTool,
					requestExample: RequestExampleTool,
					responseExample: ResponseExampleTool,

					// 5. Inline Tools (not displayed in Toolbox)
					inlineCode: InlineCode,
					marker: { class: Marker, shortcut: "CMD+SHIFT+M" },
					color: { class: ColorInlineTool, shortcut: "CMD+SHIFT+C" },
					underline: Underline,
					inlineFormula: { class: InlineFormulaTool },
				},
				autofocus: true,
				onReady: () => {
					if (!cancelledRef.current && editor) {
						editorRef.current = editor;
						cleanupOrganizer = setupToolboxOrganizer(holder);
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
						setRenderContent(async (data: OutputData) => {
							if (
								editorRef.current &&
								typeof editorRef.current.render === "function"
							) {
								await editorRef.current.render(data);
							}
							setBlocks(data);
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
			setRenderContent(null);
			if (cleanupOrganizer) {
				cleanupOrganizer();
				cleanupOrganizer = null;
			}
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
	}, [readOnly, setBlocks, setRenderContent]);

	if (error) {
		return (
			<div className="p-4 text-sm text-red-500 bg-red-50 rounded-md border border-red-200 dark:bg-red-950/50 dark:border-red-900">
				Error loading editor: {error}
			</div>
		);
	}

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
				onUndo={() => undoRef.current?.undo()}
				onRedo={() => undoRef.current?.redo()}
				onPublish={onPublish}
				saving={saving}
				savedAt={savedAt}
				backUrl={backUrl}
				isSidebarOpen={isSidebarOpen}
				onToggleSidebar={onToggleSidebar}
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
					<div ref={containerRef} />
				</main>
			</div>
		</div>
	);
}

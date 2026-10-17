import {
	type Block,
	filterSuggestionItems,
	type PartialBlock,
} from "@blocknote/core";
import { SideMenuExtension } from "@blocknote/core/extensions";
import {
	BasicTextStyleButton,
	ColorStyleButton,
	CreateLinkButton,
	DragHandleButton,
	FormattingToolbar,
	FormattingToolbarController,
	NestBlockButton,
	SideMenu,
	SideMenuController,
	type SideMenuProps,
	SuggestionMenuController,
	TextAlignButton,
	UnnestBlockButton,
	useBlockNoteEditor,
	useCreateBlockNote,
	useExtensionState,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { mockApi } from "@/lib/mock/api";
import { useEditorStore } from "@/lib/store/editor-store";
import { cn } from "@/lib/utils";
import { getCustomSlashMenuItems, schema } from "./blocks/schema";
import { FloatingToc } from "./floating-toc";
import Navbar from "./navbar";
import { CustomSlashMenu } from "./slash-menu";
import { TranslationContextBanner } from "./translation-context-banner";

const AUTOSAVE_DELAY = 500;
const CACHE_UPDATE_DELAY = 2000;

const customShadCNComponents = {
	Toggle: {
		Toggle: forwardRef<
			HTMLButtonElement,
			React.ButtonHTMLAttributes<HTMLButtonElement> & {
				pressed?: boolean;
				variant?: string;
				size?: string;
			}
		>(
			(
				{
					className,
					pressed,
					onClick,
					onMouseDown,
					type = "button",
					children,
					...props
				},
				ref,
			) => (
				<button
					ref={ref}
					type={type}
					data-state={pressed ? "on" : "off"}
					aria-pressed={pressed}
					onMouseDown={(e) => {
						e.preventDefault();
						onMouseDown?.(e);
					}}
					onClick={(e) => {
						onClick?.(e);
					}}
					className={cn(
						"inline-flex items-center justify-center rounded text-xs font-medium transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 h-7 min-w-7 px-1.5 [&_svg]:size-3.5",
						pressed && "bg-muted text-foreground font-semibold",
						className,
					)}
					{...props}
				>
					{children}
				</button>
			),
		),
	},
};

function CustomFormattingToolbar() {
	return (
		<FormattingToolbar>
			<BasicTextStyleButton basicTextStyle="bold" key="boldStyleButton" />
			<BasicTextStyleButton basicTextStyle="italic" key="italicStyleButton" />
			<BasicTextStyleButton
				basicTextStyle="underline"
				key="underlineStyleButton"
			/>
			<BasicTextStyleButton basicTextStyle="strike" key="strikeStyleButton" />
			<BasicTextStyleButton basicTextStyle="code" key="codeStyleButton" />
			<TextAlignButton textAlignment="left" key="textAlignLeftButton" />
			<TextAlignButton textAlignment="center" key="textAlignCenterButton" />
			<TextAlignButton textAlignment="right" key="textAlignRightButton" />
			<ColorStyleButton key="colorStyleButton" />
			<NestBlockButton key="nestBlockButton" />
			<UnnestBlockButton key="unnestBlockButton" />
			<CreateLinkButton key="createLinkButton" />
		</FormattingToolbar>
	);
}

function CustomAddBlockButton() {
	const editor = useBlockNoteEditor();
	const block = useExtensionState(SideMenuExtension, {
		editor,
		selector: (state) => state?.block,
	});

	const onClick = useCallback(() => {
		if (block === undefined) return;
		const content = block.content;
		if (
			content !== undefined &&
			Array.isArray(content) &&
			content.length === 0
		) {
			editor.setTextCursorPosition(block);
			editor.focus();
		} else {
			const insertedBlock = editor.insertBlocks(
				[{ type: "paragraph" }],
				block,
				"after",
			)[0];
			editor.setTextCursorPosition(insertedBlock);
			editor.focus();
		}
	}, [block, editor]);

	if (block === undefined) return null;

	return (
		<button
			type="button"
			onMouseDown={(e) => {
				// Prevent blur on editor before click fires
				e.preventDefault();
			}}
			onClick={onClick}
			className="inline-flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
			title="Add block below"
			aria-label="Add block"
		>
			<Plus className="size-4" />
		</button>
	);
}

function CustomSideMenu(props: SideMenuProps) {
	return (
		<SideMenu {...props}>
			<CustomAddBlockButton />
			<DragHandleButton dragHandleMenu={props.dragHandleMenu} />
		</SideMenu>
	);
}

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
	const cacheTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const pendingCacheUpdate = useRef<{
		key: readonly unknown[];
		data: unknown;
	} | null>(null);
	const dirtyRef = useRef(false);
	const cancelledRef = useRef(false);
	const [saving, setSaving] = useState(false);
	const [savedAt, setSavedAt] = useState<number | null>(null);

	const blocks = useEditorStore((s) => s.blocks);
	const setBlocks = useEditorStore((s) => s.setBlocks);
	const title = useEditorStore((s) => s.title);
	const setTitle = useEditorStore((s) => s.setTitle);
	const setSaveContent = useEditorStore((s) => s.setSaveContent);
	const setRenderContent = useEditorStore((s) => s.setRenderContent);
	const setGetBlocks = useEditorStore((s) => s.setGetBlocks);

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

	// Debounced React Query cache update: batch rapid autosaves so the page
	// (and editor tree) isn't re-rendered once per save.
	const scheduleCacheUpdate = useCallback(
		(key: readonly unknown[], data: unknown) => {
			pendingCacheUpdate.current = { key, data };
			if (cacheTimer.current) clearTimeout(cacheTimer.current);
			cacheTimer.current = setTimeout(() => {
				cacheTimer.current = null;
				const pending = pendingCacheUpdate.current;
				pendingCacheUpdate.current = null;
				if (pending) queryClient.setQueryData(pending.key, pending.data);
			}, CACHE_UPDATE_DELAY);
		},
		[queryClient],
	);

	const flushCacheUpdate = useCallback(() => {
		if (cacheTimer.current) {
			clearTimeout(cacheTimer.current);
			cacheTimer.current = null;
		}
		const pending = pendingCacheUpdate.current;
		pendingCacheUpdate.current = null;
		if (pending) queryClient.setQueryData(pending.key, pending.data);
	}, [queryClient]);

	const flushCacheUpdateRef = useRef(flushCacheUpdate);
	flushCacheUpdateRef.current = flushCacheUpdate;

	const flushSave = useCallback(async () => {
		if (cancelledRef.current || readOnly || !editor) return;
		if (autosaveTimer.current) {
			clearTimeout(autosaveTimer.current);
			autosaveTimer.current = null;
		}
		const { postId } = useEditorStore.getState();
		if (!postId) return;
		// Skip no-op saves: nothing changed since the last successful save.
		if (!dirtyRef.current) return;
		dirtyRef.current = false;

		setSaving(true);
		try {
			const data = editor.document as unknown as Block[];
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

			let queryKey: readonly unknown[];
			let updated: unknown;
			if (itemType === "doc") {
				updated = await mockApi.docs.updatePage(postId, {
					title: currentTitle,
					content: data,
					slug,
					status: status === "published" ? "published" : "draft",
				});
				queryKey = ["docs", postId];
			} else if (itemType === "newsletter") {
				updated = await mockApi.newsletters.update(postId, {
					subject: currentTitle,
					previewText: excerpt,
					content: data,
				});
				queryKey = ["newsletters", postId];
			} else {
				updated = await mockApi.posts.update(postId, {
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
				queryKey = ["posts", postId];
			}
			scheduleCacheUpdate(queryKey, updated);
			if (!cancelledRef.current) {
				setSavedAt(Date.now());
			}
		} catch (err) {
			// Mark dirty again so the next change retries the save.
			dirtyRef.current = true;
			console.error("Save failed:", err);
		} finally {
			if (!cancelledRef.current) setSaving(false);
		}
	}, [editor, readOnly, scheduleCacheUpdate]);

	const flushSaveRef = useRef(flushSave);
	flushSaveRef.current = flushSave;

	const scheduleSave = useCallback(() => {
		dirtyRef.current = true;
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

	// Expose a live getter for the editor's blocks so snapshots/publish/review
	// read fresh content without writing it into the store on every autosave.
	useEffect(() => {
		if (!editor) return;
		setGetBlocks(() => editor.document as unknown as Block[]);
		return () => {
			setGetBlocks(null);
		};
	}, [editor, setGetBlocks]);

	useEffect(() => {
		if (!editor) return;
		return editor.onChange(() => {
			scheduleSaveRef.current();
		});
	}, [editor]);

	// Flush pending saves when the tab is hidden / the page is unloaded, and on
	// unmount (client-side navigation) so no edits are lost.
	useEffect(() => {
		// Reset on (re)mount: under React StrictMode (dev) the cleanup below runs
		// on a simulated unmount, which would otherwise leave cancelledRef true
		// and silently disable autosave for the rest of the session.
		cancelledRef.current = false;
		const flush = () => {
			flushSaveRef.current();
			flushCacheUpdateRef.current();
		};
		const onVisibility = () => {
			if (document.visibilityState === "hidden") flush();
		};
		document.addEventListener("visibilitychange", onVisibility);
		window.addEventListener("pagehide", flush);
		return () => {
			document.removeEventListener("visibilitychange", onVisibility);
			window.removeEventListener("pagehide", flush);
			flush();
			cancelledRef.current = true;
		};
	}, []);

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

	const getSlashMenuItems = useCallback(
		async (query: string) => {
			return filterSuggestionItems(getCustomSlashMenuItems(editor), query);
		},
		[editor],
	);

	// Memoized: an inline function would get a new identity on every render and
	// re-register the suggestion menu on each editor re-render.
	const shouldOpenSlashMenu = useCallback<
		NonNullable<
			React.ComponentProps<typeof SuggestionMenuController>["shouldOpen"]
		>
	>((tr) => {
		const { $from } = tr.selection;
		if (!$from?.parent) return false;
		if ($from.parentOffset === 0) return true;
		const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
		return /\s$/.test(textBefore);
	}, []);

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
						className="px-6 md:px-8 py-6 max-w-3xl mx-auto"
					>
						<BlockNoteView
							editor={editor}
							editable={!readOnly}
							sideMenu={false}
							slashMenu={false}
							formattingToolbar={false}
							shadCNComponents={
								customShadCNComponents as unknown as React.ComponentProps<
									typeof BlockNoteView
								>["shadCNComponents"]
							}
						>
							<SideMenuController sideMenu={CustomSideMenu} />
							<SuggestionMenuController
								triggerCharacter="/"
								getItems={getSlashMenuItems}
								suggestionMenuComponent={CustomSlashMenu}
								shouldOpen={shouldOpenSlashMenu}
							/>
							<FormattingToolbarController
								formattingToolbar={CustomFormattingToolbar}
							/>
						</BlockNoteView>
					</div>
				</main>
			</div>
		</div>
	);
}

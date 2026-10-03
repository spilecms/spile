import type { OutputData } from "@editorjs/editorjs";
import EditorJS from "@editorjs/editorjs";
import Header from "@editorjs/header";
import NestedList from "@editorjs/nested-list";
import Quote from "@editorjs/quote";
import Table from "@editorjs/table";
import { CheckIcon, ExternalLinkIcon, Loader2, Trash2Icon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mockApi } from "@/lib/mock/api";
import type { DocPage, DocPageStatus } from "@/types/domain";
import CodeHighlightTool from "../editor/plugins/code-highlight";

interface DocEditorPaneProps {
	docId: string | null;
	onDocUpdated: (updatedPage: DocPage) => void;
	onDocDeleted: (docId: string) => void;
}

export function DocEditorPane({
	docId,
	onDocUpdated,
	onDocDeleted,
}: DocEditorPaneProps) {
	const { t } = useTranslation();
	const [page, setPage] = useState<DocPage | null>(null);
	const [title, setTitle] = useState("");
	const [slug, setSlug] = useState("");
	const [status, setStatus] = useState<DocPageStatus>("draft");
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [savedState, setSavedState] = useState(false);

	const editorContainerRef = useRef<HTMLDivElement>(null);
	const editorInstanceRef = useRef<EditorJS | null>(null);
	const initialDataRef = useRef<OutputData | null>(null);

	// Load document when docId changes
	useEffect(() => {
		if (!docId) {
			setPage(null);
			setTitle("");
			setSlug("");
			return;
		}

		let active = true;
		setLoading(true);

		mockApi.docs
			.getPage(docId)
			.then((data) => {
				if (!active || !data) return;
				setPage(data);
				setTitle(data.title);
				setSlug(data.slug);
				setStatus(data.status);
				initialDataRef.current = data.content;
			})
			.finally(() => {
				if (active) setLoading(false);
			});

		return () => {
			active = false;
		};
	}, [docId]);

	// Initialize / re-initialize EditorJS when page is loaded
	useEffect(() => {
		if (!page || loading || !editorContainerRef.current) return;

		if (editorInstanceRef.current) {
			try {
				editorInstanceRef.current.destroy();
			} catch {
				// ignore cleanup error
			}
			editorInstanceRef.current = null;
		}

		const holder = editorContainerRef.current;
		holder.innerHTML = "";

		const editor = new EditorJS({
			holder,
			placeholder: "Start documenting here...",
			data: initialDataRef.current || { blocks: [] },
			tools: {
				header: {
					class:
						Header as unknown as import("@editorjs/editorjs").ToolConstructable,
					inlineToolbar: ["link", "bold", "italic"],
					config: {
						levels: [1, 2, 3, 4],
						defaultLevel: 2,
					},
				},
				list: {
					class:
						NestedList as unknown as import("@editorjs/editorjs").ToolConstructable,
					inlineToolbar: true,
				},
				table: {
					class:
						Table as unknown as import("@editorjs/editorjs").ToolConstructable,
					inlineToolbar: true,
				},
				quote: {
					class:
						Quote as unknown as import("@editorjs/editorjs").ToolConstructable,
					inlineToolbar: true,
				},
				code: {
					class:
						CodeHighlightTool as unknown as import("@editorjs/editorjs").ToolConstructable,
				},
			},
		});

		editorInstanceRef.current = editor;

		return () => {
			if (editorInstanceRef.current) {
				try {
					editorInstanceRef.current.destroy();
				} catch {
					// ignore
				}
				editorInstanceRef.current = null;
			}
		};
	}, [page, loading]);

	const handleSave = async (overrideStatus?: DocPageStatus) => {
		if (!page) return;
		setSaving(true);

		try {
			let contentData: OutputData | null = null;
			if (editorInstanceRef.current) {
				contentData = await editorInstanceRef.current.save();
			}

			const updated = await mockApi.docs.updatePage(page.id, {
				title: title.trim() || page.title,
				slug: slug.trim() || page.slug,
				status: overrideStatus || status,
				content: contentData,
			});

			setPage(updated);
			if (overrideStatus) setStatus(overrideStatus);
			onDocUpdated(updated);
			setSavedState(true);
			setTimeout(() => setSavedState(false), 2500);
		} catch (err) {
			console.error("Failed to save doc:", err);
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!page) return;
		if (window.confirm(t("docs.confirmDeletePage"))) {
			await mockApi.docs.deletePage(page.id);
			onDocDeleted(page.id);
		}
	};

	if (!docId) {
		return (
			<div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
				<div className="rounded-full bg-muted/60 p-4 mb-4">
					<ExternalLinkIcon className="h-6 w-6 text-muted-foreground/60" />
				</div>
				<h3 className="font-semibold text-lg text-foreground mb-1">
					{t("docs.title")}
				</h3>
				<p className="max-w-sm text-sm">{t("docs.noSelection")}</p>
			</div>
		);
	}

	if (loading) {
		return (
			<div className="flex h-full items-center justify-center">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full overflow-hidden bg-background">
			{/* Top Bar / Meta controls */}
			<header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-6 py-3.5 bg-card/40 backdrop-blur-sm">
				<div className="flex items-center gap-3 flex-1 min-w-65">
					<Badge
						variant={status === "published" ? "default" : "secondary"}
						className="capitalize cursor-pointer select-none"
						onClick={() => {
							const next = status === "published" ? "draft" : "published";
							setStatus(next);
							handleSave(next);
						}}
					>
						{status}
					</Badge>
					<div className="flex items-center text-xs text-muted-foreground gap-1.5 flex-1 max-w-sm">
						<span className="font-mono text-muted-foreground/70">/docs/</span>
						<Input
							value={slug}
							onChange={(e) => setSlug(e.target.value)}
							className="h-7 text-xs font-mono px-2 py-0"
							placeholder="page-slug"
						/>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8 text-muted-foreground hover:text-destructive"
						onClick={handleDelete}
						title={t("docs.deletePage")}
					>
						<Trash2Icon className="h-4 w-4" />
					</Button>

					<Button
						size="sm"
						variant={status === "published" ? "outline" : "default"}
						disabled={saving}
						onClick={() => {
							const next = status === "published" ? "draft" : "published";
							handleSave(next);
						}}
					>
						{status === "published" ? "Unpublish" : "Publish"}
					</Button>

					<Button
						size="sm"
						variant="default"
						disabled={saving}
						onClick={() => handleSave()}
						className="gap-1.5"
					>
						{saving ? (
							<Loader2 className="h-3.5 w-3.5 animate-spin" />
						) : savedState ? (
							<CheckIcon className="h-3.5 w-3.5 text-primary-foreground" />
						) : null}
						{saving
							? t("docs.saving")
							: savedState
								? t("docs.saved")
								: t("docs.saveChanges")}
					</Button>
				</div>
			</header>

			{/* Main Scrollable Canvas */}
			<div className="flex-1 overflow-y-auto px-6 py-8 md:px-12 lg:px-16">
				<div className="mx-auto max-w-3xl">
					{/* Title input */}
					<input
						type="text"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						placeholder={t("docs.pageTitlePlaceholder")}
						className="w-full bg-transparent text-3xl font-bold tracking-tight outline-none placeholder:text-muted-foreground/40 mb-6"
					/>

					{/* Editor container */}
					<div
						ref={editorContainerRef}
						className="prose prose-invert max-w-none min-h-100"
					/>
				</div>
			</div>
		</div>
	);
}

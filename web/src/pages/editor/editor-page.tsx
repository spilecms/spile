import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { DocsTree } from "@/components/docs/docs-tree";
import Editor from "@/components/editor/editor";
import { PublishPanel } from "@/components/editor/publish-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { mockApi } from "@/lib/mock/api";
import { useEditorStore } from "@/lib/store/editor-store";
import type { DocNavigationManifest, DocTreeItem } from "@/types/domain";

export default function EditorPage() {
	const { id } = useParams<{ id: string }>();
	const location = useLocation();
	const navigate = useNavigate();
	const searchParams = new URLSearchParams(location.search);
	const projectId = searchParams.get("project") || undefined;
	const isDoc = location.pathname.startsWith("/editor/doc");
	const isNew = id === "new";
	const loadPost = useEditorStore((s) => s.loadPost);
	const loadDoc = useEditorStore((s) => s.loadDoc);
	const postId = useEditorStore((s) => s.postId);
	const activeTitle = useEditorStore((s) => s.title);
	const [publishOpen, setPublishOpen] = React.useState(false);
	const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
	const creatingRef = React.useRef(false);

	// Load Post if editing a post
	const {
		data: post,
		isPending: postPending,
		error: postError,
	} = useQuery({
		queryKey: ["posts", id],
		queryFn: () => mockApi.posts.get(id as string),
		enabled: !isDoc && !isNew && Boolean(id),
	});

	// Load Doc if editing a doc
	const {
		data: doc,
		isPending: docPending,
		error: docError,
	} = useQuery({
		queryKey: ["docs", id],
		queryFn: () => mockApi.docs.getPage(id as string),
		enabled: isDoc && !isNew && Boolean(id),
	});

	// Docs Navigation manifest for this project
	const { data: navData } = useQuery({
		queryKey: ["docs-navigation", projectId],
		queryFn: () => mockApi.docs.getNavigation(projectId),
		enabled: isDoc,
	});

	const [manifest, setManifest] = React.useState<DocNavigationManifest | null>(
		null,
	);

	React.useEffect(() => {
		if (navData) setManifest(navData);
	}, [navData]);

	// Live sync active editing title to sidebar tree
	React.useEffect(() => {
		if (!isDoc || !id) return;
		function updateTitleRecursive(items: DocTreeItem[]): DocTreeItem[] {
			return items.map((item) => {
				if (item.id === id) {
					return { ...item, title: activeTitle || "Untitled" };
				}
				if (item.children) {
					return { ...item, children: updateTitleRecursive(item.children) };
				}
				return item;
			});
		}
		setManifest((prev) =>
			prev ? { ...prev, items: updateTitleRecursive(prev.items) } : null,
		);
	}, [activeTitle, id, isDoc]);

	// Load post or doc into editor store
	React.useEffect(() => {
		if (isNew) return;
		if (!isDoc && post) {
			loadPost(post);
		} else if (isDoc && doc) {
			loadDoc(doc);
		}
	}, [isNew, isDoc, post, doc, loadPost, loadDoc]);

	// Handle creation if new
	React.useEffect(() => {
		if (!isNew || creatingRef.current) return;
		creatingRef.current = true;
		if (isDoc) {
			mockApi.docs
				.createPage({ title: "Untitled Doc" })
				.then(({ page, navigation }) => {
					loadDoc(page);
					setManifest(navigation);
					navigate(`/editor/doc/${page.id}`, { replace: true });
				})
				.catch(() => {
					creatingRef.current = false;
				});
		} else {
			mockApi.posts
				.create({ title: "Untitled", type: "post", status: "draft" })
				.then((created) => {
					loadPost(created);
					navigate(`/editor/${created.id}`, { replace: true });
				})
				.catch(() => {
					creatingRef.current = false;
				});
		}
	}, [isNew, isDoc, loadPost, loadDoc, navigate]);

	const isPending = isDoc ? docPending : postPending;
	const error = isDoc ? docError : postError;
	const activeItem = isDoc ? doc : post;

	if (
		isNew ||
		isPending ||
		(!isNew && activeItem && postId !== activeItem.id)
	) {
		return (
			<div className="flex min-h-screen flex-col gap-4 p-6">
				<Skeleton className="h-12 w-full" />
				<Skeleton className="h-8 w-1/2" />
				<Skeleton className="h-4 w-2/3" />
				<Skeleton className="h-64 w-full" />
			</div>
		);
	}

	if (!isNew && error) {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6">
				<p className="text-sm text-red-500 bg-red-50 rounded-md border border-red-200 px-4 py-2 dark:bg-red-950/50 dark:border-red-900">
					{error instanceof Error ? error.message : "Failed to load"}
				</p>
				<button
					type="button"
					className="text-sm text-primary underline-offset-4 hover:underline"
					onClick={() => navigate(isDoc ? "/docs" : "/posts")}
				>
					{isDoc ? "Back to docs" : "Back to posts"}
				</button>
			</div>
		);
	}

	const handleAddDoc = async (parentId?: string) => {
		const { page, navigation } = await mockApi.docs.createPage({
			title: "Untitled",
			parentId,
			projectId,
		});
		setManifest(navigation);
		navigate(
			`/editor/doc/${page.id}${projectId ? `?project=${projectId}` : ""}`,
		);
	};

	const handleDeleteDoc = async (docId: string) => {
		if (window.confirm("Delete this document and all sub-pages?")) {
			const updated = await mockApi.docs.deletePage(docId, projectId);
			setManifest(updated);
			if (docId === id) {
				const nextDoc = updated.items[0]?.id;
				if (nextDoc) {
					navigate(
						`/editor/doc/${nextDoc}${projectId ? `?project=${projectId}` : ""}`,
					);
				} else {
					navigate("/docs");
				}
			}
		}
	};

	const handleRenameDoc = async (docId: string, newTitle: string) => {
		if (docId === id) {
			useEditorStore.getState().setTitle(newTitle);
		}
		await mockApi.docs.updatePage(docId, { title: newTitle });
		function updateTitleRecursive(items: DocTreeItem[]): DocTreeItem[] {
			return items.map((item) => {
				if (item.id === docId) {
					return { ...item, title: newTitle };
				}
				if (item.children) {
					return { ...item, children: updateTitleRecursive(item.children) };
				}
				return item;
			});
		}
		setManifest((prev) =>
			prev ? { ...prev, items: updateTitleRecursive(prev.items) } : null,
		);
	};

	const docsSidebar =
		isDoc && manifest ? (
			<DocsTree
				manifest={manifest}
				selectedDocId={id || null}
				onSelectDoc={(docId) =>
					navigate(
						`/editor/doc/${docId}${projectId ? `?project=${projectId}` : ""}`,
					)
				}
				onUpdateManifest={async (upd) => {
					setManifest(upd);
					await mockApi.docs.updateNavigation(upd.items, projectId);
				}}
				onAddDoc={handleAddDoc}
				onDeleteDoc={handleDeleteDoc}
				onRenameDoc={handleRenameDoc}
			/>
		) : undefined;

	return (
		<>
			<Editor
				key={id}
				onPublish={() => setPublishOpen(true)}
				backUrl={isDoc ? "/docs" : "/posts"}
				sidebar={docsSidebar}
				isSidebarOpen={isSidebarOpen}
				onToggleSidebar={() => setIsSidebarOpen((v) => !v)}
			/>
			<PublishPanel open={publishOpen} onOpenChange={setPublishOpen} />
		</>
	);
}

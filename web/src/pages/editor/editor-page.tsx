import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { DocsTree } from "@/components/docs/docs-tree";
import Editor from "@/components/editor/editor";
import { PublishPanel } from "@/components/editor/publish-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { mockApi } from "@/lib/mock/api";
import { useEditorStore } from "@/lib/store/editor-store";
import type { DocNavigationManifest } from "@/types/domain";

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

	const handleAddSection = async () => {
		const title = window.prompt("New section title", "New Section");
		if (!title) return;
		const updated = await mockApi.docs.createSection(title);
		setManifest(updated);
	};

	const handleDeleteSection = async (sectionId: string) => {
		if (!window.confirm("Are you sure you want to delete this section?"))
			return;
		const updated = await mockApi.docs.deleteSection(sectionId);
		setManifest(updated);
	};

	const handleAddDocPage = async (sectionId: string) => {
		const title = window.prompt("New page title", "Untitled Doc");
		if (!title) return;
		const { page, navigation } = await mockApi.docs.createPage({
			title,
			sectionId,
			projectId,
		});
		setManifest(navigation);
		navigate(
			`/editor/doc/${page.id}${projectId ? `?project=${projectId}` : ""}`,
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
					await mockApi.docs.updateNavigation(upd.sections, projectId);
				}}
				onAddPage={handleAddDocPage}
				onAddSection={handleAddSection}
				onDeleteSection={handleDeleteSection}
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

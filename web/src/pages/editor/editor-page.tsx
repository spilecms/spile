import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import {
	useLocation,
	useNavigate,
	useParams,
	useSearchParams,
} from "react-router-dom";
import { toast } from "sonner";
import { DocsTree } from "@/components/docs/docs-tree";
import Editor from "@/components/editor/editor";
import { PublishPanel } from "@/components/editor/publish-panel";
import { ReviewActionBar } from "@/components/editor/review-action-bar";
import { ReviewLockBanner } from "@/components/editor/review-lock-banner";
import { SubmitReviewDialog } from "@/components/editor/submit-review-dialog";
import { VersionHistoryDrawer } from "@/components/editor/version-history-drawer";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { mockApi } from "@/lib/mock/api";
import { useEditorStore } from "@/lib/store/editor-store";
import type {
	DocNavigationManifest,
	DocTreeItem,
	ReviewTargetType,
} from "@/types/domain";

export default function EditorPage() {
	const queryClient = useQueryClient();
	const { id } = useParams<{ id: string }>();
	const location = useLocation();
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const projectId = searchParams.get("project") || undefined;
	const activeLocale = searchParams.get("lang") || "en";
	const isDoc = location.pathname.startsWith("/editor/doc");
	const isNewsletter = location.pathname.startsWith("/editor/newsletter");
	const isNew = id === "new";
	const loadPost = useEditorStore((s) => s.loadPost);
	const loadDoc = useEditorStore((s) => s.loadDoc);
	const loadNewsletter = useEditorStore((s) => s.loadNewsletter);
	const resetStore = useEditorStore((s) => s.reset);
	const postId = useEditorStore((s) => s.postId);
	const activeTitle = useEditorStore((s) => s.title);
	const [publishOpen, setPublishOpen] = React.useState(false);
	const [submitReviewOpen, setSubmitReviewOpen] = React.useState(false);
	const [historyDrawerOpen, setHistoryDrawerOpen] = React.useState(false);
	const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
	const [docToDelete, setDocToDelete] = React.useState<string | null>(null);
	const [deletingDoc, setDeletingDoc] = React.useState(false);
	const creatingRef = React.useRef(false);

	const reviewQueryId = searchParams.get("review") || undefined;
	const targetType: ReviewTargetType = isDoc ? "doc" : "post";

	// Current active user for RBAC simulation
	const { data: currentUser } = useQuery({
		queryKey: ["current-user"],
		queryFn: () => mockApi.users.current(),
	});

	// Pending or targeted review query
	const { data: pendingReview } = useQuery({
		queryKey: ["reviews", id, reviewQueryId],
		queryFn: async () => {
			if (!id || isNew) return null;
			if (reviewQueryId) {
				const req = await mockApi.reviews.get(reviewQueryId);
				if (req) return req;
			}
			return mockApi.reviews.getPending(targetType, id);
		},
		enabled: !isNew && Boolean(id) && !isNewsletter,
	});

	const isContributor = currentUser?.role === "contributor";
	const isReviewLocked = pendingReview?.status === "in_review";
	const isEditorOrAdmin =
		currentUser?.role === "admin" ||
		currentUser?.role === "editor" ||
		currentUser?.role === "owner";

	// Review lock banner or Editor review action bar
	const reviewBanner = React.useMemo(() => {
		if (pendingReview?.status !== "in_review") return null;

		if (isContributor) {
			return (
				<ReviewLockBanner
					review={pendingReview}
					currentUser={currentUser ?? undefined}
				/>
			);
		}

		if (isEditorOrAdmin) {
			return (
				<ReviewActionBar
					review={pendingReview}
					onApproved={() => setPublishOpen(false)}
				/>
			);
		}

		return null;
	}, [pendingReview, isContributor, isEditorOrAdmin, currentUser]);

	// Cleanly reset editor store when transitioning between documents/translations
	React.useEffect(() => {
		if (id && postId && id !== postId) {
			resetStore();
		}
	}, [id, postId, resetStore]);

	// Load Post if editing a post
	const {
		data: post,
		isPending: postPending,
		error: postError,
	} = useQuery({
		queryKey: ["posts", id],
		queryFn: () => mockApi.posts.get(id as string),
		enabled: !isDoc && !isNewsletter && !isNew && Boolean(id),
	});

	// Load Newsletter if editing a newsletter
	const {
		data: newsletter,
		isPending: newsletterPending,
		error: newsletterError,
	} = useQuery({
		queryKey: ["newsletters", id],
		queryFn: () => mockApi.newsletters.get(id as string),
		enabled: isNewsletter && !isNew && Boolean(id),
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

	// Docs Navigation manifest for this project and active workspace locale
	const { data: navData } = useQuery({
		queryKey: ["docs-navigation", projectId, activeLocale],
		queryFn: () => mockApi.docs.getNavigation(projectId, activeLocale),
		enabled: isDoc,
	});

	// Synchronize URL search params if doc has a locale and URL hasn't set one yet
	React.useEffect(() => {
		if (isDoc && doc?.locale && !searchParams.get("lang")) {
			setSearchParams(
				(prev) => {
					const next = new URLSearchParams(prev);
					next.set("lang", doc.locale);
					return next;
				},
				{ replace: true },
			);
		}
	}, [isDoc, doc?.locale, searchParams, setSearchParams]);

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

	// Load post, doc, or newsletter into editor store
	React.useEffect(() => {
		if (isNew) return;
		if (isNewsletter && newsletter) {
			loadNewsletter(newsletter);
		} else if (!isDoc && !isNewsletter && post) {
			loadPost(post);
		} else if (isDoc && doc) {
			loadDoc(doc);
		}
	}, [
		isNew,
		isDoc,
		isNewsletter,
		post,
		doc,
		newsletter,
		loadPost,
		loadDoc,
		loadNewsletter,
	]);

	// Handle creation if new
	React.useEffect(() => {
		if (!isNew || creatingRef.current) return;
		creatingRef.current = true;
		if (isNewsletter) {
			mockApi.newsletters
				.create({ subject: "Untitled Newsletter", title: "Newsletter Issue" })
				.then((created) => {
					loadNewsletter(created);
					navigate(`/editor/newsletter/${created.id}`, { replace: true });
				})
				.catch(() => {
					creatingRef.current = false;
				});
		} else if (isDoc) {
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
	}, [isNew, isDoc, isNewsletter, loadPost, loadDoc, loadNewsletter, navigate]);

	const isPending = isNewsletter
		? newsletterPending
		: isDoc
			? docPending
			: postPending;
	const error = isNewsletter ? newsletterError : isDoc ? docError : postError;
	const activeItem = isNewsletter ? newsletter : isDoc ? doc : post;

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
					onClick={() =>
						navigate(isNewsletter ? "/newsletters" : isDoc ? "/docs" : "/posts")
					}
				>
					{isNewsletter
						? "Back to newsletters"
						: isDoc
							? "Back to docs"
							: "Back to posts"}
				</button>
			</div>
		);
	}

	const handleAddDoc = async (parentId?: string) => {
		try {
			const { page, navigation } = await mockApi.docs.createPage({
				title: "Untitled",
				parentId,
				projectId,
				locale: activeLocale,
			});
			setManifest(navigation);
			queryClient.setQueryData(
				["docs-navigation", projectId, activeLocale],
				navigation,
			);
			queryClient.invalidateQueries({ queryKey: ["docs-projects"] });
			navigate(
				`/editor/doc/${page.id}?${projectId ? `project=${projectId}&` : ""}lang=${activeLocale}`,
			);
		} catch (_err) {
			toast.error("Failed to create document");
		}
	};

	const handleDeleteDoc = (docId: string) => {
		setDocToDelete(docId);
	};

	const handleConfirmDeleteDoc = async () => {
		if (!docToDelete || deletingDoc) return;
		setDeletingDoc(true);
		try {
			const updated = await mockApi.docs.deletePage(
				docToDelete,
				projectId,
				activeLocale,
			);
			setManifest(updated);
			queryClient.setQueryData(
				["docs-navigation", projectId, activeLocale],
				updated,
			);
			queryClient.invalidateQueries({ queryKey: ["docs-projects"] });
			toast.success("Document deleted");
			if (docToDelete === id) {
				const nextDoc = updated.items[0]?.id;
				if (nextDoc) {
					navigate(
						`/editor/doc/${nextDoc}?${projectId ? `project=${projectId}&` : ""}lang=${activeLocale}`,
					);
				} else {
					navigate("/docs");
				}
			}
			setDocToDelete(null);
		} catch (_err) {
			toast.error("Failed to delete document");
		} finally {
			setDeletingDoc(false);
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

	const handleSelectLocale = async (newLocale: string) => {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				next.set("lang", newLocale);
				return next;
			},
			{ replace: true },
		);

		// If current doc has a translation in newLocale, seamlessly switch to it!
		if (doc) {
			const groupId = doc.translationGroupId || doc.id;
			const translations = await mockApi.docs.getTranslations(groupId);
			const translatedDoc = translations.find((t) => t.locale === newLocale);
			if (translatedDoc && translatedDoc.id !== id) {
				navigate(
					`/editor/doc/${translatedDoc.id}?${projectId ? `project=${projectId}&` : ""}lang=${newLocale}`,
				);
			}
		}
	};

	const docsSidebar =
		isDoc && manifest ? (
			<DocsTree
				manifest={manifest}
				selectedDocId={id || null}
				onSelectDoc={(docId) =>
					navigate(
						`/editor/doc/${docId}?${projectId ? `project=${projectId}&` : ""}lang=${activeLocale}`,
					)
				}
				onUpdateManifest={async (upd) => {
					const previousManifest = manifest;
					setManifest(upd);
					queryClient.setQueryData(
						["docs-navigation", projectId, activeLocale],
						upd,
					);
					try {
						const saved = await mockApi.docs.updateNavigation(
							upd.items,
							projectId,
							activeLocale,
						);
						setManifest(saved);
						queryClient.setQueryData(
							["docs-navigation", projectId, activeLocale],
							saved,
						);
						queryClient.invalidateQueries({ queryKey: ["docs-projects"] });
					} catch (_err) {
						toast.error("Failed to save navigation order");
						if (previousManifest) {
							setManifest(previousManifest);
							queryClient.setQueryData(
								["docs-navigation", projectId, activeLocale],
								previousManifest,
							);
						}
					}
				}}
				onAddDoc={handleAddDoc}
				onDeleteDoc={handleDeleteDoc}
				onRenameDoc={handleRenameDoc}
				selectedLocale={activeLocale}
				onSelectLocale={handleSelectLocale}
			/>
		) : undefined;

	return (
		<>
			<Editor
				key={`${id}-${currentUser?.role}-${isReviewLocked && isContributor ? "locked" : "editable"}`}
				onPublish={() => setPublishOpen(true)}
				backUrl={isNewsletter ? "/newsletters" : isDoc ? "/docs" : "/posts"}
				sidebar={docsSidebar}
				isSidebarOpen={isSidebarOpen}
				onToggleSidebar={() => setIsSidebarOpen((v) => !v)}
				readOnly={isReviewLocked && isContributor}
				isContributor={isContributor}
				isLocked={isReviewLocked}
				onSubmitReview={() => setSubmitReviewOpen(true)}
				onHistory={() => setHistoryDrawerOpen(true)}
				banner={reviewBanner}
			/>
			<PublishPanel open={publishOpen} onOpenChange={setPublishOpen} />

			{/* Contributor Submit for Review Dialog */}
			<SubmitReviewDialog
				open={submitReviewOpen}
				onOpenChange={setSubmitReviewOpen}
				targetType={targetType}
				targetId={id as string}
				title={activeTitle}
			/>

			{/* Version History Drawer */}
			<VersionHistoryDrawer
				open={historyDrawerOpen}
				onOpenChange={setHistoryDrawerOpen}
				targetType={targetType}
				targetId={id as string}
				currentTitle={activeTitle}
			/>

			{/* Delete Page Alert Dialog */}
			<AlertDialog
				open={Boolean(docToDelete)}
				onOpenChange={(open) => !open && setDocToDelete(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Document?</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete this document and all nested
							sub-pages? This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deletingDoc}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={handleConfirmDeleteDoc}
							disabled={deletingDoc}
						>
							{deletingDoc ? "Deleting..." : "Delete Document"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

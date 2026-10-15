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
import { usePermissions } from "@/lib/permissions";
import { useEditorStore } from "@/lib/store/editor-store";
import NotFoundPage from "@/pages/errors/not-found-page";
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
	const isNew =
		id === "new" ||
		location.pathname === "/editor/new" ||
		location.pathname === "/editor/doc/new" ||
		location.pathname === "/editor/newsletter/new";
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

	const { can, user: currentUser } = usePermissions();

	const isContributor = currentUser?.role === "contributor";
	const isReviewLocked = pendingReview?.status === "in_review";
	const canApproveReview = can("review:approve");

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

		if (canApproveReview) {
			return (
				<ReviewActionBar
					review={pendingReview}
					onApproved={() => setPublishOpen(false)}
				/>
			);
		}

		return null;
	}, [pendingReview, isContributor, canApproveReview, currentUser]);

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

	const effectiveProjectId = projectId || doc?.projectId;

	// Docs Navigation manifest for this project and active workspace locale
	const { data: navData } = useQuery({
		queryKey: ["docs-navigation", effectiveProjectId, activeLocale],
		queryFn: () => mockApi.docs.getNavigation(effectiveProjectId, activeLocale),
		enabled: isDoc && Boolean(effectiveProjectId),
	});

	// Synchronize URL search params with the active loaded document's locale and project
	React.useEffect(() => {
		if (isDoc && doc && doc.id === id && (doc.locale || doc.projectId)) {
			setSearchParams(
				(prev) => {
					let changed = false;
					const next = new URLSearchParams(prev);
					if (doc.locale && prev.get("lang") !== doc.locale) {
						next.set("lang", doc.locale);
						changed = true;
					}
					if (doc.projectId && !prev.get("project")) {
						next.set("project", doc.projectId);
						changed = true;
					}
					return changed ? next : prev;
				},
				{ replace: true },
			);
		}
	}, [isDoc, id, doc, setSearchParams]);

	const [manifest, setManifest] = React.useState<DocNavigationManifest | null>(
		null,
	);

	React.useEffect(() => {
		if (navData) setManifest(navData);
	}, [navData]);

	// Live sync active editing title to sidebar tree
	React.useEffect(() => {
		if (!isDoc || !id || postId !== id) return;
		function updateTitleRecursive(items: DocTreeItem[]): DocTreeItem[] {
			return items.map((item) => {
				if (item.id === id || item.localizedDocId === id) {
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
	}, [activeTitle, id, postId, isDoc]);

	// Load post, doc, or newsletter into editor store.
	// Guarded by postId so we only load when switching documents — not on every
	// query data identity change (autosave echoes via setQueryData, window-focus
	// refetches), which would rewrite the store while the user is editing.
	React.useEffect(() => {
		if (isNew) return;
		if (isNewsletter && newsletter) {
			if (postId !== newsletter.id) loadNewsletter(newsletter);
		} else if (!isDoc && !isNewsletter && post) {
			if (postId !== post.id) loadPost(post);
		} else if (isDoc && doc) {
			if (postId !== doc.id) loadDoc(doc);
		}
	}, [
		isNew,
		isDoc,
		isNewsletter,
		post,
		doc,
		newsletter,
		postId,
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
				.createPage({
					title: "Untitled Doc",
					projectId,
					locale: activeLocale,
				})
				.then(({ page, navigation }) => {
					loadDoc(page);
					setManifest(navigation);
					navigate(
						`/editor/doc/${page.id}?${projectId ? `project=${projectId}&` : ""}lang=${activeLocale}`,
						{ replace: true },
					);
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
	}, [
		isNew,
		isDoc,
		isNewsletter,
		loadPost,
		loadDoc,
		loadNewsletter,
		navigate,
		activeLocale,
		projectId,
	]);

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

	if (!isNew && (error || !activeItem)) {
		return (
			<NotFoundPage
				title={
					isNewsletter
						? "Newsletter not found"
						: isDoc
							? "Document not found"
							: "Post not found"
				}
				description={
					error instanceof Error
						? error.message
						: "The item you are trying to open could not be found or may have been deleted."
				}
				backTo={isNewsletter ? "/newsletters" : isDoc ? "/docs" : "/posts"}
				backLabel={
					isNewsletter
						? "Back to Newsletters"
						: isDoc
							? "Back to Docs"
							: "Back to Posts"
				}
			/>
		);
	}

	const handleAddDoc = async (parentId?: string) => {
		try {
			const targetProjId = effectiveProjectId;
			const { page, navigation } = await mockApi.docs.createPage({
				title: "Untitled",
				parentId,
				projectId: targetProjId,
				locale: activeLocale,
			});
			setManifest(navigation);
			queryClient.setQueryData(
				["docs-navigation", targetProjId, activeLocale],
				navigation,
			);
			queryClient.invalidateQueries({ queryKey: ["docs-projects"] });
			navigate(
				`/editor/doc/${page.id}?${targetProjId ? `project=${targetProjId}&` : ""}lang=${activeLocale}`,
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
				effectiveProjectId,
				activeLocale,
			);
			setManifest(updated);
			queryClient.setQueryData(
				["docs-navigation", effectiveProjectId, activeLocale],
				updated,
			);
			queryClient.invalidateQueries({ queryKey: ["docs-projects"] });
			toast.success("Document deleted");
			if (docToDelete === id) {
				const nextDoc =
					updated.items[0]?.localizedDocId || updated.items[0]?.id;
				if (nextDoc) {
					navigate(
						`/editor/doc/${nextDoc}?${effectiveProjectId ? `project=${effectiveProjectId}&` : ""}lang=${activeLocale}`,
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
		function updateTitleRecursive(items: DocTreeItem[]): DocTreeItem[] {
			return items.map((item) => {
				if (item.id === docId || item.localizedDocId === docId) {
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
		queryClient.setQueryData<DocNavigationManifest>(
			["docs-navigation", effectiveProjectId, activeLocale],
			(old) => (old ? { ...old, items: updateTitleRecursive(old.items) } : old),
		);
		queryClient.setQueryData(["docs", docId], (old: typeof doc) =>
			old ? { ...old, title: newTitle } : old,
		);

		if (docId === id) {
			useEditorStore.getState().setTitle(newTitle);
		}

		try {
			const updated = await mockApi.docs.updatePage(docId, {
				title: newTitle,
			});
			queryClient.setQueryData(["docs", docId], updated);
			queryClient.invalidateQueries({ queryKey: ["docs-navigation"] });
			queryClient.invalidateQueries({ queryKey: ["docs-projects"] });
		} catch (_err) {
			toast.error("Failed to rename document");
		}
	};

	const handleSelectLocale = async (newLocale: string) => {
		if (newLocale === activeLocale && (doc?.locale || "en") === newLocale) {
			return;
		}

		try {
			await useEditorStore.getState().saveContent?.();
		} catch {
			// Ignore save errors before switching
		}

		if (doc) {
			try {
				const groupId = doc.translationGroupId || doc.id;
				const sourceId = doc.translationSourceId || groupId;
				const translations = await mockApi.docs.getTranslations(groupId);
				let targetDoc = translations.find(
					(t) => (t.locale || "en") === newLocale,
				);
				if (!targetDoc && (doc.locale || "en") === newLocale) {
					targetDoc = doc;
				}

				if (!targetDoc) {
					targetDoc = await mockApi.docs.createTranslation(
						sourceId,
						newLocale,
						{
							copyContent: true,
							projectId: effectiveProjectId,
						},
					);
					queryClient.setQueryData(["docs", targetDoc.id], targetDoc);
					toast.success(
						`Created ${newLocale.toUpperCase()} translation for "${targetDoc.title}"`,
					);
				}

				const refreshedNav = await mockApi.docs.getNavigation(
					effectiveProjectId,
					newLocale,
				);
				setManifest(refreshedNav);
				queryClient.setQueryData(
					["docs-navigation", effectiveProjectId, newLocale],
					refreshedNav,
				);
				queryClient.invalidateQueries({
					queryKey: ["docs", "translations", groupId],
				});
				queryClient.invalidateQueries({ queryKey: ["docs-navigation"] });
				queryClient.invalidateQueries({ queryKey: ["docs-projects"] });

				navigate(
					`/editor/doc/${targetDoc.id}?${effectiveProjectId ? `project=${effectiveProjectId}&` : ""}lang=${newLocale}`,
				);
				return;
			} catch (_err) {
				toast.error("Failed to switch document language");
			}
		}

		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				next.set("lang", newLocale);
				return next;
			},
			{ replace: true },
		);
	};

	const docsSidebar =
		isDoc && manifest ? (
			<DocsTree
				manifest={manifest}
				selectedDocId={id || null}
				onSelectDoc={async (docId) => {
					if (docId !== id) {
						try {
							await useEditorStore.getState().saveContent?.();
						} catch {
							// Ignore save errors before navigating
						}
					}
					navigate(
						`/editor/doc/${docId}?${effectiveProjectId ? `project=${effectiveProjectId}&` : ""}lang=${activeLocale}`,
					);
				}}
				onRefreshManifest={(refreshed) => {
					setManifest(refreshed);
					queryClient.setQueryData(
						["docs-navigation", effectiveProjectId, activeLocale],
						refreshed,
					);
				}}
				onUpdateManifest={async (upd) => {
					const previousManifest = manifest;
					setManifest(upd);
					queryClient.setQueryData(
						["docs-navigation", effectiveProjectId, activeLocale],
						upd,
					);
					try {
						const saved = await mockApi.docs.updateNavigation(
							upd.items,
							effectiveProjectId,
							activeLocale,
						);
						setManifest(saved);
						queryClient.setQueryData(
							["docs-navigation", effectiveProjectId, activeLocale],
							saved,
						);
						queryClient.invalidateQueries({ queryKey: ["docs-projects"] });
					} catch (_err) {
						toast.error("Failed to save navigation order");
						if (previousManifest) {
							setManifest(previousManifest);
							queryClient.setQueryData(
								["docs-navigation", effectiveProjectId, activeLocale],
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
				// Remount only when switching documents. Do NOT include role/lock
				// state here: those arrive async (or toggle) and would remount the
				// editor, resetting its content, cursor and undo history. The review
				// lock is already handled via the `readOnly` prop (editable=false).
				key={id ?? "new"}
				onPublish={() => setPublishOpen(true)}
				backUrl={isNewsletter ? "/newsletters" : isDoc ? "/docs" : "/posts"}
				sidebar={docsSidebar}
				isSidebarOpen={isDoc ? isSidebarOpen : false}
				onToggleSidebar={isDoc ? () => setIsSidebarOpen((v) => !v) : undefined}
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

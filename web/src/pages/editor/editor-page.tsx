import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import Editor from "@/components/editor/editor";
import { PublishPanel } from "@/components/editor/publish-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { mockApi } from "@/lib/mock/api";
import { useEditorStore } from "@/lib/store/editor-store";

export default function EditorPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const isNew = id === "new";
	const loadPost = useEditorStore((s) => s.loadPost);
	const postId = useEditorStore((s) => s.postId);
	const [publishOpen, setPublishOpen] = React.useState(false);
	const creatingRef = React.useRef(false);

	const {
		data: post,
		isPending,
		error,
	} = useQuery({
		queryKey: ["posts", id],
		queryFn: () => mockApi.posts.get(id as string),
		enabled: !isNew && Boolean(id),
	});

	React.useEffect(() => {
		if (isNew) return;
		if (post) {
			loadPost(post);
		}
	}, [isNew, post, loadPost]);

	React.useEffect(() => {
		if (!isNew || creatingRef.current) return;
		creatingRef.current = true;
		mockApi.posts
			.create({ title: "Untitled", type: "post", status: "draft" })
			.then((created) => {
				loadPost(created);
				navigate(`/editor/${created.id}`, { replace: true });
			})
			.catch(() => {
				creatingRef.current = false;
			});
	}, [isNew, loadPost, navigate]);

	if (isNew || isPending || (!isNew && post && postId !== post.id)) {
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
					{error instanceof Error ? error.message : "Failed to load post"}
				</p>
				<button
					type="button"
					className="text-sm text-primary underline-offset-4 hover:underline"
					onClick={() => navigate("/posts")}
				>
					Back to posts
				</button>
			</div>
		);
	}

	return (
		<>
			<Editor key={id} onPublish={() => setPublishOpen(true)} />
			<PublishPanel open={publishOpen} onOpenChange={setPublishOpen} />
		</>
	);
}

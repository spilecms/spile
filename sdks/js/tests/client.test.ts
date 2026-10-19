import assert from "node:assert/strict";
import test from "node:test";
import type { Post } from "../dist/index.js";
import { createSpileClient, SpileError } from "../dist/index.js";

test("SpileClient - constructor validation", () => {
	assert.throws(() => {
		// @ts-expect-error test invalid config
		createSpileClient({});
	}, /baseUrl/);
});

test("SpileClient - attaches Authorization header and parses posts.list", async () => {
	let capturedUrl = "";
	let capturedHeaders: Record<string, string> = {};

	const mockFetch: typeof globalThis.fetch = async (input, init) => {
		capturedUrl = String(input);
		if (init?.headers instanceof Headers) {
			capturedHeaders = Object.fromEntries(init.headers.entries());
		} else if (init?.headers && typeof init.headers === "object") {
			capturedHeaders = init.headers as Record<string, string>;
		}

		const mockPosts: Partial<Post>[] = [
			{
				id: "p-1",
				title: "My First Post",
				slug: "my-first-post",
				status: "published",
				locale: "en",
			},
		];

		return new Response(JSON.stringify(mockPosts), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"X-Page": "1",
				"X-Page-Size": "10",
				"X-Total-Count": "1",
				"X-Total-Pages": "1",
			},
		});
	};

	const client = createSpileClient({
		baseUrl: "https://cms.example.com",
		apiKey: "pk_live_secret123",
		fetch: mockFetch,
	});

	const { data, pagination } = await client.posts.list({
		locale: "es",
		limit: 10,
	});

	assert.equal(
		capturedUrl,
		"https://cms.example.com/api/v1/posts?locale=es&limit=10",
	);
	assert.equal(capturedHeaders.authorization, "Bearer pk_live_secret123");
	assert.equal(data.length, 1);
	assert.equal(data[0]?.slug, "my-first-post");
	assert.equal(pagination.total, 1);
	assert.equal(pagination.hasMore, false);
});

test("SpileClient - posts.getBySlug sends locale query", async () => {
	let capturedUrl = "";

	const mockFetch: typeof globalThis.fetch = async (input) => {
		capturedUrl = String(input);
		return new Response(
			JSON.stringify({ id: "p-2", slug: "hola-mundo", locale: "es" }),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			},
		);
	};

	const client = createSpileClient({
		baseUrl: "https://cms.example.com",
		fetch: mockFetch,
	});

	const post = await client.posts.getBySlug("hello-world", { locale: "es" });
	assert.equal(
		capturedUrl,
		"https://cms.example.com/api/v1/posts/hello-world?locale=es",
	);
	assert.equal(post.slug, "hola-mundo");
});

test("SpileClient - search.query encodes parameters", async () => {
	let capturedUrl = "";

	const mockFetch: typeof globalThis.fetch = async (input) => {
		capturedUrl = String(input);
		return new Response(
			JSON.stringify({ query: "api auth", total: 0, results: [] }),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			},
		);
	};

	const client = createSpileClient({
		baseUrl: "https://cms.example.com",
		fetch: mockFetch,
	});

	await client.search.query({
		q: "api auth",
		type: "docs",
		projectId: "proj-1",
	});
	assert.equal(
		capturedUrl,
		"https://cms.example.com/api/v1/search?q=api+auth&type=docs&projectId=proj-1",
	);
});

test("SpileClient - throws SpileError on API errors", async () => {
	const mockFetch: typeof globalThis.fetch = async () => {
		return new Response(JSON.stringify({ error: "Post not found" }), {
			status: 404,
			statusText: "Not Found",
			headers: { "Content-Type": "application/json" },
		});
	};

	const client = createSpileClient({
		baseUrl: "https://cms.example.com",
		fetch: mockFetch,
	});

	await assert.rejects(
		async () => {
			await client.posts.getBySlug("non-existent");
		},
		(err: unknown) => {
			assert.ok(err instanceof SpileError);
			assert.equal(err.status, 404);
			assert.equal(err.message, "Post not found");
			return true;
		},
	);
});

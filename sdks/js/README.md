# @spilecms/sdk

The official TypeScript and JavaScript SDK for [Spile Headless CMS](https://github.com/spilecms/spile), featuring zero-dependency universal core utilities and first-class [React](https://react.dev) & [shadcn/ui](https://ui.shadcn.com) integration.

[![npm version](https://img.shields.io/npm/v/@spilecms/sdk.svg)](https://www.npmjs.com/package/@spilecms/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

---

## Features

- **Universal & Zero Dependencies**: Core API client uses standard Web `fetch` and Web `crypto` — works in Node.js 18+, Next.js (App Router & RSC), Astro, SvelteKit, Remix, Cloudflare Workers, Bun, and Deno.
- **Dual Subpath Exports**:
  - `@spilecms/sdk`: Lightweight API client, tree algorithms, TOC extractor, HTML block serializer, and webhook verifier.
  - `@spilecms/sdk/react`: `<SpileContent />` renderer and headless hooks (`useSpileSearch`, `useSpileNav`, `useSpileTOC`) designed for shadcn/ui.
- **First-Class BlockNote Rendering**: Renders BlockNote blocks to semantic HTML or React DOM, with built-in support for callouts, accordions, code groups, math blocks, and API parameter fields.
- **Multilingual Support**: Transparent locale resolution with automatic canonical fallback for posts and documentation.
- **SSR Analytics Forwarding**: Forwards client `User-Agent`, `Referer`, and IP headers for accurate server-side analytics.
- **Secure Webhooks**: Constant-time HMAC-SHA256 signature verification with replay attack timestamp tolerance.

---

## Installation

```bash
# pnpm
pnpm add @spilecms/sdk

# npm
npm install @spilecms/sdk

# yarn
yarn add @spilecms/sdk
```

> **Note**: `react` and `react-dom` are optional peer dependencies. If you only use `@spilecms/sdk` for Node.js scripts, Astro, or static site generation, you do not need React installed.

---

## Quick Start

### 1. Initialize the Client

```ts
import { createSpileClient } from "@spilecms/sdk";

export const spile = createSpileClient({
  baseUrl: process.env.NEXT_PUBLIC_SPILE_URL || "https://cms.yourdomain.com",
  apiKey: process.env.SPILE_API_KEY, // Optional for public reads, required for drafts/private data
});
```

### 2. Fetch and Render a Blog Post (Next.js App Router)

```tsx
// app/blog/[slug]/page.tsx
import { spile } from "@/lib/spile";
import { SpileContent } from "@spilecms/sdk/react";
import { notFound } from "next/navigation";

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await spile.posts.getBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <article className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-4xl font-extrabold tracking-tight mb-4">{post.title}</h1>
      <SpileContent blocks={post.content} />
    </article>
  );
}
```

---

## React & shadcn/ui Integration (`@spilecms/sdk/react`)

### `<SpileContent />` with Component Overrides

The `<SpileContent />` component maps BlockNote blocks to React elements and allows you to seamlessly replace any default block with your own design system or [shadcn/ui](https://ui.shadcn.com) components:

```tsx
import { SpileContent } from "@spilecms/sdk/react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Link from "next/link";

export function ArticleRenderer({ blocks }: { blocks: any[] }) {
  return (
    <SpileContent
      blocks={blocks}
      components={{
        // Override callouts with shadcn Alert
        callout: ({ type, title, children }) => (
          <Alert variant={type === "danger" ? "destructive" : "default"}>
            {title && <AlertTitle>{title}</AlertTitle>}
            <AlertDescription>{children}</AlertDescription>
          </Alert>
        ),

        // Override links with Next.js Link
        link: ({ href, children }) => (
          <Link href={href} className="text-primary underline hover:text-primary/80">
            {children}
          </Link>
        ),

        // Override multi-language code groups with shadcn Tabs
        codeGroup: ({ tabs, activeTabIndex }) => (
          <Tabs defaultValue={tabs[activeTabIndex]?.id || tabs[0]?.id}>
            <TabsList>
              {tabs.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {tabs.map((tab) => (
              <TabsContent key={tab.id} value={tab.id}>
                <pre className="p-4 rounded-lg bg-muted overflow-x-auto">
                  <code>{tab.code}</code>
                </pre>
              </TabsContent>
            ))}
          </Tabs>
        ),

        // Custom user-defined block types
        newsletterForm: ({ block }) => (
          <aside className="border rounded-xl p-6 my-8 bg-muted/40">
            <h3>Subscribe to our updates</h3>
          </aside>
        ),
      }}
    />
  );
}
```

---

### Command Palette Search (`useSpileSearch`)

Headless search hook built for shadcn `<CommandDialog>`. Features built-in `Ctrl + K` / `Cmd + K` keyboard listeners, debouncing, and race-condition safety:

```tsx
"use client";

import { useSpileSearch } from "@spilecms/sdk/react";
import { spile } from "@/lib/spile";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { useRouter } from "next/navigation";

export function DocsSearch({ projectId }: { projectId?: string }) {
  const router = useRouter();
  const { open, setOpen, query, setQuery, results, isLoading } = useSpileSearch({
    client: spile,
    projectId,
    shortcut: true, // Listens for Cmd+K / Ctrl+K
    debounceMs: 200,
  });

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 border px-3 py-1.5 rounded-md text-sm text-muted-foreground"
      >
        <span>Search documentation...</span>
        <kbd className="text-xs border px-1.5 py-0.5 rounded bg-muted">⌘K</kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search..." value={query} onValueChange={setQuery} />
        <CommandList>
          {isLoading && <div className="p-4 text-center text-sm">Searching...</div>}
          {!isLoading && query && results.length === 0 && (
            <CommandEmpty>No results found.</CommandEmpty>
          )}
          <CommandGroup heading="Results">
            {results.map((item) => (
              <CommandItem
                key={item.id}
                onSelect={() => {
                  setOpen(false);
                  router.push(item.url || `/docs/${item.slug}`);
                }}
              >
                {item.title}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
```

---

### Documentation Sidebar Navigation (`useSpileNav`)

Headless hook for tree navigation, breadcrumbs, and bottom previous/next page cards with shadcn `<Sidebar>` and `<Collapsible>`:

```tsx
"use client";

import { useSpileNav } from "@spilecms/sdk/react";
import type { DocNavigationManifest } from "@spilecms/sdk";
import Link from "next/link";

export function DocsSidebar({
  manifest,
  currentSlug,
}: {
  manifest: DocNavigationManifest;
  currentSlug: string;
}) {
  const {
    tree,
    breadcrumbs,
    prevPage,
    nextPage,
    isExpanded,
    toggleExpand,
  } = useSpileNav({
    manifest,
    currentSlug,
    autoExpandActiveParents: true, // Automatically expands active category
  });

  return (
    <aside className="w-64 border-r p-4">
      {tree.map((node) => (
        <div key={node.id}>
          {node.children ? (
            <div>
              <button onClick={() => toggleExpand(node.id)} className="font-semibold">
                {node.title}
              </button>
              {isExpanded(node.id) && (
                <div className="pl-4">
                  {node.children.map((child) => (
                    <Link
                      key={child.id}
                      href={`/docs/${child.slug}`}
                      className={child.slug === currentSlug ? "text-primary font-bold" : ""}
                    >
                      {child.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Link href={`/docs/${node.slug}`}>{node.title}</Link>
          )}
        </div>
      ))}
    </aside>
  );
}
```

---

### Right-Sidebar Table of Contents (`useSpileTOC`)

Extracts headings (`h1`, `h2`, `h3`) from blocks and tracks the active heading with `IntersectionObserver` as the user scrolls:

```tsx
"use client";

import { useSpileTOC } from "@spilecms/sdk/react";
import type { BlockNoteBlock } from "@spilecms/sdk";

export function TableOfContents({ blocks }: { blocks: BlockNoteBlock[] }) {
  const { headings, activeId, scrollToHeading } = useSpileTOC({
    blocks,
    minLevel: 2,
    maxLevel: 3,
  });

  if (headings.length === 0) return null;

  return (
    <nav className="space-y-1 text-sm">
      <p className="font-medium mb-2">On this page</p>
      {headings.map((heading) => (
        <button
          key={heading.id}
          onClick={() => scrollToHeading(heading.id)}
          className={`block text-left transition ${
            activeId === heading.id
              ? "text-primary font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
          style={{ paddingLeft: `${(heading.level - 2) * 12}px` }}
        >
          {heading.text}
        </button>
      ))}
    </nav>
  );
}
```

---

## Universal Pure HTML Serializer (`renderBlocksToHtml`)

For SSR, static site generators (Astro, SvelteKit, 11ty), or generating RSS feeds:

```ts
import { renderBlocksToHtml } from "@spilecms/sdk";

// Convert BlockNote blocks into clean, responsive HTML
const html = renderBlocksToHtml(post.content);

// With custom block serializer overrides:
const customHtml = renderBlocksToHtml(post.content, {
  renderers: {
    tweetEmbed: (block) => `<div class="tweet" data-id="${block.props?.tweetId}"></div>`,
  },
});
```

---

## Webhook Verification (`verifyWebhookSignature`)

Verifies HMAC-SHA256 webhook signatures using constant-time Web Crypto:

```ts
// Next.js Route Handler: app/api/webhooks/route.ts
import { verifyWebhookSignature } from "@spilecms/sdk";
import { headers } from "next/headers";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const headerList = await headers();
  const signature = headerList.get("x-spile-signature") || "";

  const isValid = await verifyWebhookSignature({
    payload: rawBody,
    signature,
    secret: process.env.SPILE_WEBHOOK_SECRET!,
    toleranceSeconds: 300, // Reject requests older than 5 minutes
  });

  if (!isValid) {
    return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(rawBody);
  console.log("Received webhook event:", event.event);

  return new Response("OK", { status: 200 });
}
```

---

## Client API Reference

```ts
const spile = createSpileClient({ baseUrl, apiKey });

// --- Posts & Articles ---
spile.posts.list({ locale: "fr", status: "published", page: 1, limit: 10 });
spile.posts.getBySlug("my-post-slug", { locale: "es" });
spile.posts.getById("post-id");
spile.posts.getTranslations("translation-group-id");

// --- Documentation ---
spile.docs.listProjects({ locale: "en" });
spile.docs.getProject("project-slug");
spile.docs.getNavigation("project-id");
spile.docs.getPage("page-slug", { locale: "de" });
spile.docs.getSearchIndex("project-id");

// --- Full-Text Search ---
spile.search.query({ q: "authentication", projectId: "doc-123", limit: 10 });

// --- Members & Newsletters ---
spile.members.subscribe({ email: "user@example.com", name: "Jane Doe" });

// --- Analytics ---
spile.analytics.track({ path: "/docs/intro", entityType: "doc_page", entityId: "page-123" });
```

---

## Contributing & Development

```bash
# Build package bundles (.mjs, .cjs, and .d.ts)
pnpm build:sdk

# Run automated test suite
pnpm test:sdk

# Typecheck
pnpm --filter @spilecms/sdk typecheck

# Check code formatting & linting
pnpm --filter @spilecms/sdk check
```

---

## License

[MIT](https://opensource.org/licenses/MIT) © Spile CMS

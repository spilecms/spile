<img width="1866" height="467" alt="Screenshot 2026-10-11 185805" src="https://github.com/user-attachments/assets/0705d940-a6f2-4e72-9988-9f254881595a" />


# Spile CMS
Spile is a self-hosted headless CMS for articles, documentation, and newsletters, shipped as a single Go binary. Write in a block-based dashboard, then pull your content into any frontend over a REST API. No Node runtime to babysit, no plugin maze, and no stitching four tools together just to publish.

## Why Spile

Publishing on the web usually means a pile of separate tools: one CMS for the blog, a docs platform for the product, a newsletter service for subscribers, and glue code to keep them in sync. Hosted options charge per seat and hold your content hostage. Self-hosted ones ask you to set up a runtime, a database, and a stack of plugins before you write a single word.

Spile takes the opposite approach. One file to deploy. One editor for every kind of content. One API, one set of keys, and one search across all of it. Your content is stored as structured blocks instead of baked-in HTML, so you render it in Next.js, Vite, Astro, or anything else, and your design stays entirely yours.

Spile is built for developers who want to own their stack without paying for it in complexity.

## What you get

- **Everything you publish, in one place:** articles (blog posts and more), documentation, and newsletters from the same editor.
- **A real docs engine:** doc projects with page trees, API reference blocks, code groups, callouts, and section-level search with deep links.
- **Bring your own frontend:** a clean REST API with an OpenAPI spec, so you are never locked into a framework.
- **Signed webhooks:** HMAC-verified events let your site revalidate the moment you publish.
- **Single binary:** the dashboard is embedded, so deploying is copying a file and running it.

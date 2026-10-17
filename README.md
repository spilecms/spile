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

---

## Quick Start

### 1. Docker Compose (Recommended)

Run Spile using the provided [docker-compose.yml](docker-compose.yml):

```bash
# Clone the repository
git clone https://github.com/spilecms/spile.git
cd spile

# Start Spile in the background
docker compose up -d
```

Open [http://localhost:8080](http://localhost:8080) to access the dashboard.

### 2. Docker Run

Run directly using the official GitHub Container Registry image:

```bash
docker run -d \
  --name spile \
  -p 8080:8080 \
  -v spile_data:/data \
  -e APP_ENV=production \
  -e SESSION_SECRET="$(openssl rand -base64 48)" \
  ghcr.io/spilecms/spile:latest
```

### 3. Standalone Binary

1. Download the latest compiled binary for your platform from [Releases](https://github.com/spilecms/spile/releases).
2. Set your `SESSION_SECRET` and start the server:

```bash
export SESSION_SECRET="your-strong-random-key"
./spile
```

### 4. Build from Source

Requirements: **Go 1.27+**, **Node.js 22+**, and **pnpm 9+**.

```bash
git clone https://github.com/spilecms/spile.git
cd spile

# Install dependencies for frontend and backend
pnpm install
pnpm setup

# Build frontend and start the production binary
pnpm start
```

For live reloading during local development, run `pnpm dev`.

---

## Configuration

Spile can be configured via environment variables or a `.env` file:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `8080` | Port the HTTP server listens on |
| `DATABASE_PATH` | `spile.db` | Path to the SQLite database file (`/data/spile.db` in Docker) |
| `SESSION_SECRET` | *(dev fallback)* | Secret for auth sessions. **Must be set in production** |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:8080` | Comma-separated list of allowed CORS origins |
| `UPLOADS_PATH` | `./uploads` | Directory where uploaded media files are stored |
| `MAX_UPLOAD_SIZE_MB`| `50` | Maximum media upload size in megabytes |
| `APP_ENV` | `development` | `development` or `production` |

---

## Architecture

Spile is engineered to minimize operational overhead:

- **Frontend:** React 19, TypeScript, and Vite embedded directly into the Go executable via `embed.FS`.
- **Backend:** Go REST API powered by Gin.
- **Database:** Pure-Go SQLite engine (`glebarez/sqlite`) requiring zero CGO or external database services.
- **Search:** Built-in SQLite full-text search with deep-linking to article and document headings.

---

## Contributing

We welcome contributions of all sizes! Please see our [Contributing Guide](CONTRIBUTING.md) for local development setup, code conventions, and pull request guidelines.

---

## License

Spile is open-source software licensed under the [MIT License](LICENSE).


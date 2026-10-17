# Contributing to Spile

Thank you for contributing to Spile! We welcome bug reports, feature requests, documentation improvements, and pull requests.

---

## Architecture Overview

Spile is packaged as a single Go binary that embeds a modern React SPA dashboard:

- **`api/`**: Go REST API server, database models, and search engine.
- **`web/`**: React 19 + TypeScript + Vite frontend dashboard (embedded via `web/embed.go`).
- **`bin/`**: Output directory for compiled binaries.

---

## Development Setup

### Prerequisites

- **Go:** `1.27+` ([`go.mod`](go.mod))
- **Node.js:** `22+`
- **pnpm:** `9+`

> **Note:** Spile uses a pure-Go SQLite driver, so `CGO` is not required.

### 1. Clone & Install

```bash
git clone https://github.com/spilecms/spile.git
cd spile
pnpm install
pnpm setup
```

`pnpm setup` installs frontend dependencies and downloads Go modules.

### 2. Initial Frontend Build

The Go binary embeds the frontend at compile time. Build the frontend once before running the backend:

```bash
pnpm build:web
```

### 3. Start Development Server

Run both the Go API (`:8080`) and Vite dev server (`:5173`) concurrently:

```bash
pnpm dev
```

To run them separately:
- **Frontend only:** `pnpm dev:web`
- **Backend only:** `pnpm dev:api`

---

## Useful Scripts

All routine workflows can be run directly from the repository root:

| Command | Description |
| :--- | :--- |
| `pnpm dev` | Run backend and frontend concurrently |
| `pnpm dev:web` | Start Vite frontend dev server (`:5173`) |
| `pnpm dev:api` | Start Go API server (`:8080`) |
| `pnpm check` | Run Biome lint/format checks and `go vet` |
| `pnpm check:write` | Auto-fix formatting and lint issues |
| `pnpm test` | Run Go test suite (`./api/...`) |
| `pnpm test:all` | Run backend tests and frontend checks |
| `pnpm build` | Build frontend bundle and compile Go binary |
| `pnpm start` | Build and run production server |

---

## Environment Variables

Spile runs with defaults in development. Optional variables:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `8080` | Port for the Go server |
| `DATABASE_PATH` | `spile.db` | Path to SQLite database file |
| `SESSION_SECRET` | *(dev fallback)* | Secret for sessions and tokens |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:8080` | Comma-separated list of allowed CORS origins |
| `UPLOADS_PATH` | `./uploads` | Local media uploads directory |
| `MAX_UPLOAD_SIZE_MB` | `50` | Maximum upload size in megabytes |
| `APP_ENV` | `development` | `development` or `production` |

---

## Pull Request Checklist

Before submitting a pull request:

1. Create a feature branch from `main` (`git checkout -b feat/your-feature`).
2. Follow coding & commit standards:
   - Format frontend code with Biome (`pnpm check:write`).
   - Format Go code with `gofmt`.
   - Follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages and PR titles (`feat:`, `fix:`, `docs:`, `chore:`, etc.). A git hook validates commits locally, and CI validates PR titles.
3. Ensure all tests and checks pass:
   ```bash
   pnpm test:all
   ```
4. Submit your PR against `main` with a clear description of your changes.

---

## Code of Conduct & License

- Please adhere to our [Code of Conduct](CODE_OF_CONDUCT.md).
- Contributions are licensed under the [MIT License](LICENSE).

# Contributing to Spile

Thank you for your interest in contributing to **Spile CMS**! Spile is built for developers who want a fast, self-hosted, single-binary headless CMS for articles, documentation, and newsletters without unnecessary complexity. Every bug report, feature suggestion, documentation improvement, and pull request helps make Spile better.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Architecture Overview](#architecture-overview)
- [Development Setup](#development-setup)
- [Building & Testing](#building--testing)
- [Coding Standards](#coding-standards)
- [Pull Request Process](#pull-request-process)

---

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

---

## Ways to Contribute

- **Report bugs:** Open an issue describing what happened, what you expected, and steps to reproduce the problem (including your OS, Go version, and browser if UI-related).
- **Propose features:** Before building a large new feature, open an issue to discuss its scope and design. Keeping Spile focused and lightweight is a core design goal.
- **Improve documentation:** Fixes to READMEs, OpenAPI specs, comments, or guides are always welcome.
- **Submit pull requests:** Pick up an open issue or fix a bug you encountered.

---

## Architecture Overview

Spile ships as a single Go binary with an embedded React SPA dashboard:

```text
.
├── api/
│   ├── main.go               # Server entrypoint & background scheduler
│   ├── internal/
│   │   ├── auth/             # Session, JWT, and API key authentication
│   │   ├── config/           # Environment configuration loader
│   │   ├── database/         # SQLite (pure Go) initialization & migrations
│   │   ├── email/            # SMTP / transactional & newsletter email sender
│   │   ├── handlers/         # Gin HTTP route handlers
│   │   ├── models/           # GORM data models & response serializers
│   │   ├── routes/           # API & embedded SPA route registration
│   │   ├── search/           # SQLite FTS search indexing & querying
│   │   ├── storage/          # Local media upload storage provider
│   │   ├── testutils/        # Test helpers & fixtures
│   │   └── webhook/          # HMAC-signed webhook dispatcher
│   └── tests/                # End-to-end API integration tests
└── web/                      # React 19 + TypeScript + Vite dashboard
    ├── embed.go              # go:embed directive for bundling web/dist
    └── src/                  # Frontend application source
```

---

## Development Setup

### Prerequisites

- **Go:** `1.27+` (see [`go.mod`](go.mod))
- **Node.js:** `22+`
- **pnpm:** `9+`

> **Note:** Spile uses a pure-Go SQLite driver (`github.com/glebarez/sqlite`), so `CGO` is not required to build or run the backend.

### 1. Clone the repository

```bash
git clone https://github.com/spilecms/spile.git
cd spile
```

### 2. Install frontend dependencies

```bash
cd web
pnpm install
```

### 3. Build the frontend once for `go:embed`

Because the Go binary embeds `web/dist` at compile time, you must run an initial frontend build before running `go run` or `go test`:

```bash
cd web
pnpm build
cd ..
```

### 4. Run in development mode

For full-stack development, run the Go API server and the Vite dev server in separate terminals:

**Terminal 1 — Go API Server (`:8080`):**

```bash
go run ./api
```

**Terminal 2 — Vite Frontend Dev Server (`:5173`):**

```bash
cd web
pnpm dev
```

### Environment Variables

Spile works out of the box with sensible defaults in development. You can customize behavior with the following environment variables:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `8080` | HTTP port for the Go server |
| `DATABASE_PATH` | `spile.db` | Path to the SQLite database file |
| `SESSION_SECRET` | *(dev fallback)* | Secret key used for signing sessions/tokens |
| `APP_ENV` | `development` | Environment mode (`development` or `production`) |

---

## Building & Testing

Before opening a pull request, make sure all checks and tests pass locally (matching our CI pipeline in [`.github/workflows/main.yml`](.github/workflows/main.yml)):

### Frontend linting, formatting, and typechecking

Spile uses [Biome](https://biomejs.dev/) and TypeScript in `web/`:

```bash
cd web
pnpm check        # Run Biome linter and formatter checks
pnpm check:write  # Automatically fix formatting and safe lint issues
pnpm build        # Typecheck (tsc -b) and build production bundle
```

### Backend tests

Make sure `web/dist` exists (`pnpm --dir web build`), then run the Go test suite:

```bash
go test ./api/... -v
```

### Building the single production binary

```bash
cd web && pnpm build && cd ..
go build -o spile ./api
```

---

## Coding Standards

- **Keep it simple:** Avoid unnecessary dependencies or abstractions. Spile values a small footprint and fast builds.
- **Go:**
  - Format code with `gofmt`.
  - Add or update integration tests in `api/tests/` when adding new endpoints or changing API behavior.
  - Ensure all database queries and error paths are handled cleanly.
- **Frontend (`web/`):**
  - Run `pnpm check:write` before committing so Biome formatting and lint rules stay consistent.
  - Ensure strict TypeScript types pass (`pnpm build`).

---

## Pull Request Process

1. **Fork the repository** and create your branch from `main` (e.g., `feat/webhook-retries` or `fix/search-pagination`).
2. **Make your changes** with clear, focused commits.
3. **Add tests** covering your new feature or bug fix.
4. **Verify CI checks locally:**
   - `cd web && pnpm check && pnpm build`
   - `go test ./api/... -v`
5. **Open a Pull Request** against `main` with a clear description of **what** changed and **why**. Link any relevant issues (e.g., `Closes #42`).

---

## License

By contributing to Spile, you agree that your contributions will be licensed under its [MIT License](LICENSE).

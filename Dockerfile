# ==============================================================================
# Stage 1: Build the React frontend
# ==============================================================================
FROM node:20-alpine AS web-builder

WORKDIR /app

# Install pnpm package manager
RUN npm install -g pnpm@10

# Copy workspace package manifests for layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY web/package.json ./web/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy frontend source code and configs
COPY web ./web

# Build frontend to web/dist
RUN pnpm --filter web build

# ==============================================================================
# Stage 2: Compile the Go binary (with embedded frontend)
# ==============================================================================
FROM golang:alpine AS api-builder

WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata

# Cache Go modules
COPY go.mod go.sum ./
RUN go mod download

# Copy backend source code
COPY api ./api
COPY web/embed.go ./web/

# Copy built frontend assets so //go:embed all:dist packages them into the binary
COPY --from=web-builder /app/web/dist ./web/dist

# Build pure-Go static binary (CGO disabled for maximum portability and security)
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /app/bin/spile ./api/main.go

# ==============================================================================
# Stage 3: Minimal production runtime
# ==============================================================================
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata wget

WORKDIR /app

# Create persistent storage directories
RUN mkdir -p /data /data/uploads

# Copy compiled Spile binary
COPY --from=api-builder /app/bin/spile /app/spile

# Default production environment variables
ENV APP_ENV=production \
    PORT=8080 \
    DATABASE_PATH=/data/spile.db \
    UPLOADS_PATH=/data/uploads

EXPOSE 8080

# Persistent volume for SQLite database and uploaded media
VOLUME ["/data"]

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8080/api/v1/health || exit 1

ENTRYPOINT ["/app/spile"]

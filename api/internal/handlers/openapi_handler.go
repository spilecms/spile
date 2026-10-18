package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

const openAPISpecJSON = `{
  "openapi": "3.0.3",
  "info": {
    "title": "Spile Headless CMS — Content Delivery API",
    "version": "1.0.0",
    "description": "Official OpenAPI 3.0 specification for the Spile Headless CMS Content Delivery API. Use a Public Read-Only token (pk_live_...) in the Authorization Bearer header to fetch published blog posts, documentation projects, navigation trees, tags, and locales."
  },
  "servers": [
    {
      "url": "http://localhost:8080/api/v1",
      "description": "Local Spile CMS Server"
    }
  ],
  "security": [
    {
      "BearerAuth": []
    }
  ],
  "tags": [
    { "name": "Search", "description": "Full-text section-level search and client search index" },
    { "name": "Posts", "description": "Published blog posts and articles" },
    { "name": "Docs", "description": "Published documentation projects, navigation trees, and pages" },
    { "name": "Taxonomy", "description": "Tags and workspace locales" },
    { "name": "Analytics", "description": "Headless pageview telemetry ingestion" },
    { "name": "System", "description": "Service health check" }
  ],
  "paths": {
    "/search": {
      "get": {
        "tags": ["Search"],
        "operationId": "searchContent",
        "summary": "Full-text search across published docs and posts",
        "description": "Searches pre-chunked published sections using SQLite FTS5 with bm25 per-column weights (params > pageTitle > sectionTitle > body > code), prefix matching, GitHub-style heading anchors, and XSS-safe character match ranges.",
        "parameters": [
          {
            "name": "q",
            "in": "query",
            "required": true,
            "description": "Search query string (supports prefixes and hyphenated/underscored identifiers like X-Spile-Signature or pk_live)",
            "schema": { "type": "string" }
          },
          {
            "name": "type",
            "in": "query",
            "required": false,
            "description": "Filter by content type: all, docs, or posts",
            "schema": { "type": "string", "enum": ["all", "docs", "posts"], "default": "all" }
          },
          {
            "name": "projectId",
            "in": "query",
            "required": false,
            "description": "Filter documentation results by project UUID or slug",
            "schema": { "type": "string" }
          },
          {
            "name": "locale",
            "in": "query",
            "required": false,
            "description": "Filter results by locale code (e.g. 'en')",
            "schema": { "type": "string" }
          },
          {
            "name": "limit",
            "in": "query",
            "required": false,
            "description": "Maximum number of ranked sections to return (1-50, default 20)",
            "schema": { "type": "integer", "default": 20, "minimum": 1, "maximum": 50 }
          }
        ],
        "responses": {
          "200": {
            "description": "Ranked section search results with highlight ranges",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/SearchResponse" }
              }
            }
          },
          "401": { "$ref": "#/components/responses/UnauthorizedError" }
        }
      }
    },
    "/posts": {
      "get": {
        "tags": ["Posts"],
        "operationId": "listPosts",
        "summary": "List published posts",
        "description": "Returns all published blog posts ordered by most recently updated.",
        "parameters": [
          {
            "name": "query",
            "in": "query",
            "required": false,
            "description": "Search filter matching post title or excerpt",
            "schema": { "type": "string" }
          },
          {
            "name": "tagId",
            "in": "query",
            "required": false,
            "description": "Filter posts by tag ID",
            "schema": { "type": "string" }
          },
          {
            "name": "authorId",
            "in": "query",
            "required": false,
            "description": "Filter posts by author ID",
            "schema": { "type": "string" }
          },
          {
            "name": "locale",
            "in": "query",
            "required": false,
            "description": "Filter posts by language code (e.g. 'en', 'es')",
            "schema": { "type": "string" }
          }
        ],
        "responses": {
          "200": {
            "description": "Array of published posts",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": { "$ref": "#/components/schemas/Post" }
                }
              }
            }
          },
          "401": { "$ref": "#/components/responses/UnauthorizedError" }
        }
      }
    },
    "/posts/{idOrSlug}": {
      "get": {
        "tags": ["Posts"],
        "operationId": "getPost",
        "summary": "Get a published post by ID or slug",
        "description": "Fetches a single published blog post by its UUID or URL slug. If locale is provided, resolves the translated variant or falls back to canonical.",
        "parameters": [
          {
            "name": "idOrSlug",
            "in": "path",
            "required": true,
            "description": "Post UUID or URL slug",
            "schema": { "type": "string" }
          },
          {
            "name": "locale",
            "in": "query",
            "required": false,
            "description": "Preferred language code. If translated post variant exists, it will be returned; otherwise falls back to canonical.",
            "schema": { "type": "string" }
          }
        ],
        "responses": {
          "200": {
            "description": "Published post detail",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/Post" }
              }
            }
          },
          "401": { "$ref": "#/components/responses/UnauthorizedError" },
          "404": { "$ref": "#/components/responses/NotFoundError" }
        }
      }
    },
    "/posts/translations/{groupId}": {
      "get": {
        "tags": ["Posts"],
        "operationId": "getPostTranslations",
        "summary": "List localized translations for a post",
        "parameters": [
          {
            "name": "groupId",
            "in": "path",
            "required": true,
            "description": "Translation group ID shared across localized versions of a post",
            "schema": { "type": "string" }
          }
        ],
        "responses": {
          "200": {
            "description": "Localized post variants",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": { "$ref": "#/components/schemas/Post" }
                }
              }
            }
          },
          "401": { "$ref": "#/components/responses/UnauthorizedError" }
        }
      }
    },
    "/docs/projects": {
      "get": {
        "tags": ["Docs"],
        "operationId": "listDocProjects",
        "summary": "List published documentation projects",
        "description": "Returns all published documentation projects along with their navigation trees.",
        "responses": {
          "200": {
            "description": "Array of published documentation projects",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": { "$ref": "#/components/schemas/DocumentationProject" }
                }
              }
            }
          },
          "401": { "$ref": "#/components/responses/UnauthorizedError" }
        }
      }
    },
    "/docs/projects/{idOrSlug}": {
      "get": {
        "tags": ["Docs"],
        "operationId": "getDocProject",
        "summary": "Get a published documentation project by ID or slug",
        "parameters": [
          {
            "name": "idOrSlug",
            "in": "path",
            "required": true,
            "description": "Documentation project UUID or URL slug",
            "schema": { "type": "string" }
          }
        ],
        "responses": {
          "200": {
            "description": "Documentation project detail and navigation tree",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/DocumentationProject" }
              }
            }
          },
          "401": { "$ref": "#/components/responses/UnauthorizedError" },
          "404": { "$ref": "#/components/responses/NotFoundError" }
        }
      }
    },
    "/docs/projects/{idOrSlug}/navigation": {
      "get": {
        "tags": ["Docs"],
        "operationId": "getDocNavigation",
        "summary": "Get documentation sidebar navigation tree",
        "parameters": [
          {
            "name": "idOrSlug",
            "in": "path",
            "required": true,
            "description": "Documentation project UUID or URL slug",
            "schema": { "type": "string" }
          },
          {
            "name": "locale",
            "in": "query",
            "required": false,
            "description": "Locale code (defaults to 'en')",
            "schema": { "type": "string", "default": "en" }
          }
        ],
        "responses": {
          "200": {
            "description": "Navigation manifest with nested tree items",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/DocNavigationManifest" }
              }
            }
          },
          "401": { "$ref": "#/components/responses/UnauthorizedError" }
        }
      }
    },
    "/docs/projects/{idOrSlug}/search-index": {
      "get": {
        "tags": ["Search", "Docs"],
        "operationId": "getDocProjectSearchIndex",
        "summary": "Get compact client-side search index for a documentation project",
        "description": "Returns pre-chunked published sections (titles, heading hierarchy, anchors, API parameter names, and truncated body without code blocks) for instant client-side search (MiniSearch / cmdk). Supports ETag caching (304 Not Modified) and Gzip compression.",
        "parameters": [
          {
            "name": "idOrSlug",
            "in": "path",
            "required": true,
            "description": "Documentation project UUID or URL slug",
            "schema": { "type": "string" }
          },
          {
            "name": "locale",
            "in": "query",
            "required": false,
            "description": "Locale code (defaults to 'en')",
            "schema": { "type": "string", "default": "en" }
          },
          {
            "name": "If-None-Match",
            "in": "header",
            "required": false,
            "description": "ETag from previous response to receive 304 Not Modified if unchanged",
            "schema": { "type": "string" }
          }
        ],
        "responses": {
          "200": {
            "description": "Compact client search index",
            "headers": {
              "ETag": {
                "description": "Entity tag for conditional caching",
                "schema": { "type": "string" }
              }
            },
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/ClientSearchIndexResponse" }
              }
            }
          },
          "304": {
            "description": "Not Modified (index unchanged since If-None-Match ETag)"
          },
          "401": { "$ref": "#/components/responses/UnauthorizedError" },
          "404": { "$ref": "#/components/responses/NotFoundError" }
        }
      }
    },
    "/docs/pages/{idOrSlug}": {
      "get": {
        "tags": ["Docs"],
        "operationId": "getDocPage",
        "summary": "Get a published documentation page by ID or slug",
        "description": "Fetches a published documentation page by its UUID or URL slug. If locale is provided, resolves the translated variant or falls back to canonical.",
        "parameters": [
          {
            "name": "idOrSlug",
            "in": "path",
            "required": true,
            "description": "Documentation page UUID or URL slug",
            "schema": { "type": "string" }
          },
          {
            "name": "locale",
            "in": "query",
            "required": false,
            "description": "Preferred language code. If translated page variant exists, it will be returned; otherwise falls back to canonical.",
            "schema": { "type": "string" }
          }
        ],
        "responses": {
          "200": {
            "description": "Published documentation page with BlockNote content blocks",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/DocPage" }
              }
            }
          },
          "401": { "$ref": "#/components/responses/UnauthorizedError" },
          "404": { "$ref": "#/components/responses/NotFoundError" }
        }
      }
    },
    "/docs/translations/{groupId}": {
      "get": {
        "tags": ["Docs"],
        "operationId": "getDocTranslations",
        "summary": "List localized translations for a documentation page",
        "parameters": [
          {
            "name": "groupId",
            "in": "path",
            "required": true,
            "description": "Translation group ID shared across localized versions of a doc page",
            "schema": { "type": "string" }
          }
        ],
        "responses": {
          "200": {
            "description": "Localized documentation page variants",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": { "$ref": "#/components/schemas/DocPage" }
                }
              }
            }
          },
          "401": { "$ref": "#/components/responses/UnauthorizedError" }
        }
      }
    },
    "/tags": {
      "get": {
        "tags": ["Taxonomy"],
        "operationId": "listTags",
        "summary": "List all tags",
        "responses": {
          "200": {
            "description": "Array of tags",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": { "$ref": "#/components/schemas/Tag" }
                }
              }
            }
          },
          "401": { "$ref": "#/components/responses/UnauthorizedError" }
        }
      }
    },
    "/locales": {
      "get": {
        "tags": ["Taxonomy"],
        "operationId": "listLocales",
        "summary": "List configured workspace locales",
        "responses": {
          "200": {
            "description": "Array of workspace locales",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": { "$ref": "#/components/schemas/WorkspaceLocale" }
                }
              }
            }
          },
          "401": { "$ref": "#/components/responses/UnauthorizedError" }
        }
      }
    },
    "/analytics/track": {
      "post": {
        "tags": ["Analytics"],
        "operationId": "trackPageView",
        "summary": "Record a pageview event from a headless frontend",
        "security": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": { "$ref": "#/components/schemas/TrackPageViewRequest" }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Pageview recorded",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": ["recorded", "id"],
                  "properties": {
                    "recorded": { "type": "boolean", "example": true },
                    "id": { "type": "string" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/health": {
      "get": {
        "tags": ["System"],
        "operationId": "healthCheck",
        "summary": "Health check endpoint",
        "security": [],
        "responses": {
          "200": {
            "description": "Server is healthy",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": ["status"],
                  "properties": {
                    "status": { "type": "string", "example": "ok" }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "securitySchemes": {
      "BearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "pk_live_<token>",
        "description": "Pass your Public Read-Only Content Delivery token: Authorization: Bearer pk_live_..."
      }
    },
    "responses": {
      "UnauthorizedError": {
        "description": "Missing or invalid pk_live_ API token",
        "content": {
          "application/json": {
            "schema": { "$ref": "#/components/schemas/ErrorResponse" }
          }
        }
      },
      "NotFoundError": {
        "description": "Requested resource was not found or is not published",
        "content": {
          "application/json": {
            "schema": { "$ref": "#/components/schemas/ErrorResponse" }
          }
        }
      }
    },
    "schemas": {
      "ErrorResponse": {
        "type": "object",
        "required": ["error"],
        "properties": {
          "error": { "type": "string" }
        }
      },
      "BlockNoteInlineContent": {
        "type": "object",
        "required": ["type"],
        "properties": {
          "type": {
            "type": "string",
            "enum": ["text", "link"],
            "example": "text"
          },
          "text": {
            "type": "string",
            "example": "Spile is a self-hosted headless CMS."
          },
          "href": {
            "type": "string",
            "example": "https://github.com/spilecms/spile"
          },
          "styles": {
            "type": "object",
            "description": "Inline formatting styles (bold, italic, underline, strike, code, textColor, backgroundColor)",
            "additionalProperties": true
          }
        }
      },
      "BlockNoteBlock": {
        "type": "object",
        "required": ["id", "type"],
        "properties": {
          "id": {
            "type": "string",
            "example": "c596ef30-4e3a-4299-a9a7-85b9b71329c2"
          },
          "type": {
            "type": "string",
            "description": "Block type: paragraph, heading, bulletListItem, numberedListItem, checkListItem, codeBlock, codeGroup, mathBlock, callout, paramField, responseField, image, video, audio, file, table, etc.",
            "example": "paragraph"
          },
          "props": {
            "type": "object",
            "description": "Block properties such as textColor, backgroundColor, textAlignment, level, language, etc.",
            "additionalProperties": true
          },
          "content": {
            "type": "array",
            "items": { "$ref": "#/components/schemas/BlockNoteInlineContent" }
          },
          "children": {
            "type": "array",
            "items": { "$ref": "#/components/schemas/BlockNoteBlock" }
          }
        }
      },
      "PostSEO": {
        "type": "object",
        "properties": {
          "metaTitle": { "type": "string" },
          "metaDescription": { "type": "string" }
        }
      },
      "Post": {
        "type": "object",
        "required": [
          "id",
          "type",
          "title",
          "excerpt",
          "status",
          "slug",
          "authorIds",
          "tagIds",
          "seo",
          "views",
          "readingTime",
          "createdAt",
          "updatedAt",
          "content",
          "locale",
          "isDefaultLocale",
          "translationGroupId"
        ],
        "properties": {
          "id": { "type": "string" },
          "type": { "type": "string", "example": "post" },
          "title": { "type": "string" },
          "excerpt": { "type": "string" },
          "status": { "type": "string", "enum": ["published"] },
          "authorIds": { "type": "array", "items": { "type": "string" } },
          "tagIds": { "type": "array", "items": { "type": "string" } },
          "slug": { "type": "string" },
          "featuredImage": { "type": "string" },
          "seo": { "$ref": "#/components/schemas/PostSEO" },
          "views": { "type": "integer" },
          "readingTime": { "type": "integer" },
          "createdAt": { "type": "integer", "format": "int64" },
          "updatedAt": { "type": "integer", "format": "int64" },
          "publishedAt": { "type": "integer", "format": "int64", "nullable": true },
          "scheduledFor": { "type": "integer", "format": "int64", "nullable": true },
          "content": {
            "type": "array",
            "description": "Structured BlockNote document blocks",
            "items": { "$ref": "#/components/schemas/BlockNoteBlock" }
          },
          "locale": { "type": "string", "example": "en" },
          "isDefaultLocale": { "type": "boolean" },
          "translationGroupId": { "type": "string" },
          "translationSourceId": { "type": "string", "nullable": true }
        }
      },
      "DocTreeItem": {
        "type": "object",
        "required": ["id", "title", "slug", "status"],
        "properties": {
          "id": { "type": "string" },
          "canonicalId": { "type": "string" },
          "parentId": { "type": "string", "nullable": true },
          "translationGroupId": { "type": "string" },
          "sourceDocId": { "type": "string" },
          "localizedDocId": { "type": "string" },
          "locale": { "type": "string" },
          "title": { "type": "string" },
          "slug": { "type": "string" },
          "icon": { "type": "string" },
          "status": { "type": "string", "enum": ["published", "draft"] },
          "children": {
            "type": "array",
            "items": { "$ref": "#/components/schemas/DocTreeItem" }
          }
        }
      },
      "DocNavigationManifest": {
        "type": "object",
        "required": ["id", "locale", "items", "updatedAt"],
        "properties": {
          "id": { "type": "string" },
          "locale": { "type": "string" },
          "items": {
            "type": "array",
            "items": { "$ref": "#/components/schemas/DocTreeItem" }
          },
          "updatedAt": { "type": "integer", "format": "int64" }
        }
      },
      "DocumentationProject": {
        "type": "object",
        "required": [
          "id",
          "title",
          "description",
          "slug",
          "status",
          "pagesCount",
          "createdAt",
          "updatedAt",
          "navigation"
        ],
        "properties": {
          "id": { "type": "string" },
          "title": { "type": "string" },
          "description": { "type": "string" },
          "slug": { "type": "string" },
          "status": { "type": "string", "enum": ["published"] },
          "pagesCount": { "type": "integer" },
          "createdAt": { "type": "integer", "format": "int64" },
          "updatedAt": { "type": "integer", "format": "int64" },
          "navigation": { "$ref": "#/components/schemas/DocNavigationManifest" }
        }
      },
      "DocPage": {
        "type": "object",
        "required": [
          "id",
          "projectId",
          "title",
          "slug",
          "status",
          "locale",
          "isDefaultLocale",
          "translationGroupId",
          "content",
          "createdAt",
          "updatedAt"
        ],
        "properties": {
          "id": { "type": "string" },
          "projectId": { "type": "string" },
          "parentId": { "type": "string", "nullable": true },
          "title": { "type": "string" },
          "slug": { "type": "string" },
          "icon": { "type": "string" },
          "status": { "type": "string", "enum": ["published"] },
          "locale": { "type": "string", "example": "en" },
          "isDefaultLocale": { "type": "boolean" },
          "translationGroupId": { "type": "string" },
          "translationSourceId": { "type": "string", "nullable": true },
          "content": {
            "type": "array",
            "description": "Structured BlockNote document blocks",
            "items": { "$ref": "#/components/schemas/BlockNoteBlock" }
          },
          "createdAt": { "type": "integer", "format": "int64" },
          "updatedAt": { "type": "integer", "format": "int64" }
        }
      },
      "Tag": {
        "type": "object",
        "required": ["id", "name", "slug", "color", "postCount"],
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "slug": { "type": "string" },
          "color": { "type": "string" },
          "postCount": { "type": "integer" }
        }
      },
      "WorkspaceLocale": {
        "type": "object",
        "required": ["code", "name", "flag", "isDefault"],
        "properties": {
          "code": { "type": "string", "example": "en" },
          "name": { "type": "string", "example": "English" },
          "flag": { "type": "string", "example": "🇺🇸" },
          "isDefault": { "type": "boolean" }
        }
      },
      "TrackPageViewRequest": {
        "type": "object",
        "required": ["entityType", "entityId"],
        "properties": {
          "entityType": { "type": "string", "enum": ["post", "doc"] },
          "entityId": { "type": "string" },
          "visitorHash": { "type": "string" },
          "countryCode": { "type": "string", "example": "US" },
          "countryName": { "type": "string", "example": "United States" },
          "referrer": { "type": "string", "example": "https://google.com" },
          "device": { "type": "string", "enum": ["desktop", "mobile", "tablet"] },
          "readTimeSeconds": { "type": "integer", "example": 180 },
          "bounced": { "type": "boolean", "example": false }
        }
      },
      "MatchRange": {
        "type": "object",
        "required": ["start", "end"],
        "properties": {
          "start": { "type": "integer", "description": "Inclusive start character offset" },
          "end": { "type": "integer", "description": "Exclusive end character offset" }
        }
      },
      "SearchResult": {
        "type": "object",
        "required": [
          "id",
          "entityId",
          "type",
          "locale",
          "pageTitle",
          "pageSlug",
          "sectionTitle",
          "headingPath",
          "anchor",
          "kind",
          "snippet",
          "titleMatches",
          "snippetMatches",
          "score",
          "updatedAt"
        ],
        "properties": {
          "id": { "type": "string" },
          "entityId": { "type": "string" },
          "type": { "type": "string", "enum": ["doc", "post"] },
          "projectId": { "type": "string" },
          "projectSlug": { "type": "string" },
          "projectTitle": { "type": "string" },
          "locale": { "type": "string", "example": "en" },
          "pageTitle": { "type": "string" },
          "pageSlug": { "type": "string" },
          "sectionTitle": { "type": "string" },
          "headingPath": {
            "type": "array",
            "items": { "type": "string" }
          },
          "anchor": { "type": "string", "description": "GitHub-style deduplicated heading anchor slug (empty for intro section)" },
          "blockId": { "type": "string", "description": "Internal Editor.js block ID" },
          "kind": { "type": "string", "enum": ["intro", "section"] },
          "paramNames": {
            "type": "array",
            "items": { "type": "string" }
          },
          "snippet": { "type": "string" },
          "titleMatches": {
            "type": "array",
            "items": { "$ref": "#/components/schemas/MatchRange" }
          },
          "snippetMatches": {
            "type": "array",
            "items": { "$ref": "#/components/schemas/MatchRange" }
          },
          "score": { "type": "number", "format": "double" },
          "updatedAt": { "type": "integer", "format": "int64" }
        }
      },
      "SearchResponse": {
        "type": "object",
        "required": ["query", "total", "results"],
        "properties": {
          "query": { "type": "string" },
          "total": { "type": "integer" },
          "results": {
            "type": "array",
            "items": { "$ref": "#/components/schemas/SearchResult" }
          }
        }
      },
      "ClientSearchIndexItem": {
        "type": "object",
        "required": [
          "id",
          "pageId",
          "locale",
          "pageTitle",
          "pageSlug",
          "sectionTitle",
          "headingPath",
          "anchor",
          "kind",
          "text",
          "updatedAt"
        ],
        "properties": {
          "id": { "type": "string" },
          "pageId": { "type": "string" },
          "locale": { "type": "string" },
          "pageTitle": { "type": "string" },
          "pageSlug": { "type": "string" },
          "sectionTitle": { "type": "string" },
          "headingPath": {
            "type": "array",
            "items": { "type": "string" }
          },
          "anchor": { "type": "string" },
          "kind": { "type": "string", "enum": ["intro", "section"] },
          "paramNames": {
            "type": "array",
            "items": { "type": "string" }
          },
          "text": { "type": "string", "description": "Plain text body capped at ~300 characters (code blocks excluded)" },
          "updatedAt": { "type": "integer", "format": "int64" }
        }
      },
      "ClientSearchIndexResponse": {
        "type": "object",
        "required": ["projectId", "projectSlug", "locale", "updatedAt", "total", "items"],
        "properties": {
          "projectId": { "type": "string" },
          "projectSlug": { "type": "string" },
          "locale": { "type": "string" },
          "updatedAt": { "type": "integer", "format": "int64" },
          "total": { "type": "integer" },
          "items": {
            "type": "array",
            "items": { "$ref": "#/components/schemas/ClientSearchIndexItem" }
          }
        }
      }
    }
  }
}`

// ServeOpenAPISpec returns the raw OpenAPI 3.0 JSON specification
func ServeOpenAPISpec(c *gin.Context) {
	c.Data(http.StatusOK, "application/json; charset=utf-8", []byte(openAPISpecJSON))
}

// ServeOpenAPIDocs renders an interactive Scalar API Reference UI for the OpenAPI spec
func ServeOpenAPIDocs(c *gin.Context) {
	html := `<!doctype html>
<html>
  <head>
    <title>Spile CMS — Content Delivery API Reference</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <script id="api-reference" data-url="/api/v1/openapi.json"></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`
	c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(html))
}

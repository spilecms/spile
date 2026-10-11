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
    { "name": "Posts", "description": "Published blog posts and articles" },
    { "name": "Docs", "description": "Published documentation projects, navigation trees, and pages" },
    { "name": "Taxonomy", "description": "Tags and workspace locales" },
    { "name": "Analytics", "description": "Headless pageview telemetry ingestion" },
    { "name": "System", "description": "Service health check" }
  ],
  "paths": {
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
        "description": "Fetches a single published blog post by its UUID or URL slug.",
        "parameters": [
          {
            "name": "idOrSlug",
            "in": "path",
            "required": true,
            "description": "Post UUID or URL slug",
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
    "/docs/pages/{idOrSlug}": {
      "get": {
        "tags": ["Docs"],
        "operationId": "getDocPage",
        "summary": "Get a published documentation page by ID or slug",
        "parameters": [
          {
            "name": "idOrSlug",
            "in": "path",
            "required": true,
            "description": "Documentation page UUID or URL slug",
            "schema": { "type": "string" }
          }
        ],
        "responses": {
          "200": {
            "description": "Published documentation page with Editor.js content blocks",
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
      "EditorBlock": {
        "type": "object",
        "required": ["type", "data"],
        "properties": {
          "id": { "type": "string" },
          "type": {
            "type": "string",
            "description": "Block type (e.g. header, paragraph, list, code, quote, callout, image, table, delimiter)"
          },
          "data": {
            "type": "object",
            "additionalProperties": true
          }
        }
      },
      "EditorContent": {
        "type": "object",
        "required": ["blocks"],
        "properties": {
          "time": { "type": "integer", "format": "int64" },
          "version": { "type": "string" },
          "blocks": {
            "type": "array",
            "items": { "$ref": "#/components/schemas/EditorBlock" }
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
          "content": { "$ref": "#/components/schemas/EditorContent" },
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
          "content": { "$ref": "#/components/schemas/EditorContent" },
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

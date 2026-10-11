package handlers

import (
	"compress/gzip"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/spilecms/spile/api/internal/auth"
	"github.com/spilecms/spile/api/internal/models"
	"github.com/spilecms/spile/api/internal/search"
	"gorm.io/gorm"
)

type SearchHandler struct {
	db       *gorm.DB
	searcher search.Searcher
}

func NewSearchHandler(db *gorm.DB, searchers ...search.Searcher) *SearchHandler {
	var s search.Searcher
	if len(searchers) > 0 && searchers[0] != nil {
		s = searchers[0]
	} else {
		s, _ = search.NewSQLiteSearcher(db)
	}
	return &SearchHandler{db: db, searcher: s}
}

// Search handles GET /api/v1/search
// Query parameters:
//   - q (or query): search query string
//   - type: "all" (default) | "docs" | "posts"
//   - projectId: filter docs to a specific project ID or project slug
//   - locale: filter by content locale (e.g. "en")
//   - limit: max results (default 20, max 50)
func (h *SearchHandler) Search(c *gin.Context) {
	q := strings.TrimSpace(c.Query("q"))
	if q == "" {
		q = strings.TrimSpace(c.Query("query"))
	}
	entityType := strings.TrimSpace(c.DefaultQuery("type", "all"))
	projectID := strings.TrimSpace(c.Query("projectId"))
	locale := strings.TrimSpace(c.Query("locale"))

	limit := 20
	if rawLimit := strings.TrimSpace(c.Query("limit")); rawLimit != "" {
		if parsed, err := strconv.Atoi(rawLimit); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	if h.searcher == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Search engine not initialized"})
		return
	}

	resp, err := h.searcher.Search(search.SearchParams{
		Query:      q,
		EntityType: entityType,
		ProjectID:  projectID,
		Locale:     locale,
		Limit:      limit,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to execute search"})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// GetProjectSearchIndex handles GET /api/v1/docs/projects/:id/search-index
// Serves a compact, pre-chunked client search index (titles, headings, paramNames, and truncated body without code blocks)
// with ETag (304 Not Modified) and transparent Gzip compression.
func (h *SearchHandler) GetProjectSearchIndex(c *gin.Context) {
	idOrSlug := strings.TrimSpace(c.Param("id"))
	locale := strings.TrimSpace(c.DefaultQuery("locale", "en"))

	if auth.IsPublicReadKey(c) {
		var proj models.DocumentationProject
		if err := h.db.Where("(id = ? OR slug = ?) AND status = ?", idOrSlug, idOrSlug, "published").First(&proj).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Documentation project not found"})
			return
		}
	}

	if h.searcher == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Search engine not initialized"})
		return
	}

	indexResp, etag, err := h.searcher.GetProjectSearchIndex(idOrSlug, locale)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Documentation project not found"})
		return
	}

	c.Header("ETag", etag)
	c.Header("Cache-Control", "public, max-age=60, stale-while-revalidate=300")
	c.Header("Vary", "Accept-Encoding")

	if ifNoneMatch := strings.TrimSpace(c.GetHeader("If-None-Match")); ifNoneMatch != "" && ifNoneMatch == etag {
		c.Status(http.StatusNotModified)
		return
	}

	payload, err := json.Marshal(indexResp)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to serialize search index"})
		return
	}

	acceptEncoding := c.GetHeader("Accept-Encoding")
	if strings.Contains(strings.ToLower(acceptEncoding), "gzip") {
		c.Header("Content-Encoding", "gzip")
		c.Header("Content-Type", "application/json; charset=utf-8")
		c.Status(http.StatusOK)
		gz := gzip.NewWriter(c.Writer)
		_, _ = gz.Write(payload)
		_ = gz.Close()
		return
	}

	c.Data(http.StatusOK, "application/json; charset=utf-8", payload)
}

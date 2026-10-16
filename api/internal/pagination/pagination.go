package pagination

import (
	"math"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// Params holds the parsed pagination parameters.
type Params struct {
	Page        int  `json:"page"`
	Limit       int  `json:"limit"`
	IsPaginated bool `json:"-"`
}

// Parse extracts pagination parameters from a gin.Context.
// Defaults: page=1, limit=20 (max 100).
func Parse(c *gin.Context) Params {
	pageStr := c.Query("page")
	limitStr := c.Query("limit")
	paginatedStr := c.Query("paginated")

	isPaginated := pageStr != "" || limitStr != "" || paginatedStr == "true"

	page := 1
	if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
		page = p
	}

	limit := 20
	if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
		limit = l
	}
	if limit > 100 {
		limit = 100
	}

	return Params{
		Page:        page,
		Limit:       limit,
		IsPaginated: isPaginated,
	}
}

// Offset returns the SQL offset for the current page and limit.
func (p Params) Offset() int {
	return (p.Page - 1) * p.Limit
}

// PageResult represents a standardized paginated response wrapper.
type PageResult[T any] struct {
	Data       []T   `json:"data"`
	Total      int64 `json:"total"`
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	TotalPages int   `json:"totalPages"`
}

// SetHeaders applies standard pagination headers to the HTTP response.
func SetHeaders(c *gin.Context, total int64, p Params) {
	limit := p.Limit
	if limit <= 0 {
		limit = 20
	}
	totalPages := 1
	if total > 0 {
		totalPages = int(math.Ceil(float64(total) / float64(limit)))
	}
	c.Header("X-Total-Count", strconv.FormatInt(total, 10))
	c.Header("X-Page", strconv.Itoa(p.Page))
	c.Header("X-Limit", strconv.Itoa(limit))
	c.Header("X-Total-Pages", strconv.Itoa(totalPages))
}

// WriteResponse sends the response as a JSON array (default, with headers) or wrapped PageResult if requested.
func WriteResponse[T any](c *gin.Context, p Params, total int64, items []T) {
	SetHeaders(c, total, p)

	if c.Query("paginated") == "true" {
		limit := p.Limit
		if limit <= 0 {
			limit = 20
		}
		totalPages := 1
		if total > 0 {
			totalPages = int(math.Ceil(float64(total) / float64(limit)))
		}
		c.JSON(http.StatusOK, PageResult[T]{
			Data:       items,
			Total:      total,
			Page:       p.Page,
			Limit:      limit,
			TotalPages: totalPages,
		})
		return
	}

	c.JSON(http.StatusOK, items)
}

// ApplyToQuery applies pagination offset and limit to a GORM query if pagination is requested.
func (p Params) ApplyToQuery(dbQuery *gorm.DB) *gorm.DB {
	if p.IsPaginated {
		return dbQuery.Offset(p.Offset()).Limit(p.Limit)
	}
	return dbQuery
}

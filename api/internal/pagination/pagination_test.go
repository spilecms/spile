package pagination_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/spilecms/spile/api/internal/pagination"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func TestPagination_Parse(t *testing.T) {
	// 1. Defaults when no query params are passed
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest(http.MethodGet, "/posts", nil)

	p := pagination.Parse(c)
	assert.False(t, p.IsPaginated)
	assert.Equal(t, 1, p.Page)
	assert.Equal(t, 20, p.Limit)
	assert.Equal(t, 0, p.Offset())

	// 2. Custom page and limit
	w = httptest.NewRecorder()
	c, _ = gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest(http.MethodGet, "/posts?page=3&limit=15", nil)

	p = pagination.Parse(c)
	assert.True(t, p.IsPaginated)
	assert.Equal(t, 3, p.Page)
	assert.Equal(t, 15, p.Limit)
	assert.Equal(t, 30, p.Offset())

	// 3. Max limit cap at 100
	w = httptest.NewRecorder()
	c, _ = gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest(http.MethodGet, "/posts?limit=500", nil)

	p = pagination.Parse(c)
	assert.True(t, p.IsPaginated)
	assert.Equal(t, 100, p.Limit)

	// 4. Invalid numbers fallback safely
	w = httptest.NewRecorder()
	c, _ = gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest(http.MethodGet, "/posts?page=-2&limit=abc", nil)

	p = pagination.Parse(c)
	assert.True(t, p.IsPaginated)
	assert.Equal(t, 1, p.Page)
	assert.Equal(t, 20, p.Limit)
}

func TestPagination_WriteResponse(t *testing.T) {
	items := []string{"item1", "item2", "item3"}

	// 1. Standard array response with headers
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest(http.MethodGet, "/posts?page=2&limit=10", nil)
	p := pagination.Parse(c)

	pagination.WriteResponse(c, p, 25, items)
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "25", w.Header().Get("X-Total-Count"))
	assert.Equal(t, "2", w.Header().Get("X-Page"))
	assert.Equal(t, "10", w.Header().Get("X-Limit"))
	assert.Equal(t, "3", w.Header().Get("X-Total-Pages"))

	var resArray []string
	err := json.Unmarshal(w.Body.Bytes(), &resArray)
	require.NoError(t, err)
	assert.Equal(t, items, resArray)

	// 2. Wrapped Paginated response
	w = httptest.NewRecorder()
	c, _ = gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest(http.MethodGet, "/posts?page=2&limit=10&paginated=true", nil)
	p = pagination.Parse(c)

	pagination.WriteResponse(c, p, 25, items)
	assert.Equal(t, http.StatusOK, w.Code)

	var resWrapper pagination.PageResult[string]
	err = json.Unmarshal(w.Body.Bytes(), &resWrapper)
	require.NoError(t, err)
	assert.Equal(t, int64(25), resWrapper.Total)
	assert.Equal(t, 2, resWrapper.Page)
	assert.Equal(t, 10, resWrapper.Limit)
	assert.Equal(t, 3, resWrapper.TotalPages)
	assert.Equal(t, items, resWrapper.Data)
}

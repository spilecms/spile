package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/spilecms/spile/api/internal/models"
	"github.com/spilecms/spile/api/internal/testutils"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAnalytics_HeaderForwardingFallbacks(t *testing.T) {
	app := testutils.NewTestApp(t)

	author := app.CreateUser("Author", "author@spile.io", "Pass12345", models.RoleAuthor)
	token := app.CreateSession(author.ID)

	// Create a test post
	createRes := app.Client().WithToken(token).PostJSON("/api/v1/posts", map[string]any{
		"title":  "Analytics Telemetry Post",
		"status": "published",
	})
	require.Equal(t, http.StatusCreated, createRes.Code)
	var post models.PostResponse
	require.NoError(t, json.Unmarshal(createRes.Body.Bytes(), &post))

	// Send track request with minimal JSON payload and forwarded SSR headers
	body, _ := json.Marshal(map[string]any{
		"entityType": "post",
		"entityId":   post.ID,
	})

	req, _ := http.NewRequest(http.MethodPost, "/api/v1/analytics/track", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")
	req.Header.Set("Referer", "https://news.ycombinator.com")
	req.Header.Set("CF-IPCountry", "CA")
	req.Header.Set("X-Forwarded-For", "198.51.100.42")

	w := httptest.NewRecorder()
	app.Router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusCreated, w.Code)

	// Verify database record has all forwarded header attributes properly captured
	var pv models.PageView
	err := app.DB.First(&pv, "entity_id = ?", post.ID).Error
	require.NoError(t, err)

	assert.Equal(t, "post", pv.EntityType)
	assert.Equal(t, post.ID, pv.EntityID)
	assert.Equal(t, "mobile", pv.Device)
	assert.Equal(t, "https://news.ycombinator.com", pv.Referrer)
	assert.Equal(t, "CA", pv.CountryCode)
	assert.Equal(t, "198.51.100.42", pv.VisitorHash)

	// Verify post view count incremented
	var updatedPost models.Post
	app.DB.First(&updatedPost, "id = ?", post.ID)
	assert.Equal(t, 1, updatedPost.Views)
}

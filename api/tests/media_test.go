package tests

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/spilecms/spile/api/internal/models"
	"github.com/spilecms/spile/api/internal/testutils"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMedia_Lifecycle(t *testing.T) {
	app := testutils.NewTestApp(t)

	author := app.CreateUser("Author", "author@spile.io", "Pass12345", models.RoleAuthor)
	token := app.CreateSession(author.ID)

	// 1. Upload an image file
	dummyPNG := []byte("\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82")
	extra := map[string]string{
		"altText": "A scenic mountain vista",
		"caption": "Photo from the ridge",
		"tags":    "nature,landscape",
	}

	uploadRes := app.Client().WithToken(token).PostMultipart(
		"/api/v1/media/upload",
		"file",
		"mountain.png",
		dummyPNG,
		extra,
	)
	assert.Equal(t, http.StatusCreated, uploadRes.Code)

	var item models.MediaItemResponse
	err := json.Unmarshal(uploadRes.Body.Bytes(), &item)
	require.NoError(t, err)

	assert.NotEmpty(t, item.ID)
	assert.Equal(t, "mountain.png", item.Name)
	assert.Equal(t, "A scenic mountain vista", item.AltText)
	assert.Equal(t, "image/png", item.MimeType)
	assert.Contains(t, item.Tags, "nature")
	assert.Contains(t, item.Tags, "landscape")
	assert.Equal(t, author.ID, item.UploadedBy.ID)
	assert.NotEmpty(t, item.URL)

	// 2. Fetch media item by ID
	getRes := app.Client().WithToken(token).Get("/api/v1/media/" + item.ID)
	assert.Equal(t, http.StatusOK, getRes.Code)

	// 3. Update media metadata
	updatePayload := map[string]any{
		"altText": "Updated alt text",
		"title":   "Ridge View",
		"tags":    []string{"mountains", "alps"},
	}
	upRes := app.Client().WithToken(token).PutJSON("/api/v1/media/"+item.ID, updatePayload)
	assert.Equal(t, http.StatusOK, upRes.Code)

	var updated models.MediaItemResponse
	_ = json.Unmarshal(upRes.Body.Bytes(), &updated)
	assert.Equal(t, "Updated alt text", updated.AltText)
	assert.Equal(t, "Ridge View", updated.Title)
	assert.Contains(t, updated.Tags, "mountains")

	// 4. Query media list with filters
	listRes := app.Client().WithToken(token).Get("/api/v1/media?type=image&tag=mountains")
	assert.Equal(t, http.StatusOK, listRes.Code)

	var listItems []models.MediaItemResponse
	_ = json.Unmarshal(listRes.Body.Bytes(), &listItems)
	assert.Len(t, listItems, 1)

	// 5. Query stats
	statsRes := app.Client().WithToken(token).Get("/api/v1/media/stats")
	assert.Equal(t, http.StatusOK, statsRes.Code)

	var stats map[string]any
	_ = json.Unmarshal(statsRes.Body.Bytes(), &stats)
	assert.Equal(t, float64(1), stats["totalCount"])
	assert.Equal(t, float64(1), stats["imageCount"])

	// 6. Delete media item
	delRes := app.Client().WithToken(token).Delete("/api/v1/media/" + item.ID)
	assert.Equal(t, http.StatusOK, delRes.Code)

	// Verify gone
	afterDelRes := app.Client().WithToken(token).Get("/api/v1/media/" + item.ID)
	assert.Equal(t, http.StatusNotFound, afterDelRes.Code)
}

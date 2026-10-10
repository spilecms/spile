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

func TestTags_Lifecycle(t *testing.T) {
	app := testutils.NewTestApp(t)

	editor := app.CreateUser("Editor", "editor@spile.io", "Pass12345", models.RoleEditor)
	token := app.CreateSession(editor.ID)

	// 1. Initially empty
	res := app.Client().WithToken(token).Get("/api/v1/tags")
	assert.Equal(t, http.StatusOK, res.Code)
	var tags []models.TagResponse
	err := json.Unmarshal(res.Body.Bytes(), &tags)
	require.NoError(t, err)
	assert.Empty(t, tags)

	// 2. Create tag
	createPayload := map[string]string{
		"name":  "Technology & AI",
		"color": "#3b82f6",
	}
	createRes := app.Client().WithToken(token).PostJSON("/api/v1/tags", createPayload)
	assert.Equal(t, http.StatusCreated, createRes.Code)

	var createdTag models.TagResponse
	err = json.Unmarshal(createRes.Body.Bytes(), &createdTag)
	require.NoError(t, err)
	assert.NotEmpty(t, createdTag.ID)
	assert.Equal(t, "Technology & AI", createdTag.Name)
	assert.Equal(t, "technology-ai", createdTag.Slug)
	assert.Equal(t, "#3b82f6", createdTag.Color)

	// 3. Update tag
	updatePayload := map[string]string{
		"name":  "AI & Machine Learning",
		"color": "#10b981",
	}
	updateRes := app.Client().WithToken(token).PutJSON("/api/v1/tags/"+createdTag.ID, updatePayload)
	assert.Equal(t, http.StatusOK, updateRes.Code)

	var updatedTag models.TagResponse
	err = json.Unmarshal(updateRes.Body.Bytes(), &updatedTag)
	require.NoError(t, err)
	assert.Equal(t, "AI & Machine Learning", updatedTag.Name)
	assert.Equal(t, "#10b981", updatedTag.Color)

	// 4. Delete tag
	delRes := app.Client().WithToken(token).Delete("/api/v1/tags/" + createdTag.ID)
	assert.Equal(t, http.StatusOK, delRes.Code)

	// Verify tag is deleted
	listRes := app.Client().WithToken(token).Get("/api/v1/tags")
	var remainingTags []models.TagResponse
	_ = json.Unmarshal(listRes.Body.Bytes(), &remainingTags)
	assert.Empty(t, remainingTags)
}

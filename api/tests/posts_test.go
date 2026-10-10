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

func TestPosts_Lifecycle(t *testing.T) {
	app := testutils.NewTestApp(t)

	author := app.CreateUser("Author", "author@spile.io", "Pass12345", models.RoleAuthor)
	token := app.CreateSession(author.ID)

	// Create a tag first
	tag := models.Tag{Name: "Engineering", Slug: "engineering", Color: "#6366f1"}
	app.DB.Create(&tag)

	// 1. Create a draft post with Editor.js content
	contentBlocks := map[string]any{
		"time": 1728580000000,
		"blocks": []any{
			map[string]any{
				"id":   "b1",
				"type": "paragraph",
				"data": map[string]any{"text": "Hello world from Spile!"},
			},
		},
		"version": "2.31.7",
	}

	createPayload := map[string]any{
		"title":   "Building Next-Gen CMS Platforms",
		"excerpt": "A deep dive into Go and modern web architecture.",
		"content": contentBlocks,
		"tagIds":  []string{tag.ID},
		"seo": map[string]string{
			"metaTitle":       "Next-Gen CMS",
			"metaDescription": "Go and modern architecture",
		},
	}

	res := app.Client().WithToken(token).PostJSON("/api/v1/posts", createPayload)
	assert.Equal(t, http.StatusCreated, res.Code)

	var createdPost models.PostResponse
	err := json.Unmarshal(res.Body.Bytes(), &createdPost)
	require.NoError(t, err)

	assert.NotEmpty(t, createdPost.ID)
	assert.Equal(t, "Building Next-Gen CMS Platforms", createdPost.Title)
	assert.Equal(t, "building-next-gen-cms-platforms", createdPost.Slug)
	assert.Equal(t, models.PostStatusDraft, createdPost.Status)
	assert.Contains(t, createdPost.AuthorIDs, author.ID)
	assert.Contains(t, createdPost.TagIDs, tag.ID)
	assert.Equal(t, "Next-Gen CMS", createdPost.SEO.MetaTitle)
	assert.Nil(t, createdPost.PublishedAt)

	// Verify tag's postCount was incremented
	var updatedTag models.Tag
	app.DB.First(&updatedTag, "id = ?", tag.ID)
	assert.Equal(t, 1, updatedTag.PostCount)

	// 2. Fetch post by ID
	getRes := app.Client().WithToken(token).Get("/api/v1/posts/" + createdPost.ID)
	assert.Equal(t, http.StatusOK, getRes.Code)

	// 3. Update post and Publish
	updatePayload := map[string]any{
		"status": "published",
		"title":  "Building Next-Gen CMS Platforms (Updated)",
	}
	updateRes := app.Client().WithToken(token).PutJSON("/api/v1/posts/"+createdPost.ID, updatePayload)
	assert.Equal(t, http.StatusOK, updateRes.Code)

	var updatedPost models.PostResponse
	err = json.Unmarshal(updateRes.Body.Bytes(), &updatedPost)
	require.NoError(t, err)
	assert.Equal(t, models.PostStatusPublished, updatedPost.Status)
	assert.NotNil(t, updatedPost.PublishedAt)

	// 4. Duplicate post
	dupRes := app.Client().WithToken(token).PostJSON("/api/v1/posts/"+createdPost.ID+"/duplicate", nil)
	assert.Equal(t, http.StatusCreated, dupRes.Code)

	var dupPost models.PostResponse
	_ = json.Unmarshal(dupRes.Body.Bytes(), &dupPost)
	assert.NotEqual(t, createdPost.ID, dupPost.ID)
	assert.Equal(t, "Building Next-Gen CMS Platforms (Updated) (copy)", dupPost.Title)
	assert.Equal(t, models.PostStatusDraft, dupPost.Status)

	// 5. Query posts by status filter
	pubListRes := app.Client().WithToken(token).Get("/api/v1/posts?status=published")
	assert.Equal(t, http.StatusOK, pubListRes.Code)
	var pubPosts []models.PostResponse
	_ = json.Unmarshal(pubListRes.Body.Bytes(), &pubPosts)
	assert.Len(t, pubPosts, 1)
	assert.Equal(t, createdPost.ID, pubPosts[0].ID)

	// 6. Delete post
	delRes := app.Client().WithToken(token).Delete("/api/v1/posts/" + createdPost.ID)
	assert.Equal(t, http.StatusOK, delRes.Code)
}

func TestPosts_LocalizationAndTranslations(t *testing.T) {
	app := testutils.NewTestApp(t)

	author := app.CreateUser("Author", "author@spile.io", "Pass12345", models.RoleAuthor)
	token := app.CreateSession(author.ID)

	// 1. Create source post in English
	sourceRes := app.Client().WithToken(token).PostJSON("/api/v1/posts", map[string]any{
		"title":   "Hello World",
		"locale":  "en",
		"content": map[string]any{"blocks": []any{}},
	})
	assert.Equal(t, http.StatusCreated, sourceRes.Code)

	var sourcePost models.PostResponse
	_ = json.Unmarshal(sourceRes.Body.Bytes(), &sourcePost)

	// 2. Create Spanish translation for the same translationGroupId
	transRes := app.Client().WithToken(token).PostJSON("/api/v1/posts/"+sourcePost.ID+"/translations", map[string]any{
		"locale":      "es",
		"title":       "Hola Mundo",
		"copyContent": true,
	})
	assert.Equal(t, http.StatusCreated, transRes.Code)

	var transPost models.PostResponse
	_ = json.Unmarshal(transRes.Body.Bytes(), &transPost)
	assert.Equal(t, "es", transPost.Locale)
	assert.Equal(t, sourcePost.TranslationGroupID, transPost.TranslationGroupID)
	assert.Equal(t, sourcePost.ID, *transPost.TranslationSourceID)

	// 3. Query all translations for the group
	groupRes := app.Client().WithToken(token).Get("/api/v1/posts/translations/" + sourcePost.TranslationGroupID)
	assert.Equal(t, http.StatusOK, groupRes.Code)

	var groupPosts []models.PostResponse
	_ = json.Unmarshal(groupRes.Body.Bytes(), &groupPosts)
	assert.Len(t, groupPosts, 2)
}

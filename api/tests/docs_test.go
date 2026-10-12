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

func TestDocs_Lifecycle(t *testing.T) {
	app := testutils.NewTestApp(t)

	admin := app.CreateUser("Admin", "admin@spile.io", "Pass12345", models.RoleAdmin)
	token := app.CreateSession(admin.ID)

	// 1. Create a documentation project
	projPayload := map[string]string{
		"title":       "API Guide & SDK",
		"description": "Complete documentation for developers",
	}
	createRes := app.Client().WithToken(token).PostJSON("/api/v1/docs/projects", projPayload)
	assert.Equal(t, http.StatusCreated, createRes.Code)

	var projResp struct {
		Project     models.DocProjectResponse `json:"project"`
		InitialPage models.DocPageResponse    `json:"initialPage"`
	}
	err := json.Unmarshal(createRes.Body.Bytes(), &projResp)
	require.NoError(t, err)

	assert.NotEmpty(t, projResp.Project.ID)
	assert.Equal(t, "API Guide & SDK", projResp.Project.Title)
	assert.Equal(t, 1, projResp.Project.PagesCount)
	assert.Len(t, projResp.Project.Navigation.Items, 1)

	// 2. Create child page under initial page
	parentID := projResp.InitialPage.ID
	childPayload := map[string]any{
		"projectId": projResp.Project.ID,
		"parentId":  parentID,
		"title":     "Authentication Overview",
		"slug":      "auth-overview",
		"content": map[string]any{
			"blocks": []any{
				map[string]any{"type": "paragraph", "data": map[string]any{"text": "Bearer token guide"}},
			},
		},
	}
	childRes := app.Client().WithToken(token).PostJSON("/api/v1/docs/pages", childPayload)
	assert.Equal(t, http.StatusCreated, childRes.Code)

	var childPage models.DocPageResponse
	_ = json.Unmarshal(childRes.Body.Bytes(), &childPage)
	assert.NotEmpty(t, childPage.ID)
	assert.Equal(t, &parentID, childPage.ParentID)

	// 3. Fetch project and verify nested tree
	getProjRes := app.Client().WithToken(token).Get("/api/v1/docs/projects/" + projResp.Project.ID)
	assert.Equal(t, http.StatusOK, getProjRes.Code)

	var fetchedProj models.DocProjectResponse
	_ = json.Unmarshal(getProjRes.Body.Bytes(), &fetchedProj)
	assert.Equal(t, 2, fetchedProj.PagesCount)
	require.Len(t, fetchedProj.Navigation.Items, 1)
	assert.Len(t, fetchedProj.Navigation.Items[0].Children, 1)
	assert.Equal(t, childPage.ID, fetchedProj.Navigation.Items[0].Children[0].ID)

	// 4. Update child page
	updatePayload := map[string]any{
		"title": "Authentication Deep Dive",
	}
	upPageRes := app.Client().WithToken(token).PutJSON("/api/v1/docs/pages/"+childPage.ID, updatePayload)
	assert.Equal(t, http.StatusOK, upPageRes.Code)

	// 5. Check navigation for Spanish (es) before translation exists -> HasTranslation should be false
	navEsBeforeRes := app.Client().WithToken(token).Get("/api/v1/docs/projects/" + projResp.Project.ID + "/navigation?locale=es")
	assert.Equal(t, http.StatusOK, navEsBeforeRes.Code)
	var navEsBefore models.DocNavigationManifest
	require.NoError(t, json.Unmarshal(navEsBeforeRes.Body.Bytes(), &navEsBefore))
	require.Len(t, navEsBefore.Items, 1)
	assert.False(t, navEsBefore.Items[0].HasTranslation)
	assert.Equal(t, projResp.InitialPage.ID, navEsBefore.Items[0].ID)

	// 6. Create Spanish translation for initial page
	transPayload := map[string]any{
		"locale":      "es",
		"title":       "Introducción",
		"copyContent": true,
	}
	transRes := app.Client().WithToken(token).PostJSON("/api/v1/docs/pages/"+projResp.InitialPage.ID+"/translations", transPayload)
	assert.Equal(t, http.StatusCreated, transRes.Code)
	var translatedPage models.DocPageResponse
	require.NoError(t, json.Unmarshal(transRes.Body.Bytes(), &translatedPage))
	assert.NotEqual(t, projResp.InitialPage.ID, translatedPage.ID)
	assert.Equal(t, "es", translatedPage.Locale)
	assert.Equal(t, projResp.InitialPage.ID, translatedPage.TranslationGroupID)

	// 7. Check navigation for Spanish (es) after translation exists -> root hydrated with translated doc, child still untranslated
	navEsAfterRes := app.Client().WithToken(token).Get("/api/v1/docs/projects/" + projResp.Project.ID + "/navigation?locale=es")
	assert.Equal(t, http.StatusOK, navEsAfterRes.Code)
	var navEsAfter models.DocNavigationManifest
	require.NoError(t, json.Unmarshal(navEsAfterRes.Body.Bytes(), &navEsAfter))
	require.Len(t, navEsAfter.Items, 1)
	assert.True(t, navEsAfter.Items[0].HasTranslation)
	assert.Equal(t, projResp.InitialPage.ID, navEsAfter.Items[0].ID)
	assert.Equal(t, translatedPage.ID, navEsAfter.Items[0].LocalizedDocID)
	assert.Equal(t, "Introducción", navEsAfter.Items[0].Title)
	require.Len(t, navEsAfter.Items[0].Children, 1)
	assert.False(t, navEsAfter.Items[0].Children[0].HasTranslation)

	// 8. Delete page and project
	delPageRes := app.Client().WithToken(token).Delete("/api/v1/docs/pages/" + childPage.ID)
	assert.Equal(t, http.StatusOK, delPageRes.Code)

	delProjRes := app.Client().WithToken(token).Delete("/api/v1/docs/projects/" + projResp.Project.ID)
	assert.Equal(t, http.StatusOK, delProjRes.Code)
}

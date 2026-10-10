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

func TestEditorialReviewsAndSettings(t *testing.T) {
	app := testutils.NewTestApp(t)

	admin := app.CreateUser("Admin", "admin@spile.io", "Pass12345", models.RoleAdmin)
	author := app.CreateUser("Author", "author@spile.io", "Pass12345", models.RoleAuthor)

	adminToken := app.CreateSession(admin.ID)
	authorToken := app.CreateSession(author.ID)

	// 1. Author creates a content revision
	revPayload := map[string]any{
		"targetType": "post",
		"targetId":   "post-xyz",
		"title":      "Drafting Article v1",
		"summary":    "Initial revision draft",
		"content":    map[string]any{"blocks": []any{}},
	}
	revRes := app.Client().WithToken(authorToken).PostJSON("/api/v1/reviews/revisions", revPayload)
	assert.Equal(t, http.StatusCreated, revRes.Code)

	var rev models.RevisionResponse
	err := json.Unmarshal(revRes.Body.Bytes(), &rev)
	require.NoError(t, err)
	assert.Equal(t, "v1.0", rev.VersionLabel)

	// 2. Author submits review request
	reqPayload := map[string]any{
		"targetType":  "post",
		"targetId":    "post-xyz",
		"targetTitle": "Drafting Article v1",
		"revisionId":  rev.ID,
		"summary":     "Please review and approve",
	}
	submitRes := app.Client().WithToken(authorToken).PostJSON("/api/v1/reviews/requests", reqPayload)
	assert.Equal(t, http.StatusCreated, submitRes.Code)

	var reviewReq models.ReviewRequest
	_ = json.Unmarshal(submitRes.Body.Bytes(), &reviewReq)
	assert.Equal(t, models.ReviewStatusInReview, reviewReq.Status)

	// 3. Admin approves review request
	approveRes := app.Client().WithToken(adminToken).PutJSON("/api/v1/reviews/requests/"+reviewReq.ID, map[string]any{
		"status":      "approved",
		"reviewNotes": "Looks great, ready to publish!",
	})
	assert.Equal(t, http.StatusOK, approveRes.Code)

	// 4. Verify Author has notification
	notifRes := app.Client().WithToken(authorToken).Get("/api/v1/notifications")
	assert.Equal(t, http.StatusOK, notifRes.Code)
	var notifs []models.Notification
	_ = json.Unmarshal(notifRes.Body.Bytes(), &notifs)
	assert.NotEmpty(t, notifs)

	// 5. Test Settings & Overview
	overviewRes := app.Client().WithToken(adminToken).Get("/api/v1/overview/stats")
	assert.Equal(t, http.StatusOK, overviewRes.Code)

	// 6. Test API Keys
	keyRes := app.Client().WithToken(adminToken).PostJSON("/api/v1/settings/api-keys", map[string]string{
		"name": "Frontend Token",
		"type": "public_read",
	})
	assert.Equal(t, http.StatusCreated, keyRes.Code)

	var keyData map[string]any
	_ = json.Unmarshal(keyRes.Body.Bytes(), &keyData)
	assert.NotEmpty(t, keyData["key"])

	// 7. Test Webhooks
	whRes := app.Client().WithToken(adminToken).PostJSON("/api/v1/settings/webhooks", map[string]any{
		"name":   "Deploy Hook",
		"url":    "https://example.com/deploy",
		"events": []string{"post.published"},
	})
	assert.Equal(t, http.StatusCreated, whRes.Code)
}

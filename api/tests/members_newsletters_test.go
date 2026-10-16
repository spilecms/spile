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

func TestMembersAndNewsletters_Workflow(t *testing.T) {
	app := testutils.NewTestApp(t)

	admin := app.CreateUser("Admin", "admin@spile.io", "Pass12345", models.RoleAdmin)
	token := app.CreateSession(admin.ID)

	// 1. Create 2 active members
	m1Res := app.Client().WithToken(token).PostJSON("/api/v1/members", map[string]string{
		"email": "reader1@example.com",
		"name":  "Reader One",
	})
	assert.Equal(t, http.StatusCreated, m1Res.Code)

	m2Res := app.Client().WithToken(token).PostJSON("/api/v1/members", map[string]string{
		"email": "reader2@example.com",
		"name":  "Reader Two",
	})
	assert.Equal(t, http.StatusCreated, m2Res.Code)

	// 2. Query members
	listMemRes := app.Client().WithToken(token).Get("/api/v1/members?status=active")
	assert.Equal(t, http.StatusOK, listMemRes.Code)
	var members []models.MemberResponse
	err := json.Unmarshal(listMemRes.Body.Bytes(), &members)
	require.NoError(t, err)
	assert.Len(t, members, 2)

	// 3. Create Newsletter Draft
	nlPayload := map[string]any{
		"title":       "Weekly Roundup #1",
		"subject":     "Top stories this week",
		"previewText": "Check out our newest articles",
		"content": map[string]any{
			"blocks": []any{
				map[string]any{"type": "paragraph", "data": map[string]any{"text": "Welcome subscribers!"}},
			},
		},
	}
	createNlRes := app.Client().WithToken(token).PostJSON("/api/v1/newsletters", nlPayload)
	assert.Equal(t, http.StatusCreated, createNlRes.Code)

	var nl models.NewsletterResponse
	err = json.Unmarshal(createNlRes.Body.Bytes(), &nl)
	require.NoError(t, err)
	assert.Equal(t, models.NewsletterStatusDraft, nl.Status)

	// 4. Send test email
	testSendRes := app.Client().WithToken(token).PostJSON("/api/v1/newsletters/"+nl.ID+"/test", map[string]string{
		"email": "editor@spile.io",
	})
	assert.Equal(t, http.StatusOK, testSendRes.Code)

	// 5. Duplicate campaign
	dupRes := app.Client().WithToken(token).PostJSON("/api/v1/newsletters/"+nl.ID+"/duplicate", nil)
	assert.Equal(t, http.StatusCreated, dupRes.Code)

	// 6. Broadcast / Send newsletter
	sendRes := app.Client().WithToken(token).PostJSON("/api/v1/newsletters/"+nl.ID+"/send", nil)
	assert.Equal(t, http.StatusOK, sendRes.Code)

	var sentNl models.NewsletterResponse
	_ = json.Unmarshal(sendRes.Body.Bytes(), &sentNl)
	assert.Equal(t, models.NewsletterStatusSent, sentNl.Status)
	assert.Equal(t, 2, sentNl.RecipientsCount)
	assert.NotNil(t, sentNl.SentAt)
}

func TestNewsletter_UnconfiguredEmailServiceRejection(t *testing.T) {
	app := testutils.NewTestApp(t)

	admin := app.CreateUser("Admin", "admin@spile.io", "Pass12345", models.RoleAdmin)
	token := app.CreateSession(admin.ID)

	// Set unconfigured email setting (resend with empty apiKey)
	app.DB.Model(&models.SystemSetting{}).Where("key = ?", "email").Updates(map[string]any{
		"value_json": `{"provider":"resend","apiKey":"","fromEmail":"newsletter@spile.io"}`,
	})

	// Create draft newsletter
	createRes := app.Client().WithToken(token).PostJSON("/api/v1/newsletters", map[string]any{
		"title":   "Draft Campaign",
		"subject": "Important Announcement",
	})
	assert.Equal(t, http.StatusCreated, createRes.Code)

	var nl models.NewsletterResponse
	_ = json.Unmarshal(createRes.Body.Bytes(), &nl)

	// Attempting to send broadcast without configured email provider MUST fail
	sendRes := app.Client().WithToken(token).PostJSON("/api/v1/newsletters/"+nl.ID+"/send", nil)
	assert.Equal(t, http.StatusBadRequest, sendRes.Code)

	var errBody map[string]string
	_ = json.Unmarshal(sendRes.Body.Bytes(), &errBody)
	assert.Contains(t, errBody["error"], "Cannot start campaign")
	assert.Contains(t, errBody["error"], "Resend API key is not configured")

	// Attempting to send test email MUST also fail
	testRes := app.Client().WithToken(token).PostJSON("/api/v1/newsletters/"+nl.ID+"/test", map[string]string{
		"email": "test@example.com",
	})
	assert.Equal(t, http.StatusBadRequest, testRes.Code)
}


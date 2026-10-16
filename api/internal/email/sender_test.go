package email_test

import (
	"testing"

	"github.com/spilecms/spile/api/internal/email"
	"github.com/spilecms/spile/api/internal/models"
	"github.com/spilecms/spile/api/internal/testutils"
	"github.com/stretchr/testify/assert"
)

func TestEmail_IsConfiguredValidation(t *testing.T) {
	app := testutils.NewTestApp(t)

	// 1. Resend without API Key is not configured
	app.DB.Model(&models.SystemSetting{}).Where("key = ?", "email").Updates(map[string]any{
		"value_json": `{"provider":"resend","apiKey":"","fromEmail":"team@spile.io"}`,
	})
	configured, reason := email.IsConfigured(app.DB)
	assert.False(t, configured)
	assert.Contains(t, reason, "Resend API key is not configured")

	// 2. Postmark with Token is configured
	app.DB.Model(&models.SystemSetting{}).Where("key = ?", "email").Updates(map[string]any{
		"value_json": `{"provider":"postmark","apiKey":"postmark-server-token-123","fromEmail":"team@spile.io"}`,
	})
	configured, reason = email.IsConfigured(app.DB)
	assert.True(t, configured)
	assert.Empty(t, reason)

	// 3. Postmark without Token is not configured
	app.DB.Model(&models.SystemSetting{}).Where("key = ?", "email").Updates(map[string]any{
		"value_json": `{"provider":"postmark","apiKey":"","fromEmail":"team@spile.io"}`,
	})
	configured, reason = email.IsConfigured(app.DB)
	assert.False(t, configured)
	assert.Contains(t, reason, "Postmark server token is not configured")

	// 4. Amazon SES without credentials or SMTP host is not configured
	app.DB.Model(&models.SystemSetting{}).Where("key = ?", "email").Updates(map[string]any{
		"value_json": `{"provider":"ses","apiKey":"","smtpHost":"","fromEmail":"team@spile.io"}`,
	})
	configured, reason = email.IsConfigured(app.DB)
	assert.False(t, configured)
	assert.Contains(t, reason, "Amazon SES")

	// 5. Amazon SES with API key is configured
	app.DB.Model(&models.SystemSetting{}).Where("key = ?", "email").Updates(map[string]any{
		"value_json": `{"provider":"ses","apiKey":"AKIAIOSFODNN7EXAMPLE:wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY","fromEmail":"team@spile.io"}`,
	})
	configured, reason = email.IsConfigured(app.DB)
	assert.True(t, configured)
	assert.Empty(t, reason)

	// 6. SMTP with host is configured
	app.DB.Model(&models.SystemSetting{}).Where("key = ?", "email").Updates(map[string]any{
		"value_json": `{"provider":"smtp","smtpHost":"smtp.example.com","smtpPort":587,"fromEmail":"team@spile.io"}`,
	})
	configured, reason = email.IsConfigured(app.DB)
	assert.True(t, configured)
	assert.Empty(t, reason)
}

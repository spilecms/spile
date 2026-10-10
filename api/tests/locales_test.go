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

func TestLocales_Lifecycle(t *testing.T) {
	app := testutils.NewTestApp(t)

	admin := app.CreateUser("Admin", "admin@spile.io", "Pass12345", models.RoleAdmin)
	token := app.CreateSession(admin.ID)

	// 1. Initial list should contain default "en"
	res := app.Client().WithToken(token).Get("/api/v1/locales")
	assert.Equal(t, http.StatusOK, res.Code)

	var locales []models.WorkspaceLocale
	err := json.Unmarshal(res.Body.Bytes(), &locales)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(locales), 1)
	assert.Equal(t, "en", locales[0].Code)
	assert.True(t, locales[0].IsDefault)

	// 2. Add Spanish
	newLocale := map[string]any{
		"code":      "es",
		"name":      "Spanish",
		"flag":      "🇪🇸",
		"direction": "ltr",
	}
	addRes := app.Client().WithToken(token).PostJSON("/api/v1/locales", newLocale)
	assert.Equal(t, http.StatusCreated, addRes.Code)

	// 3. Set Spanish as default
	defRes := app.Client().WithToken(token).PutJSON("/api/v1/locales/es/default", nil)
	assert.Equal(t, http.StatusOK, defRes.Code)

	var updatedEs models.WorkspaceLocale
	_ = json.Unmarshal(defRes.Body.Bytes(), &updatedEs)
	assert.True(t, updatedEs.IsDefault)

	// 4. Try deleting the default locale (should fail)
	delDefRes := app.Client().WithToken(token).Delete("/api/v1/locales/es")
	assert.Equal(t, http.StatusBadRequest, delDefRes.Code)

	// 5. Delete non-default "en" locale
	delEnRes := app.Client().WithToken(token).Delete("/api/v1/locales/en")
	assert.Equal(t, http.StatusOK, delEnRes.Code)
}

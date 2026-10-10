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

type AuthResponse struct {
	User  models.UserResponse `json:"user"`
	Token string              `json:"token"`
	Error string              `json:"error"`
}

func TestRegister_Success(t *testing.T) {
	app := testutils.NewTestApp(t)

	payload := map[string]string{
		"name":     "Initial Owner",
		"email":    "owner@spile.io",
		"password": "SuperSecretPassword123",
	}

	res := app.Client().PostJSON("/api/v1/auth/register", payload)
	assert.Equal(t, http.StatusCreated, res.Code)

	var authResp AuthResponse
	err := json.Unmarshal(res.Body.Bytes(), &authResp)
	require.NoError(t, err)

	assert.NotEmpty(t, authResp.User.ID)
	assert.Equal(t, "Initial Owner", authResp.User.Name)
	assert.Equal(t, "owner@spile.io", authResp.User.Email)
	assert.Equal(t, models.RoleOwner, authResp.User.Role) // First user must be owner
	assert.NotEmpty(t, authResp.Token)

	// Verify session cookie was set
	cookies := res.Result().Cookies()
	var foundSessionCookie bool
	for _, c := range cookies {
		if c.Name == "spile_session" && c.Value != "" {
			foundSessionCookie = true
			assert.True(t, c.HttpOnly)
		}
	}
	assert.True(t, foundSessionCookie, "spile_session cookie should be set")
}

func TestRegister_ValidationFailures(t *testing.T) {
	app := testutils.NewTestApp(t)

	// Short password
	shortPass := map[string]string{
		"name":     "Test User",
		"email":    "test@spile.io",
		"password": "short",
	}
	res := app.Client().PostJSON("/api/v1/auth/register", shortPass)
	assert.Equal(t, http.StatusBadRequest, res.Code)

	// Invalid email
	invalidEmail := map[string]string{
		"name":     "Test User",
		"email":    "not-an-email",
		"password": "ValidPassword123",
	}
	res = app.Client().PostJSON("/api/v1/auth/register", invalidEmail)
	assert.Equal(t, http.StatusBadRequest, res.Code)

	// Duplicate email
	app.CreateUser("Existing User", "existing@spile.io", "Password123", models.RoleAuthor)
	dupPayload := map[string]string{
		"name":     "Duplicate Attempt",
		"email":    "existing@spile.io",
		"password": "Password12345",
	}
	res = app.Client().PostJSON("/api/v1/auth/register", dupPayload)
	assert.Equal(t, http.StatusConflict, res.Code)
}

func TestRegister_SecondUserBecomesAuthor(t *testing.T) {
	app := testutils.NewTestApp(t)

	// Create owner first
	app.CreateUser("Owner", "owner@spile.io", "Password123", models.RoleOwner)

	// Register second user
	payload := map[string]string{
		"name":     "Staff Writer",
		"email":    "writer@spile.io",
		"password": "WriterPassword123",
	}

	res := app.Client().PostJSON("/api/v1/auth/register", payload)
	assert.Equal(t, http.StatusCreated, res.Code)

	var authResp AuthResponse
	err := json.Unmarshal(res.Body.Bytes(), &authResp)
	require.NoError(t, err)

	assert.Equal(t, models.RoleAuthor, authResp.User.Role)
}

func TestLogin_SuccessAndFailure(t *testing.T) {
	app := testutils.NewTestApp(t)

	app.CreateUser("Alice Author", "alice@spile.io", "SecretPass123", models.RoleAuthor)

	// Successful login
	validLogin := map[string]string{
		"email":    "alice@spile.io",
		"password": "SecretPass123",
	}
	res := app.Client().PostJSON("/api/v1/auth/login", validLogin)
	assert.Equal(t, http.StatusOK, res.Code)

	var authResp AuthResponse
	err := json.Unmarshal(res.Body.Bytes(), &authResp)
	require.NoError(t, err)
	assert.Equal(t, "alice@spile.io", authResp.User.Email)
	assert.NotEmpty(t, authResp.Token)

	// Wrong password
	wrongPass := map[string]string{
		"email":    "alice@spile.io",
		"password": "WrongPassword!",
	}
	res = app.Client().PostJSON("/api/v1/auth/login", wrongPass)
	assert.Equal(t, http.StatusUnauthorized, res.Code)

	// Non-existent email
	wrongEmail := map[string]string{
		"email":    "nonexistent@spile.io",
		"password": "SecretPass123",
	}
	res = app.Client().PostJSON("/api/v1/auth/login", wrongEmail)
	assert.Equal(t, http.StatusUnauthorized, res.Code)
}

func TestAuthMe_Endpoints(t *testing.T) {
	app := testutils.NewTestApp(t)

	user := app.CreateUser("Bob Editor", "bob@spile.io", "Pass12345", models.RoleEditor)
	token := app.CreateSession(user.ID)

	// Authenticated request
	res := app.Client().WithToken(token).Get("/api/v1/auth/me")
	assert.Equal(t, http.StatusOK, res.Code)

	var meResp struct {
		User models.UserResponse `json:"user"`
	}
	err := json.Unmarshal(res.Body.Bytes(), &meResp)
	require.NoError(t, err)
	assert.Equal(t, user.ID, meResp.User.ID)
	assert.Equal(t, "bob@spile.io", meResp.User.Email)
	assert.Equal(t, models.RoleEditor, meResp.User.Role)

	// Unauthenticated request
	unauthRes := app.Client().Get("/api/v1/auth/me")
	assert.Equal(t, http.StatusUnauthorized, unauthRes.Code)
}

func TestLogout(t *testing.T) {
	app := testutils.NewTestApp(t)

	user := app.CreateUser("Charlie", "charlie@spile.io", "Pass12345", models.RoleAuthor)
	token := app.CreateSession(user.ID)

	// Logout
	logoutRes := app.Client().WithToken(token).PostJSON("/api/v1/auth/logout", nil)
	assert.Equal(t, http.StatusOK, logoutRes.Code)

	// Calling /me with that token should now fail
	meRes := app.Client().WithToken(token).Get("/api/v1/auth/me")
	assert.Equal(t, http.StatusUnauthorized, meRes.Code)
}

func TestRBAC_PermissionsMatrix(t *testing.T) {
	app := testutils.NewTestApp(t)

	owner := app.CreateUser("The Owner", "owner@spile.io", "Pass12345", models.RoleOwner)
	admin := app.CreateUser("The Admin", "admin@spile.io", "Pass12345", models.RoleAdmin)
	author := app.CreateUser("The Author", "author@spile.io", "Pass12345", models.RoleAuthor)
	contributor := app.CreateUser("The Contributor", "contributor@spile.io", "Pass12345", models.RoleContributor)

	ownerToken := app.CreateSession(owner.ID)
	adminToken := app.CreateSession(admin.ID)
	authorToken := app.CreateSession(author.ID)
	contributorToken := app.CreateSession(contributor.ID)

	// Owner can access admin route
	assert.Equal(t, http.StatusOK, app.Client().WithToken(ownerToken).Get("/api/v1/admin/dashboard").Code)

	// Admin can access admin route
	assert.Equal(t, http.StatusOK, app.Client().WithToken(adminToken).Get("/api/v1/admin/dashboard").Code)

	// Author cannot access admin route -> 403 Forbidden
	assert.Equal(t, http.StatusForbidden, app.Client().WithToken(authorToken).Get("/api/v1/admin/dashboard").Code)

	// Contributor cannot access admin route -> 403 Forbidden
	assert.Equal(t, http.StatusForbidden, app.Client().WithToken(contributorToken).Get("/api/v1/admin/dashboard").Code)

	// Unauthenticated cannot access admin route -> 401 Unauthorized
	assert.Equal(t, http.StatusUnauthorized, app.Client().Get("/api/v1/admin/dashboard").Code)
}

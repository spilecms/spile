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

func TestUsers_List(t *testing.T) {
	app := testutils.NewTestApp(t)

	owner := app.CreateUser("Owner", "owner@spile.io", "Pass12345", models.RoleOwner)
	_ = app.CreateUser("Editor", "editor@spile.io", "Pass12345", models.RoleEditor)
	token := app.CreateSession(owner.ID)

	// Authenticated request
	res := app.Client().WithToken(token).Get("/api/v1/users")
	assert.Equal(t, http.StatusOK, res.Code)

	var users []models.UserResponse
	err := json.Unmarshal(res.Body.Bytes(), &users)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(users), 2)

	// Unauthenticated request should fail
	unauthRes := app.Client().Get("/api/v1/users")
	assert.Equal(t, http.StatusUnauthorized, unauthRes.Code)
}

func TestUsers_Invite(t *testing.T) {
	app := testutils.NewTestApp(t)

	admin := app.CreateUser("Admin", "admin@spile.io", "Pass12345", models.RoleAdmin)
	author := app.CreateUser("Author", "author@spile.io", "Pass12345", models.RoleAuthor)

	adminToken := app.CreateSession(admin.ID)
	authorToken := app.CreateSession(author.ID)

	// 1. Admin invites new member
	invitePayload := map[string]string{
		"email": "newbie@spile.io",
		"role":  "editor",
	}
	res := app.Client().WithToken(adminToken).PostJSON("/api/v1/users/invite", invitePayload)
	assert.Equal(t, http.StatusCreated, res.Code)

	var newUser models.UserResponse
	err := json.Unmarshal(res.Body.Bytes(), &newUser)
	require.NoError(t, err)
	assert.Equal(t, "newbie@spile.io", newUser.Email)
	assert.Equal(t, models.RoleEditor, newUser.Role)

	// 2. Author tries to invite -> 403 Forbidden
	failRes := app.Client().WithToken(authorToken).PostJSON("/api/v1/users/invite", map[string]string{
		"email": "another@spile.io",
		"role":  "author",
	})
	assert.Equal(t, http.StatusForbidden, failRes.Code)

	// 3. Duplicate invite -> 409 Conflict
	dupRes := app.Client().WithToken(adminToken).PostJSON("/api/v1/users/invite", invitePayload)
	assert.Equal(t, http.StatusConflict, dupRes.Code)
}

func TestUsers_UpdateRole(t *testing.T) {
	app := testutils.NewTestApp(t)

	owner := app.CreateUser("Owner", "owner@spile.io", "Pass12345", models.RoleOwner)
	admin := app.CreateUser("Admin", "admin@spile.io", "Pass12345", models.RoleAdmin)
	author := app.CreateUser("Author", "author@spile.io", "Pass12345", models.RoleAuthor)

	adminToken := app.CreateSession(admin.ID)
	authorToken := app.CreateSession(author.ID)

	// 1. Admin upgrades author to editor
	res := app.Client().WithToken(adminToken).PutJSON("/api/v1/users/"+author.ID+"/role", map[string]string{
		"role": "editor",
	})
	assert.Equal(t, http.StatusOK, res.Code)

	var updatedUser models.UserResponse
	err := json.Unmarshal(res.Body.Bytes(), &updatedUser)
	require.NoError(t, err)
	assert.Equal(t, models.RoleEditor, updatedUser.Role)

	// 2. Admin cannot change owner's role -> 403 Forbidden
	ownerRoleRes := app.Client().WithToken(adminToken).PutJSON("/api/v1/users/"+owner.ID+"/role", map[string]string{
		"role": "editor",
	})
	assert.Equal(t, http.StatusForbidden, ownerRoleRes.Code)

	// 3. Author cannot change anyone's role -> 403 Forbidden
	authorAttempt := app.Client().WithToken(authorToken).PutJSON("/api/v1/users/"+admin.ID+"/role", map[string]string{
		"role": "author",
	})
	assert.Equal(t, http.StatusForbidden, authorAttempt.Code)
}

func TestUsers_DeleteUser(t *testing.T) {
	app := testutils.NewTestApp(t)

	owner := app.CreateUser("Owner", "owner@spile.io", "Pass12345", models.RoleOwner)
	admin := app.CreateUser("Admin", "admin@spile.io", "Pass12345", models.RoleAdmin)
	author := app.CreateUser("Author", "author@spile.io", "Pass12345", models.RoleAuthor)

	adminToken := app.CreateSession(admin.ID)

	// 1. Admin cannot delete owner
	delOwnerRes := app.Client().WithToken(adminToken).Delete("/api/v1/users/" + owner.ID)
	assert.Equal(t, http.StatusForbidden, delOwnerRes.Code)

	// 2. Admin cannot delete self
	delSelfRes := app.Client().WithToken(adminToken).Delete("/api/v1/users/" + admin.ID)
	assert.Equal(t, http.StatusBadRequest, delSelfRes.Code)

	// 3. Admin deletes author successfully
	delAuthorRes := app.Client().WithToken(adminToken).Delete("/api/v1/users/" + author.ID)
	assert.Equal(t, http.StatusOK, delAuthorRes.Code)

	// Verify author is gone
	var count int64
	app.DB.Model(&models.User{}).Where("id = ?", author.ID).Count(&count)
	assert.Equal(t, int64(0), count)
}

func TestUsers_UpdateProfile(t *testing.T) {
	app := testutils.NewTestApp(t)

	author := app.CreateUser("Old Name", "author@spile.io", "Pass12345", models.RoleAuthor)
	token := app.CreateSession(author.ID)

	res := app.Client().WithToken(token).PutJSON("/api/v1/users/profile", map[string]string{
		"name":   "New Name",
		"avatar": "https://example.com/avatar.jpg",
	})
	assert.Equal(t, http.StatusOK, res.Code)

	var user models.UserResponse
	err := json.Unmarshal(res.Body.Bytes(), &user)
	require.NoError(t, err)
	assert.Equal(t, "New Name", user.Name)
	assert.Equal(t, "https://example.com/avatar.jpg", user.Avatar)
}

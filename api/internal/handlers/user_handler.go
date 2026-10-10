package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"net/mail"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/spilecms/spile/api/internal/auth"
	"github.com/spilecms/spile/api/internal/models"
	"gorm.io/gorm"
)

type UserHandler struct {
	db *gorm.DB
}

func NewUserHandler(db *gorm.DB) *UserHandler {
	return &UserHandler{db: db}
}

type InviteUserRequest struct {
	Email string          `json:"email" binding:"required"`
	Role  models.UserRole `json:"role" binding:"required"`
	Name  string          `json:"name"`
}

type UpdateRoleRequest struct {
	Role models.UserRole `json:"role" binding:"required"`
}

type UpdateProfileRequest struct {
	Name     string `json:"name"`
	Avatar   string `json:"avatar"`
	Password string `json:"password"`
}

// List returns all registered workspace users
func (h *UserHandler) List(c *gin.Context) {
	var users []models.User
	if err := h.db.Order("created_at asc").Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve users"})
		return
	}

	response := make([]models.UserResponse, len(users))
	for i, u := range users {
		response[i] = u.ToResponse()
	}

	c.JSON(http.StatusOK, response)
}

// Invite adds a new colleague with an assigned role
func (h *UserHandler) Invite(c *gin.Context) {
	var req InviteUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	if _, err := mail.ParseAddress(req.Email); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid email address format"})
		return
	}

	if !req.Role.IsValid() {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user role specified"})
		return
	}

	// Check if already registered
	var count int64
	h.db.Model(&models.User{}).Where("email = ?", req.Email).Count(&count)
	if count > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "User with this email already exists"})
		return
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		parts := strings.Split(req.Email, "@")
		name = parts[0]
	}

	// Generate a temporary random password
	randBytes := make([]byte, 16)
	_, _ = rand.Read(randBytes)
	initialPassword := hex.EncodeToString(randBytes)

	hash, err := auth.HashPassword(initialPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	user := models.User{
		Name:         name,
		Email:        req.Email,
		PasswordHash: hash,
		Role:         req.Role,
	}

	if err := h.db.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	c.JSON(http.StatusCreated, user.ToResponse())
}

// UpdateRole modifies the role of a specified user
func (h *UserHandler) UpdateRole(c *gin.Context) {
	targetID := c.Param("id")
	var req UpdateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	if !req.Role.IsValid() {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user role specified"})
		return
	}

	currentUser, ok := auth.GetCurrentUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	var targetUser models.User
	if err := h.db.First(&targetUser, "id = ?", targetID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Only owner can change owner's role or promote someone to owner
	if targetUser.Role == models.RoleOwner && currentUser.Role != models.RoleOwner {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot change the workspace owner's role"})
		return
	}
	if req.Role == models.RoleOwner && currentUser.Role != models.RoleOwner {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only the workspace owner can transfer ownership"})
		return
	}

	targetUser.Role = req.Role
	if err := h.db.Save(&targetUser).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user role"})
		return
	}

	c.JSON(http.StatusOK, targetUser.ToResponse())
}

// Delete removes a team member
func (h *UserHandler) Delete(c *gin.Context) {
	targetID := c.Param("id")
	currentUser, ok := auth.GetCurrentUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	if currentUser.ID == targetID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "You cannot delete your own account"})
		return
	}

	var targetUser models.User
	if err := h.db.First(&targetUser, "id = ?", targetID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if targetUser.Role == models.RoleOwner {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot delete workspace owner"})
		return
	}

	// Delete user sessions first, then user
	_ = h.db.Where("user_id = ?", targetID).Delete(&models.Session{}).Error
	if err := h.db.Delete(&targetUser).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User deleted successfully"})
}

// UpdateProfile allows authenticated users to update their own profile info
func (h *UserHandler) UpdateProfile(c *gin.Context) {
	currentUser, ok := auth.GetCurrentUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if strings.TrimSpace(req.Name) != "" {
		currentUser.Name = strings.TrimSpace(req.Name)
	}
	if req.Avatar != "" {
		currentUser.Avatar = req.Avatar
	}
	if req.Password != "" {
		if len(req.Password) < 8 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Password must be at least 8 characters long"})
			return
		}
		hash, err := auth.HashPassword(req.Password)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
			return
		}
		currentUser.PasswordHash = hash
	}

	if err := h.db.Save(currentUser).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
		return
	}

	c.JSON(http.StatusOK, currentUser.ToResponse())
}

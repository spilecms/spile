package handlers

import (
	"net/http"
	"net/mail"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/spilecms/spile/api/internal/auth"
	"github.com/spilecms/spile/api/internal/models"
	"gorm.io/gorm"
)

type AuthHandler struct {
	db *gorm.DB
}

func NewAuthHandler(db *gorm.DB) *AuthHandler {
	return &AuthHandler{db: db}
}

type RegisterRequest struct {
	Name     string          `json:"name" binding:"required"`
	Email    string          `json:"email" binding:"required"`
	Password string          `json:"password" binding:"required"`
	Role     models.UserRole `json:"role"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	if _, err := mail.ParseAddress(req.Email); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid email address format"})
		return
	}

	if len(req.Password) < 8 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password must be at least 8 characters long"})
		return
	}

	// Check if user already exists
	var count int64
	h.db.Model(&models.User{}).Where("email = ?", req.Email).Count(&count)
	if count > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Email is already registered"})
		return
	}

	// First user becomes owner, else author or requested valid role
	var totalUsers int64
	h.db.Model(&models.User{}).Count(&totalUsers)

	role := models.RoleAuthor
	if totalUsers == 0 {
		role = models.RoleOwner
	} else if req.Role.IsValid() {
		role = req.Role
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	user := models.User{
		Name:         strings.TrimSpace(req.Name),
		Email:        req.Email,
		PasswordHash: hash,
		Role:         role,
	}

	if err := h.db.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	// Create session
	session, err := auth.CreateSession(h.db, user.ID, c.ClientIP(), c.Request.UserAgent(), 0)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create session"})
		return
	}

	// Set session cookie
	c.SetCookie(
		auth.SessionCookieName,
		session.Token,
		int(auth.DefaultSessionDuration.Seconds()),
		"/",
		"",
		false, // secure (can be configured)
		true,  // httpOnly
	)

	c.JSON(http.StatusCreated, gin.H{
		"user":  user.ToResponse(),
		"token": session.Token,
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))

	var user models.User
	if err := h.db.Where("email = ?", req.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	if !auth.CheckPassword(user.PasswordHash, req.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	// Create new session
	session, err := auth.CreateSession(h.db, user.ID, c.ClientIP(), c.Request.UserAgent(), 0)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create session"})
		return
	}

	// Set HTTP-only cookie
	c.SetCookie(
		auth.SessionCookieName,
		session.Token,
		int(auth.DefaultSessionDuration.Seconds()),
		"/",
		"",
		false,
		true,
	)

	c.JSON(http.StatusOK, gin.H{
		"user":  user.ToResponse(),
		"token": session.Token,
	})
}

func (h *AuthHandler) Me(c *gin.Context) {
	user, ok := auth.GetCurrentUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user": user.ToResponse(),
	})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	token := auth.ExtractToken(c)
	if token != "" {
		_ = auth.DeleteSession(h.db, token)
	}

	// Expire cookie
	c.SetCookie(
		auth.SessionCookieName,
		"",
		-1,
		"/",
		"",
		false,
		true,
	)

	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}

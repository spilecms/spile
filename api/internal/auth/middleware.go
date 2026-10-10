package auth

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/spilecms/spile/api/internal/models"
	"gorm.io/gorm"
)

const (
	ContextUserKey    = "currentUser"
	ContextSessionKey = "currentSession"
)

// ExtractToken retrieves the session token from cookies or Bearer header
func ExtractToken(c *gin.Context) string {
	// 1. Try Cookie
	if cookie, err := c.Cookie(SessionCookieName); err == nil && cookie != "" {
		return cookie
	}

	// 2. Try Authorization header
	authHeader := c.GetHeader("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		return strings.TrimPrefix(authHeader, "Bearer ")
	}

	return ""
}

// AuthenticateMiddleware parses and loads user session into context (optional/non-blocking)
func AuthenticateMiddleware(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := ExtractToken(c)
		if token != "" {
			user, session, err := ValidateSession(db, token)
			if err == nil && user != nil {
				c.Set(ContextUserKey, user)
				c.Set(ContextSessionKey, session)
			}
		}
		c.Next()
	}
}

// RequireAuth blocks requests that lack a valid authenticated user
func RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		val, exists := c.Get(ContextUserKey)
		if !exists || val == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			return
		}
		c.Next()
	}
}

// RequireRoles verifies the authenticated user has at least one of the permitted roles
func RequireRoles(allowedRoles ...models.UserRole) gin.HandlerFunc {
	return func(c *gin.Context) {
		val, exists := c.Get(ContextUserKey)
		if !exists || val == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			return
		}

		user, ok := val.(*models.User)
		if !ok {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Invalid user context"})
			return
		}

		// Owner always has access to all role-restricted routes
		if user.Role == models.RoleOwner {
			c.Next()
			return
		}

		for _, role := range allowedRoles {
			if user.Role == role {
				c.Next()
				return
			}
		}

		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "You do not have permission to perform this action"})
	}
}

// GetCurrentUser returns the user from the gin context if present
func GetCurrentUser(c *gin.Context) (*models.User, bool) {
	val, exists := c.Get(ContextUserKey)
	if !exists {
		return nil, false
	}
	user, ok := val.(*models.User)
	return user, ok
}

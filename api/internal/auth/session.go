package auth

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"

	"github.com/spilecms/spile/api/internal/models"
	"gorm.io/gorm"
)

const (
	DefaultSessionDuration = 30 * 24 * time.Hour // 30 days
	SessionCookieName      = "spile_session"
)

// GenerateSessionToken generates a cryptographically secure 32-byte hex token
func GenerateSessionToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// CreateSession generates and persists a new session in the database
func CreateSession(db *gorm.DB, userID, ipAddress, userAgent string, duration time.Duration) (*models.Session, error) {
	token, err := GenerateSessionToken()
	if err != nil {
		return nil, err
	}

	if duration <= 0 {
		duration = DefaultSessionDuration
	}

	session := &models.Session{
		UserID:    userID,
		Token:     token,
		IPAddress: ipAddress,
		UserAgent: userAgent,
		ExpiresAt: time.Now().Add(duration),
	}

	if err := db.Create(session).Error; err != nil {
		return nil, err
	}

	return session, nil
}

// ValidateSession looks up a session by token, verifies expiration, and returns the User
func ValidateSession(db *gorm.DB, token string) (*models.User, *models.Session, error) {
	if token == "" {
		return nil, nil, errors.New("empty session token")
	}

	var session models.Session
	if err := db.Preload("User").Where("token = ?", token).First(&session).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil, errors.New("invalid or expired session")
		}
		return nil, nil, err
	}

	if session.IsExpired() {
		// Clean up expired session
		_ = db.Delete(&session).Error
		return nil, nil, errors.New("session has expired")
	}

	return &session.User, &session, nil
}

// DeleteSession destroys a session by token (logout)
func DeleteSession(db *gorm.DB, token string) error {
	if token == "" {
		return nil
	}
	return db.Where("token = ?", token).Delete(&models.Session{}).Error
}

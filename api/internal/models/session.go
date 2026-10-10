package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Session represents an authenticated active user session
type Session struct {
	ID        string    `gorm:"primaryKey;size:36" json:"id"`
	UserID    string    `gorm:"size:36;not null;index" json:"userId"`
	User      User      `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"user,omitempty"`
	Token     string    `gorm:"size:128;not null;uniqueIndex" json:"token"`
	IPAddress string    `gorm:"size:45" json:"ipAddress"`
	UserAgent string    `gorm:"size:500" json:"userAgent"`
	ExpiresAt time.Time `gorm:"not null;index" json:"expiresAt"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func (s *Session) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.NewString()
	}
	return nil
}

func (s *Session) IsExpired() bool {
	return time.Now().After(s.ExpiresAt)
}

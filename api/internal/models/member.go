package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type MemberStatus string

const (
	MemberStatusActive       MemberStatus = "active"
	MemberStatusUnconfirmed  MemberStatus = "unconfirmed"
	MemberStatusUnsubscribed MemberStatus = "unsubscribed"
	MemberStatusBounced      MemberStatus = "bounced"
)

type Member struct {
	ID           string       `gorm:"primaryKey;size:36" json:"id"`
	Email        string       `gorm:"size:255;not null;uniqueIndex" json:"email"`
	Name         string       `gorm:"size:255" json:"name"`
	Status       MemberStatus `gorm:"size:30;not null;default:'active';index" json:"status"`
	SubscribedAt time.Time    `gorm:"not null" json:"subscribedAt"`
	OpenRate     float64      `gorm:"default:0" json:"openRate"`
	Locale       string       `gorm:"size:10;default:'en'" json:"locale"`
	CreatedAt    time.Time    `json:"createdAt"`
	UpdatedAt    time.Time    `json:"updatedAt"`
}

func (m *Member) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.NewString()
	}
	if m.Status == "" {
		m.Status = MemberStatusActive
	}
	if m.SubscribedAt.IsZero() {
		m.SubscribedAt = time.Now()
	}
	if m.Locale == "" {
		m.Locale = "en"
	}
	return nil
}

type MemberResponse struct {
	ID           string       `json:"id"`
	Email        string       `json:"email"`
	Name         string       `json:"name,omitempty"`
	Status       MemberStatus `json:"status"`
	SubscribedAt int64        `json:"subscribedAt"`
	OpenRate     float64      `json:"openRate"`
	Locale       string       `json:"locale"`
}

func (m *Member) ToResponse() MemberResponse {
	return MemberResponse{
		ID:           m.ID,
		Email:        m.Email,
		Name:         m.Name,
		Status:       m.Status,
		SubscribedAt: m.SubscribedAt.UnixMilli(),
		OpenRate:     m.OpenRate,
		Locale:       m.Locale,
	}
}

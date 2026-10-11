package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type PageView struct {
	ID              string    `gorm:"primaryKey;size:36" json:"id"`
	EntityType      string    `gorm:"size:20;index;not null" json:"entityType"` // "post" or "doc"
	EntityID        string    `gorm:"size:36;index;not null" json:"entityId"`
	VisitorHash     string    `gorm:"size:64;index" json:"visitorHash"`
	CountryCode     string    `gorm:"size:10" json:"countryCode"`
	CountryName     string    `gorm:"size:100" json:"countryName"`
	Referrer        string    `gorm:"size:255" json:"referrer"`
	Device          string    `gorm:"size:30" json:"device"` // "desktop", "mobile", "tablet"
	ReadTimeSeconds int       `gorm:"default:120" json:"readTimeSeconds"`
	Bounced         bool      `gorm:"default:false" json:"bounced"`
	CreatedAt       time.Time `gorm:"index" json:"createdAt"`
}

func (pv *PageView) BeforeCreate(tx *gorm.DB) error {
	if pv.ID == "" {
		pv.ID = uuid.NewString()
	}
	if pv.CreatedAt.IsZero() {
		pv.CreatedAt = time.Now()
	}
	return nil
}

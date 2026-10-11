package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ApiKeyType string

const (
	ApiKeyTypePublicRead ApiKeyType = "public_read"
)

type ApiKey struct {
	ID         string     `gorm:"primaryKey;size:36" json:"id"`
	Name       string     `gorm:"size:255;not null" json:"name"`
	Prefix     string     `gorm:"size:50;not null" json:"prefix"`
	SecretHash string     `gorm:"size:255;not null" json:"-"`
	Type       ApiKeyType `gorm:"size:30;not null" json:"type"`
	LastUsedAt *time.Time `json:"lastUsedAt"`
	CreatedAt  time.Time  `json:"createdAt"`
}

func (k *ApiKey) BeforeCreate(tx *gorm.DB) error {
	if k.ID == "" {
		k.ID = uuid.NewString()
	}
	return nil
}

type Webhook struct {
	ID         string    `gorm:"primaryKey;size:36" json:"id"`
	Name       string    `gorm:"size:255;not null" json:"name"`
	URL        string    `gorm:"size:1000;not null" json:"url"`
	EventsJSON string    `gorm:"type:text;not null" json:"-"`
	Active     bool      `gorm:"default:true" json:"active"`
	CreatedAt  time.Time `json:"createdAt"`
}

func (w *Webhook) BeforeCreate(tx *gorm.DB) error {
	if w.ID == "" {
		w.ID = uuid.NewString()
	}
	return nil
}

type SystemSetting struct {
	Key       string    `gorm:"primaryKey;size:100" json:"key"`
	ValueJSON string    `gorm:"type:text;not null" json:"value"`
	UpdatedAt time.Time `json:"updatedAt"`
}

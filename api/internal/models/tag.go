package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Tag struct {
	ID        string    `gorm:"primaryKey;size:36" json:"id"`
	Name      string    `gorm:"size:100;not null" json:"name"`
	Slug      string    `gorm:"size:120;not null;uniqueIndex" json:"slug"`
	Color     string    `gorm:"size:30;not null;default:'#6366f1'" json:"color"`
	PostCount int       `gorm:"default:0" json:"postCount"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func (t *Tag) BeforeCreate(tx *gorm.DB) error {
	if t.ID == "" {
		t.ID = uuid.NewString()
	}
	if t.Color == "" {
		t.Color = "#6366f1"
	}
	return nil
}

type TagResponse struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Slug      string `json:"slug"`
	Color     string `json:"color"`
	PostCount int    `json:"postCount"`
}

func (t *Tag) ToResponse() TagResponse {
	return TagResponse{
		ID:        t.ID,
		Name:      t.Name,
		Slug:      t.Slug,
		Color:     t.Color,
		PostCount: t.PostCount,
	}
}

package models

import (
	"time"

	"gorm.io/gorm"
)

type WorkspaceLocale struct {
	Code      string    `gorm:"primaryKey;size:10" json:"code"`
	Name      string    `gorm:"size:100;not null" json:"name"`
	Flag      string    `gorm:"size:20;not null" json:"flag"`
	Direction string    `gorm:"size:10;default:'ltr'" json:"direction"`
	IsDefault bool      `gorm:"default:false" json:"isDefault"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func (l *WorkspaceLocale) BeforeCreate(tx *gorm.DB) error {
	if l.Direction == "" {
		l.Direction = "ltr"
	}
	return nil
}

package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Dimensions struct {
	Width  int `json:"width"`
	Height int `json:"height"`
}

type MediaUploader struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Avatar string `json:"avatar,omitempty"`
}

type MediaItem struct {
	ID           string    `gorm:"primaryKey;size:36" json:"id"`
	Name         string    `gorm:"size:255;not null" json:"name"`
	Title        string    `gorm:"size:255" json:"title"`
	AltText      string    `gorm:"size:500" json:"altText"`
	Caption      string    `gorm:"size:1000" json:"caption"`
	MimeType     string    `gorm:"size:100;not null;index" json:"mimeType"`
	Size         int64     `gorm:"not null" json:"size"`
	URL          string    `gorm:"size:1000;not null" json:"url"`
	ThumbnailURL string    `gorm:"size:1000" json:"thumbnailUrl"`
	Width        int       `json:"width"`
	Height       int       `json:"height"`
	Duration     float64   `json:"duration"`
	UploadedByID string    `gorm:"size:36;not null;index" json:"uploadedById"`
	UploadedBy   User      `gorm:"foreignKey:UploadedByID;constraint:OnDelete:SET NULL" json:"uploadedBy"`
	TagsJSON     string    `gorm:"type:text" json:"tagsJson"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

func (m *MediaItem) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.NewString()
	}
	if m.ThumbnailURL == "" {
		m.ThumbnailURL = m.URL
	}
	return nil
}

type MediaItemResponse struct {
	ID           string         `json:"id"`
	Name         string         `json:"name"`
	Title        string         `json:"title,omitempty"`
	AltText      string         `json:"altText,omitempty"`
	Caption      string         `json:"caption,omitempty"`
	MimeType     string         `json:"mimeType"`
	Size         int64          `json:"size"`
	URL          string         `json:"url"`
	ThumbnailURL string         `json:"thumbnailUrl,omitempty"`
	Dimensions   *Dimensions    `json:"dimensions,omitempty"`
	Duration     *float64       `json:"duration,omitempty"`
	UploadedBy   MediaUploader  `json:"uploadedBy"`
	CreatedAt    int64          `json:"createdAt"`
	UpdatedAt    int64          `json:"updatedAt"`
	Tags         []string       `json:"tags"`
}

func (m *MediaItem) ToResponse() MediaItemResponse {
	tags := []string{}
	if m.TagsJSON != "" {
		_ = json.Unmarshal([]byte(m.TagsJSON), &tags)
	}

	var dims *Dimensions
	if m.Width > 0 && m.Height > 0 {
		dims = &Dimensions{Width: m.Width, Height: m.Height}
	}

	var dur *float64
	if m.Duration > 0 {
		dur = &m.Duration
	}

	return MediaItemResponse{
		ID:           m.ID,
		Name:         m.Name,
		Title:        m.Title,
		AltText:      m.AltText,
		Caption:      m.Caption,
		MimeType:     m.MimeType,
		Size:         m.Size,
		URL:          m.URL,
		ThumbnailURL: m.ThumbnailURL,
		Dimensions:   dims,
		Duration:     dur,
		UploadedBy: MediaUploader{
			ID:     m.UploadedBy.ID,
			Name:   m.UploadedBy.Name,
			Avatar: m.UploadedBy.Avatar,
		},
		CreatedAt: m.CreatedAt.UnixMilli(),
		UpdatedAt: m.UpdatedAt.UnixMilli(),
		Tags:      tags,
	}
}

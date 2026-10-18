package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type DocTreeItem struct {
	ID                 string        `json:"id"`
	CanonicalID        string        `json:"canonicalId,omitempty"`
	ParentID           *string       `json:"parentId,omitempty"`
	TranslationGroupID string        `json:"translationGroupId,omitempty"`
	SourceDocID        string        `json:"sourceDocId,omitempty"`
	LocalizedDocID     string        `json:"localizedDocId,omitempty"`
	Locale             string        `json:"locale,omitempty"`
	Title              string        `json:"title,omitempty"`
	Slug               string        `json:"slug,omitempty"`
	Icon               string        `json:"icon,omitempty"`
	Status             string        `json:"status,omitempty"`
	Children           []DocTreeItem `json:"children,omitempty"`
	HasTranslation     bool          `json:"hasTranslation"`
	IsFallback         bool          `json:"isFallback,omitempty"`
	FallbackLocale     string        `json:"fallbackLocale,omitempty"`
}

type DocNavigationManifest struct {
	ID        string        `json:"id"`
	Locale    string        `json:"locale"`
	Items     []DocTreeItem `json:"items"`
	UpdatedAt int64         `json:"updatedAt"`
}

type DocumentationProject struct {
	ID             string    `gorm:"primaryKey;size:36" json:"id"`
	Title          string    `gorm:"size:255;not null" json:"title"`
	Description    string    `gorm:"size:1000" json:"description"`
	Slug           string    `gorm:"size:255;not null;uniqueIndex" json:"slug"`
	Status         string    `gorm:"size:20;default:'draft'" json:"status"`
	NavigationJSON string    `gorm:"type:text" json:"-"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

func (p *DocumentationProject) BeforeCreate(tx *gorm.DB) error {
	if p.ID == "" {
		p.ID = uuid.NewString()
	}
	if p.Status == "" {
		p.Status = "draft"
	}
	return nil
}

type DocPage struct {
	ID                  string    `gorm:"primaryKey;size:36" json:"id"`
	ProjectID           string    `gorm:"size:36;index" json:"projectId"`
	ParentID            *string   `gorm:"size:36;index" json:"parentId"`
	TranslationGroupID  string    `gorm:"size:36;index" json:"translationGroupId"`
	TranslationSourceID *string   `gorm:"size:36" json:"translationSourceId"`
	Locale              string    `gorm:"size:10;default:'en'" json:"locale"`
	IsDefaultLocale     bool      `gorm:"default:true" json:"isDefaultLocale"`
	Title               string    `gorm:"size:255;not null" json:"title"`
	Slug                string    `gorm:"size:255;not null" json:"slug"`
	Icon                string    `gorm:"size:50" json:"icon"`
	Status              string    `gorm:"size:20;default:'draft'" json:"status"`
	Content             string    `gorm:"type:text" json:"content"` // JSON Editor.js OutputData
	CreatedAt           time.Time `json:"createdAt"`
	UpdatedAt           time.Time `json:"updatedAt"`
}

func (d *DocPage) BeforeCreate(tx *gorm.DB) error {
	if d.ID == "" {
		d.ID = uuid.NewString()
	}
	if d.Locale == "" {
		d.Locale = "en"
	}
	if d.TranslationGroupID == "" {
		d.TranslationGroupID = d.ID
	}
	if d.Status == "" {
		d.Status = "draft"
	}
	return nil
}

type DocPageResponse struct {
	ID                  string  `json:"id"`
	ProjectID           string  `json:"projectId"`
	ParentID            *string `json:"parentId"`
	TranslationGroupID  string  `json:"translationGroupId"`
	TranslationSourceID *string `json:"translationSourceId"`
	Locale              string  `json:"locale"`
	IsDefaultLocale     bool    `json:"isDefaultLocale"`
	Title               string  `json:"title"`
	Slug                string  `json:"slug"`
	Icon                string  `json:"icon,omitempty"`
	Status              string  `json:"status"`
	Content             any     `json:"content"`
	CreatedAt           int64   `json:"createdAt"`
	UpdatedAt           int64   `json:"updatedAt"`
}

func (d *DocPage) ToResponse() DocPageResponse {
	var contentObj any
	if d.Content != "" {
		_ = json.Unmarshal([]byte(d.Content), &contentObj)
	}
	if contentObj == nil {
		contentObj = []any{}
	}

	return DocPageResponse{
		ID:                  d.ID,
		ProjectID:           d.ProjectID,
		ParentID:            d.ParentID,
		TranslationGroupID:  d.TranslationGroupID,
		TranslationSourceID: d.TranslationSourceID,
		Locale:              d.Locale,
		IsDefaultLocale:     d.IsDefaultLocale,
		Title:               d.Title,
		Slug:                d.Slug,
		Icon:                d.Icon,
		Status:              d.Status,
		Content:             contentObj,
		CreatedAt:           d.CreatedAt.UnixMilli(),
		UpdatedAt:           d.UpdatedAt.UnixMilli(),
	}
}

type DocProjectResponse struct {
	ID          string                `json:"id"`
	Title       string                `json:"title"`
	Description string                `json:"description,omitempty"`
	Slug        string                `json:"slug"`
	Status      string                `json:"status"`
	PagesCount  int                   `json:"pagesCount"`
	CreatedAt   int64                 `json:"createdAt"`
	UpdatedAt   int64                 `json:"updatedAt"`
	Navigation  DocNavigationManifest `json:"navigation"`
}

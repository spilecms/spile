package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type PostStatus string

const (
	PostStatusDraft     PostStatus = "draft"
	PostStatusPublished PostStatus = "published"
	PostStatusScheduled PostStatus = "scheduled"
	PostStatusTrashed   PostStatus = "trashed"
)

type PostSEO struct {
	MetaTitle       string `json:"metaTitle,omitempty"`
	MetaDescription string `json:"metaDescription,omitempty"`
}

type Post struct {
	ID                  string     `gorm:"primaryKey;size:36" json:"id"`
	Type                string     `gorm:"size:20;default:'post'" json:"type"`
	Title               string     `gorm:"size:500;not null" json:"title"`
	Excerpt             string     `gorm:"type:text" json:"excerpt"`
	Status              PostStatus `gorm:"size:30;not null;default:'draft';index" json:"status"`
	Slug                string     `gorm:"size:500;not null;index" json:"slug"`
	FeaturedImage       string     `gorm:"size:500" json:"featuredImage,omitempty"`
	MetaTitle           string     `gorm:"size:300" json:"metaTitle,omitempty"`
	MetaDescription     string     `gorm:"type:text" json:"metaDescription,omitempty"`
	Views               int        `gorm:"default:0" json:"views"`
	ReadingTime         int        `gorm:"default:1" json:"readingTime"`
	PublishedAt         *time.Time `gorm:"index" json:"publishedAt,omitempty"`
	ScheduledFor        *time.Time `gorm:"index" json:"scheduledFor,omitempty"`
	Content             string     `gorm:"type:text" json:"content"` // JSON serialized Editor.js OutputData
	Locale              string     `gorm:"size:10;default:'en';index" json:"locale"`
	IsDefaultLocale     bool       `gorm:"default:true" json:"isDefaultLocale"`
	TranslationGroupID  string     `gorm:"size:36;index" json:"translationGroupId"`
	TranslationSourceID *string    `gorm:"size:36" json:"translationSourceId,omitempty"`
	Authors             []User     `gorm:"many2many:post_authors;" json:"authors,omitempty"`
	Tags                []Tag      `gorm:"many2many:post_tags;" json:"tags,omitempty"`
	CreatedAt           time.Time  `json:"createdAt"`
	UpdatedAt           time.Time  `json:"updatedAt"`
}

func (p *Post) BeforeCreate(tx *gorm.DB) error {
	if p.ID == "" {
		p.ID = uuid.NewString()
	}
	if p.Type == "" {
		p.Type = "post"
	}
	if p.Status == "" {
		p.Status = PostStatusDraft
	}
	if p.Locale == "" {
		p.Locale = "en"
	}
	if p.TranslationGroupID == "" {
		p.TranslationGroupID = p.ID
	}
	if p.ReadingTime <= 0 {
		p.ReadingTime = 1
	}
	return nil
}

type PostResponse struct {
	ID                  string     `json:"id"`
	Type                string     `json:"type"`
	Title               string     `json:"title"`
	Excerpt             string     `json:"excerpt"`
	Status              PostStatus `json:"status"`
	AuthorIDs           []string   `json:"authorIds"`
	TagIDs              []string   `json:"tagIds"`
	Slug                string     `json:"slug"`
	FeaturedImage       string     `json:"featuredImage,omitempty"`
	SEO                 PostSEO    `json:"seo"`
	Views               int        `json:"views"`
	ReadingTime         int        `json:"readingTime"`
	CreatedAt           int64      `json:"createdAt"`
	UpdatedAt           int64      `json:"updatedAt"`
	PublishedAt         *int64     `json:"publishedAt"`
	ScheduledFor        *int64     `json:"scheduledFor"`
	Content             any        `json:"content"`
	Locale              string     `json:"locale"`
	IsDefaultLocale     bool       `json:"isDefaultLocale"`
	TranslationGroupID  string     `json:"translationGroupId"`
	TranslationSourceID *string    `json:"translationSourceId,omitempty"`
}

func (p *Post) ToResponse() PostResponse {
	authorIDs := make([]string, 0, len(p.Authors))
	for _, a := range p.Authors {
		authorIDs = append(authorIDs, a.ID)
	}

	tagIDs := make([]string, 0, len(p.Tags))
	for _, t := range p.Tags {
		tagIDs = append(tagIDs, t.ID)
	}

	var pubAt *int64
	if p.PublishedAt != nil {
		ms := p.PublishedAt.UnixMilli()
		pubAt = &ms
	}

	var schedFor *int64
	if p.ScheduledFor != nil {
		ms := p.ScheduledFor.UnixMilli()
		schedFor = &ms
	}

	var contentObj any
	if p.Content != "" {
		_ = json.Unmarshal([]byte(p.Content), &contentObj)
	}
	if contentObj == nil {
		contentObj = map[string]any{"blocks": []any{}}
	}

	return PostResponse{
		ID:                  p.ID,
		Type:                p.Type,
		Title:               p.Title,
		Excerpt:             p.Excerpt,
		Status:              p.Status,
		AuthorIDs:           authorIDs,
		TagIDs:              tagIDs,
		Slug:                p.Slug,
		FeaturedImage:       p.FeaturedImage,
		SEO:                 PostSEO{MetaTitle: p.MetaTitle, MetaDescription: p.MetaDescription},
		Views:               p.Views,
		ReadingTime:         p.ReadingTime,
		CreatedAt:           p.CreatedAt.UnixMilli(),
		UpdatedAt:           p.UpdatedAt.UnixMilli(),
		PublishedAt:         pubAt,
		ScheduledFor:        schedFor,
		Content:             contentObj,
		Locale:              p.Locale,
		IsDefaultLocale:     p.IsDefaultLocale,
		TranslationGroupID:  p.TranslationGroupID,
		TranslationSourceID: p.TranslationSourceID,
	}
}

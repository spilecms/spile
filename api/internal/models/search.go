package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// SearchSection represents a pre-chunked, published content section indexed at publish time.
type SearchSection struct {
	ID             string    `gorm:"primaryKey;size:36" json:"id"`
	EntityID       string    `gorm:"size:36;not null;index:idx_search_entity" json:"entityId"`
	EntityType     string    `gorm:"size:20;not null;index:idx_search_entity" json:"entityType"` // "doc" | "post"
	ProjectID      string    `gorm:"size:36;index:idx_search_project" json:"projectId,omitempty"`
	ProjectSlug    string    `gorm:"size:255;index:idx_search_project_slug" json:"projectSlug,omitempty"`
	ProjectTitle   string    `gorm:"size:255" json:"projectTitle,omitempty"`
	Locale         string    `gorm:"size:10;not null;default:'en';index:idx_search_locale" json:"locale"`
	PageTitle      string    `gorm:"size:255;not null" json:"pageTitle"`
	PageSlug       string    `gorm:"size:255;not null" json:"pageSlug"`
	SectionTitle   string    `gorm:"size:255;not null" json:"sectionTitle"`
	HeadingPathRaw string    `gorm:"column:heading_path;type:text" json:"-"`
	Anchor         string    `gorm:"size:255" json:"anchor"`
	BlockID        string    `gorm:"size:64" json:"blockId,omitempty"`
	Kind           string    `gorm:"size:20;not null;default:'section'" json:"kind"` // "intro" | "section"
	BodyText       string    `gorm:"type:text" json:"bodyText"`
	CodeText       string    `gorm:"type:text" json:"codeText,omitempty"`
	ParamNames     string    `gorm:"type:text" json:"paramNames,omitempty"`
	SectionOrder   int       `gorm:"default:0" json:"sectionOrder"`
	UpdatedAt      time.Time `gorm:"index" json:"updatedAt"`
}

func (s *SearchSection) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.NewString()
	}
	if s.Locale == "" {
		s.Locale = "en"
	}
	if s.Kind == "" {
		s.Kind = "section"
	}
	return nil
}

func (s *SearchSection) HeadingPath() []string {
	if s.HeadingPathRaw == "" {
		return []string{}
	}
	var path []string
	if err := json.Unmarshal([]byte(s.HeadingPathRaw), &path); err != nil {
		return []string{}
	}
	return path
}

func (s *SearchSection) SetHeadingPath(path []string) {
	if len(path) == 0 {
		s.HeadingPathRaw = "[]"
		return
	}
	b, err := json.Marshal(path)
	if err == nil {
		s.HeadingPathRaw = string(b)
	}
}

// MatchRange represents a character offset range [Start, End) in plain text for safe highlighting without HTML injection.
type MatchRange struct {
	Start int `json:"start"`
	End   int `json:"end"`
}

// SearchResult is a single ranked section hit returned by GET /api/v1/search.
type SearchResult struct {
	ID             string       `json:"id"`
	EntityID       string       `json:"entityId"`
	EntityType     string       `json:"type"` // "doc" | "post"
	ProjectID      string       `json:"projectId,omitempty"`
	ProjectSlug    string       `json:"projectSlug,omitempty"`
	ProjectTitle   string       `json:"projectTitle,omitempty"`
	Locale         string       `json:"locale"`
	PageTitle      string       `json:"pageTitle"`
	PageSlug       string       `json:"pageSlug"`
	SectionTitle   string       `json:"sectionTitle"`
	HeadingPath    []string     `json:"headingPath"`
	Anchor         string       `json:"anchor"`
	BlockID        string       `json:"blockId,omitempty"`
	Kind           string       `json:"kind"` // "intro" | "section"
	ParamNames     []string     `json:"paramNames,omitempty"`
	Snippet        string       `json:"snippet"`
	TitleMatches   []MatchRange `json:"titleMatches"`
	SnippetMatches []MatchRange `json:"snippetMatches"`
	Score          float64      `json:"score"`
	UpdatedAt      int64        `json:"updatedAt"`
}

// SearchResponse wraps the search results for GET /api/v1/search.
type SearchResponse struct {
	Query   string         `json:"query"`
	Total   int            `json:"total"`
	Results []SearchResult `json:"results"`
}

// ClientSearchIndexItem is a lightweight section record for client-side search (MiniSearch / cmdk).
// Full code blocks are intentionally omitted and body text is capped to keep the payload compact.
type ClientSearchIndexItem struct {
	ID           string   `json:"id"`
	PageID       string   `json:"pageId"`
	Locale       string   `json:"locale"`
	PageTitle    string   `json:"pageTitle"`
	PageSlug     string   `json:"pageSlug"`
	SectionTitle string   `json:"sectionTitle"`
	HeadingPath  []string `json:"headingPath"`
	Anchor       string   `json:"anchor"`
	Kind         string   `json:"kind"`
	ParamNames   []string `json:"paramNames,omitempty"`
	Text         string   `json:"text"`
	UpdatedAt    int64    `json:"updatedAt"`
}

// ClientSearchIndexResponse is returned by GET /api/v1/docs/projects/:id/search-index.
type ClientSearchIndexResponse struct {
	ProjectID   string                  `json:"projectId"`
	ProjectSlug string                  `json:"projectSlug"`
	Locale      string                  `json:"locale"`
	UpdatedAt   int64                   `json:"updatedAt"`
	Total       int                     `json:"total"`
	Items       []ClientSearchIndexItem `json:"items"`
}

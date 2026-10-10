package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ReviewTargetType string

const (
	ReviewTargetPost ReviewTargetType = "post"
	ReviewTargetDoc  ReviewTargetType = "doc"
)

type RevisionStatus string

const (
	RevisionStatusDraft           RevisionStatus = "draft"
	RevisionStatusInReview        RevisionStatus = "in_review"
	RevisionStatusApproved        RevisionStatus = "approved"
	RevisionStatusPublished       RevisionStatus = "published"
	RevisionStatusChangesRequired RevisionStatus = "changes_requested"
)

type ContentRevision struct {
	ID            string           `gorm:"primaryKey;size:36" json:"id"`
	TargetType    ReviewTargetType `gorm:"size:20;not null;index" json:"targetType"`
	TargetID      string           `gorm:"size:36;not null;index" json:"targetId"`
	VersionNumber int              `gorm:"not null" json:"versionNumber"`
	VersionLabel  string           `gorm:"size:50;not null" json:"versionLabel"`
	Title         string           `gorm:"size:255;not null" json:"title"`
	Summary       string           `gorm:"size:1000" json:"summary,omitempty"`
	Content       string           `gorm:"type:text" json:"content"` // Editor.js JSON
	AuthorID      string           `gorm:"size:36;not null" json:"authorId"`
	AuthorName    string           `gorm:"size:255;not null" json:"authorName"`
	Status        RevisionStatus   `gorm:"size:30;not null;default:'draft'" json:"status"`
	CreatedAt     time.Time        `json:"createdAt"`
}

func (r *ContentRevision) BeforeCreate(tx *gorm.DB) error {
	if r.ID == "" {
		r.ID = uuid.NewString()
	}
	return nil
}

type RevisionResponse struct {
	ID            string           `json:"id"`
	TargetType    ReviewTargetType `json:"targetType"`
	TargetID      string           `json:"targetId"`
	VersionNumber int              `json:"versionNumber"`
	VersionLabel  string           `json:"versionLabel"`
	Title         string           `json:"title"`
	Summary       string           `json:"summary,omitempty"`
	Content       any              `json:"content"`
	AuthorID      string           `json:"authorId"`
	AuthorName    string           `json:"authorName"`
	Status        RevisionStatus   `json:"status"`
	CreatedAt     int64            `json:"createdAt"`
}

func (r *ContentRevision) ToResponse() RevisionResponse {
	var contentObj any
	if r.Content != "" {
		_ = json.Unmarshal([]byte(r.Content), &contentObj)
	}

	return RevisionResponse{
		ID:            r.ID,
		TargetType:    r.TargetType,
		TargetID:      r.TargetID,
		VersionNumber: r.VersionNumber,
		VersionLabel:  r.VersionLabel,
		Title:         r.Title,
		Summary:       r.Summary,
		Content:       contentObj,
		AuthorID:      r.AuthorID,
		AuthorName:    r.AuthorName,
		Status:        r.Status,
		CreatedAt:     r.CreatedAt.UnixMilli(),
	}
}

type ReviewStatus string

const (
	ReviewStatusInReview        ReviewStatus = "in_review"
	ReviewStatusApproved        ReviewStatus = "approved"
	ReviewStatusChangesRequired ReviewStatus = "changes_requested"
	ReviewStatusWithdrawn       ReviewStatus = "withdrawn"
)

type ReviewRequest struct {
	ID           string           `gorm:"primaryKey;size:36" json:"id"`
	TargetType   ReviewTargetType `gorm:"size:20;not null;index" json:"targetType"`
	TargetID     string           `gorm:"size:36;not null;index" json:"targetId"`
	TargetTitle  string           `gorm:"size:255;not null" json:"targetTitle"`
	RevisionID   string           `gorm:"size:36;not null;index" json:"revisionId"`
	AuthorID     string           `gorm:"size:36;not null" json:"authorId"`
	AuthorName   string           `gorm:"size:255;not null" json:"authorName"`
	ReviewerID   string           `gorm:"size:36" json:"reviewerId,omitempty"`
	ReviewerName string           `gorm:"size:255" json:"reviewerName,omitempty"`
	Summary      string           `gorm:"size:1000" json:"summary"`
	Status       ReviewStatus     `gorm:"size:30;not null;default:'in_review';index" json:"status"`
	ReviewNotes  string           `gorm:"type:text" json:"reviewNotes,omitempty"`
	CreatedAt    time.Time        `json:"createdAt"`
	UpdatedAt    time.Time        `json:"updatedAt"`
}

func (rr *ReviewRequest) BeforeCreate(tx *gorm.DB) error {
	if rr.ID == "" {
		rr.ID = uuid.NewString()
	}
	if rr.Status == "" {
		rr.Status = ReviewStatusInReview
	}
	return nil
}

type Notification struct {
	ID         string           `gorm:"primaryKey;size:36" json:"id"`
	Type       string           `gorm:"size:50;not null;index" json:"type"`
	Title      string           `gorm:"size:255;not null" json:"title"`
	Message    string           `gorm:"size:1000;not null" json:"message"`
	TargetType ReviewTargetType `gorm:"size:20;not null" json:"targetType"`
	TargetID   string           `gorm:"size:36;not null;index" json:"targetId"`
	ReviewID   string           `gorm:"size:36;index" json:"reviewId,omitempty"`
	Read       bool             `gorm:"default:false;index" json:"read"`
	UserID     string           `gorm:"size:36;index" json:"userId,omitempty"`
	CreatedAt  time.Time        `json:"createdAt"`
}

func (n *Notification) BeforeCreate(tx *gorm.DB) error {
	if n.ID == "" {
		n.ID = uuid.NewString()
	}
	return nil
}

package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type NewsletterStatus string

const (
	NewsletterStatusDraft     NewsletterStatus = "draft"
	NewsletterStatusScheduled NewsletterStatus = "scheduled"
	NewsletterStatusSending   NewsletterStatus = "sending"
	NewsletterStatusSent      NewsletterStatus = "sent"
)

type Newsletter struct {
	ID              string           `gorm:"primaryKey;size:36" json:"id"`
	Title           string           `gorm:"size:255;not null" json:"title"`
	Subject         string           `gorm:"size:255;not null" json:"subject"`
	PreviewText     string           `gorm:"size:500" json:"previewText"`
	Content         string           `gorm:"type:text" json:"content"` // JSON Editor.js OutputData
	Status          NewsletterStatus `gorm:"size:30;not null;default:'draft';index" json:"status"`
	SenderName      string           `gorm:"size:100" json:"senderName"`
	SenderEmail     string           `gorm:"size:100" json:"senderEmail"`
	RecipientsCount int              `gorm:"default:0" json:"recipientsCount"`
	DeliveredCount  int              `gorm:"default:0" json:"deliveredCount"`
	OpenedCount     int              `gorm:"default:0" json:"openedCount"`
	ClickedCount    int              `gorm:"default:0" json:"clickedCount"`
	ScheduledFor    *time.Time       `json:"scheduledFor,omitempty"`
	SentAt          *time.Time       `json:"sentAt,omitempty"`
	CreatedAt       time.Time        `json:"createdAt"`
	UpdatedAt       time.Time        `json:"updatedAt"`
}

func (n *Newsletter) BeforeCreate(tx *gorm.DB) error {
	if n.ID == "" {
		n.ID = uuid.NewString()
	}
	if n.Status == "" {
		n.Status = NewsletterStatusDraft
	}
	return nil
}

type NewsletterResponse struct {
	ID              string           `json:"id"`
	Title           string           `json:"title"`
	Subject         string           `json:"subject"`
	PreviewText     string           `json:"previewText,omitempty"`
	Content         any              `json:"content"`
	Status          NewsletterStatus `json:"status"`
	SenderName      string           `json:"senderName,omitempty"`
	SenderEmail     string           `json:"senderEmail,omitempty"`
	RecipientsCount int              `json:"recipientsCount"`
	DeliveredCount  int              `json:"deliveredCount"`
	OpenedCount     int              `json:"openedCount"`
	ClickedCount    int              `json:"clickedCount"`
	ScheduledFor    *int64           `json:"scheduledFor"`
	SentAt          *int64           `json:"sentAt"`
	CreatedAt       int64            `json:"createdAt"`
	UpdatedAt       int64            `json:"updatedAt"`
}

func (n *Newsletter) ToResponse() NewsletterResponse {
	var contentObj any
	if n.Content != "" {
		_ = json.Unmarshal([]byte(n.Content), &contentObj)
	}
	if contentObj == nil {
		contentObj = map[string]any{"blocks": []any{}}
	}

	var schedFor *int64
	if n.ScheduledFor != nil {
		ms := n.ScheduledFor.UnixMilli()
		schedFor = &ms
	}

	var sentAt *int64
	if n.SentAt != nil {
		ms := n.SentAt.UnixMilli()
		sentAt = &ms
	}

	return NewsletterResponse{
		ID:              n.ID,
		Title:           n.Title,
		Subject:         n.Subject,
		PreviewText:     n.PreviewText,
		Content:         contentObj,
		Status:          n.Status,
		SenderName:      n.SenderName,
		SenderEmail:     n.SenderEmail,
		RecipientsCount: n.RecipientsCount,
		DeliveredCount:  n.DeliveredCount,
		OpenedCount:     n.OpenedCount,
		ClickedCount:    n.ClickedCount,
		ScheduledFor:    schedFor,
		SentAt:          sentAt,
		CreatedAt:       n.CreatedAt.UnixMilli(),
		UpdatedAt:       n.UpdatedAt.UnixMilli(),
	}
}

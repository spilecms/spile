package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/spilecms/spile/api/internal/email"
	"github.com/spilecms/spile/api/internal/models"
	"github.com/spilecms/spile/api/internal/webhook"
	"gorm.io/gorm"
)

type NewsletterHandler struct {
	db *gorm.DB
}

func NewNewsletterHandler(db *gorm.DB) *NewsletterHandler {
	return &NewsletterHandler{db: db}
}

type CreateNewsletterRequest struct {
	Title        string                  `json:"title" binding:"required"`
	Subject      string                  `json:"subject" binding:"required"`
	PreviewText  string                  `json:"previewText"`
	Content      any                     `json:"content"`
	Status       models.NewsletterStatus `json:"status"`
	SenderName   string                  `json:"senderName"`
	SenderEmail  string                  `json:"senderEmail"`
	ScheduledFor *int64                  `json:"scheduledFor"`
}

type UpdateNewsletterRequest struct {
	Title        *string                  `json:"title"`
	Subject      *string                  `json:"subject"`
	PreviewText  *string                  `json:"previewText"`
	Content      any                      `json:"content"`
	Status       *models.NewsletterStatus `json:"status"`
	SenderName   *string                  `json:"senderName"`
	SenderEmail  *string                  `json:"senderEmail"`
	ScheduledFor *int64                   `json:"scheduledFor"`
}

type SendTestRequest struct {
	Email string `json:"email" binding:"required"`
}

func (h *NewsletterHandler) List(c *gin.Context) {
	status := c.Query("status")
	query := c.Query("query")

	dbQuery := h.db.Model(&models.Newsletter{}).Order("updated_at desc")
	if status != "" && status != "all" {
		dbQuery = dbQuery.Where("status = ?", status)
	}

	if query != "" {
		q := "%" + strings.ToLower(query) + "%"
		dbQuery = dbQuery.Where("LOWER(title) LIKE ? OR LOWER(subject) LIKE ?", q, q)
	}

	var newsletters []models.Newsletter
	if err := dbQuery.Find(&newsletters).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query newsletters"})
		return
	}

	res := make([]models.NewsletterResponse, len(newsletters))
	for i, n := range newsletters {
		res[i] = n.ToResponse()
	}
	c.JSON(http.StatusOK, res)
}

func (h *NewsletterHandler) Get(c *gin.Context) {
	id := c.Param("id")
	var n models.Newsletter
	if err := h.db.First(&n, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Newsletter not found"})
		return
	}
	c.JSON(http.StatusOK, n.ToResponse())
}

func (h *NewsletterHandler) Create(c *gin.Context) {
	var req CreateNewsletterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	var contentStr string
	if req.Content != nil {
		b, _ := json.Marshal(req.Content)
		contentStr = string(b)
	}

	status := req.Status
	if status == "" {
		status = models.NewsletterStatusDraft
	}

	var schedFor *time.Time
	if req.ScheduledFor != nil && *req.ScheduledFor > 0 {
		t := time.UnixMilli(*req.ScheduledFor)
		schedFor = &t
	}

	newsletter := models.Newsletter{
		Title:        req.Title,
		Subject:      req.Subject,
		PreviewText:  req.PreviewText,
		Content:      contentStr,
		Status:       status,
		SenderName:   req.SenderName,
		SenderEmail:  req.SenderEmail,
		ScheduledFor: schedFor,
	}

	if err := h.db.Create(&newsletter).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create newsletter"})
		return
	}

	c.JSON(http.StatusCreated, newsletter.ToResponse())
}

func (h *NewsletterHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req UpdateNewsletterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	var n models.Newsletter
	if err := h.db.First(&n, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Newsletter not found"})
		return
	}

	if req.Title != nil {
		n.Title = *req.Title
	}
	if req.Subject != nil {
		n.Subject = *req.Subject
	}
	if req.PreviewText != nil {
		n.PreviewText = *req.PreviewText
	}
	if req.SenderName != nil {
		n.SenderName = *req.SenderName
	}
	if req.SenderEmail != nil {
		n.SenderEmail = *req.SenderEmail
	}
	if req.Content != nil {
		b, _ := json.Marshal(req.Content)
		n.Content = string(b)
	}
	if req.Status != nil {
		n.Status = *req.Status
		if *req.Status == models.NewsletterStatusSent && n.SentAt == nil {
			now := time.Now()
			n.SentAt = &now
		}
	}
	if req.ScheduledFor != nil {
		if *req.ScheduledFor > 0 {
			t := time.UnixMilli(*req.ScheduledFor)
			n.ScheduledFor = &t
		} else {
			n.ScheduledFor = nil
		}
	}

	if err := h.db.Save(&n).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update newsletter"})
		return
	}

	c.JSON(http.StatusOK, n.ToResponse())
}

func (h *NewsletterHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if err := h.db.Delete(&models.Newsletter{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete newsletter"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Newsletter deleted successfully"})
}

func (h *NewsletterHandler) Duplicate(c *gin.Context) {
	id := c.Param("id")
	var source models.Newsletter
	if err := h.db.First(&source, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Newsletter not found"})
		return
	}

	copyItem := models.Newsletter{
		ID:          uuid.NewString(),
		Title:       source.Title + " (copy)",
		Subject:     source.Subject,
		PreviewText: source.PreviewText,
		Content:     source.Content,
		Status:      models.NewsletterStatusDraft,
		SenderName:  source.SenderName,
		SenderEmail: source.SenderEmail,
	}

	if err := h.db.Create(&copyItem).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to duplicate newsletter"})
		return
	}

	c.JSON(http.StatusCreated, copyItem.ToResponse())
}

func (h *NewsletterHandler) SendTest(c *gin.Context) {
	id := c.Param("id")
	var req SendTestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Valid email is required"})
		return
	}

	var n models.Newsletter
	if err := h.db.First(&n, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Newsletter not found"})
		return
	}

	htmlBody := "<h1>" + n.Title + "</h1><p>" + n.PreviewText + "</p>"
	if err := email.Send(h.db, req.Email, n.Subject, htmlBody, n.SenderName, n.SenderEmail); err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "Failed to send test email: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Test email for \"" + n.Subject + "\" sent to " + req.Email,
	})
}

func (h *NewsletterHandler) Send(c *gin.Context) {
	id := c.Param("id")
	var n models.Newsletter
	if err := h.db.First(&n, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Newsletter not found"})
		return
	}

	var members []models.Member
	h.db.Where("status = ?", models.MemberStatusActive).Find(&members)

	htmlBody := "<h1>" + n.Title + "</h1><p>" + n.PreviewText + "</p>"
	delivered := 0
	for _, m := range members {
		if m.Email == "" {
			continue
		}
		if err := email.Send(h.db, m.Email, n.Subject, htmlBody, n.SenderName, n.SenderEmail); err == nil {
			delivered++
		}
	}

	now := time.Now()
	n.Status = models.NewsletterStatusSent
	n.SentAt = &now
	n.RecipientsCount = len(members)
	n.DeliveredCount = delivered

	if err := h.db.Save(&n).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send newsletter"})
		return
	}

	resp := n.ToResponse()
	webhook.Dispatch(h.db, "newsletter.sent", resp)
	c.JSON(http.StatusOK, resp)
}

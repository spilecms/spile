package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/spilecms/spile/api/internal/models"
	"gorm.io/gorm"
)

type SettingsHandler struct {
	db *gorm.DB
}

func NewSettingsHandler(db *gorm.DB) *SettingsHandler {
	return &SettingsHandler{db: db}
}

type CreateApiKeyRequest struct {
	Name string            `json:"name" binding:"required"`
	Type models.ApiKeyType `json:"type" binding:"required"`
}

type CreateWebhookRequest struct {
	Name   string   `json:"name" binding:"required"`
	URL    string   `json:"url" binding:"required"`
	Events []string `json:"events" binding:"required"`
}

func (h *SettingsHandler) getSetting(key string, target any, fallback any) {
	var s models.SystemSetting
	if err := h.db.First(&s, "key = ?", key).Error; err == nil {
		_ = json.Unmarshal([]byte(s.ValueJSON), target)
		return
	}
	bytes, _ := json.Marshal(fallback)
	_ = json.Unmarshal(bytes, target)
}

func (h *SettingsHandler) saveSetting(key string, val any) error {
	bytes, err := json.Marshal(val)
	if err != nil {
		return err
	}
	setting := models.SystemSetting{
		Key:       key,
		ValueJSON: string(bytes),
		UpdatedAt: time.Now(),
	}
	return h.db.Save(&setting).Error
}

func (h *SettingsHandler) GetStorage(c *gin.Context) {
	var data map[string]any
	h.getSetting("storage", &data, map[string]any{
		"provider":  "local",
		"localPath": "./uploads",
		"publicUrl": "/uploads",
	})
	c.JSON(http.StatusOK, data)
}

func (h *SettingsHandler) UpdateStorage(c *gin.Context) {
	var payload map[string]any
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	var existing map[string]any
	h.getSetting("storage", &existing, map[string]any{})
	for k, v := range payload {
		existing[k] = v
	}
	_ = h.saveSetting("storage", existing)
	c.JSON(http.StatusOK, existing)
}

func (h *SettingsHandler) GetEmail(c *gin.Context) {
	var data map[string]any
	h.getSetting("email", &data, map[string]any{
		"fromName":  "Spile Editorial Team",
		"fromEmail": "newsletter@spile.io",
		"replyTo":   "team@spile.io",
		"provider":  "resend",
	})
	c.JSON(http.StatusOK, data)
}

func (h *SettingsHandler) UpdateEmail(c *gin.Context) {
	var payload map[string]any
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	var existing map[string]any
	h.getSetting("email", &existing, map[string]any{})
	for k, v := range payload {
		existing[k] = v
	}
	_ = h.saveSetting("email", existing)
	c.JSON(http.StatusOK, existing)
}

func (h *SettingsHandler) GetAI(c *gin.Context) {
	var data map[string]any
	h.getSetting("ai", &data, map[string]any{
		"provider":               "gemini",
		"model":                  "gemini-1.5-flash",
		"enableTranslations":     true,
		"enableSummaries":        true,
		"enableWritingAssistant": true,
	})
	c.JSON(http.StatusOK, data)
}

func (h *SettingsHandler) UpdateAI(c *gin.Context) {
	var payload map[string]any
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	var existing map[string]any
	h.getSetting("ai", &existing, map[string]any{})
	for k, v := range payload {
		existing[k] = v
	}
	_ = h.saveSetting("ai", existing)
	c.JSON(http.StatusOK, existing)
}

func (h *SettingsHandler) ListApiKeys(c *gin.Context) {
	var keys []models.ApiKey
	h.db.Order("created_at desc").Find(&keys)
	c.JSON(http.StatusOK, keys)
}

func (h *SettingsHandler) CreateApiKey(c *gin.Context) {
	var req CreateApiKeyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	randBytes := make([]byte, 16)
	_, _ = rand.Read(randBytes)
	secret := hex.EncodeToString(randBytes)

	prefix := "pk_live_"
	if req.Type == models.ApiKeyTypeAdminSecret {
		prefix = "sk_live_"
	}
	fullPrefix := prefix + secret[:6] + "..."

	apiKey := models.ApiKey{
		Name:       req.Name,
		Prefix:     fullPrefix,
		SecretHash: secret,
		Type:       req.Type,
	}

	if err := h.db.Create(&apiKey).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create API key"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":        apiKey.ID,
		"name":      apiKey.Name,
		"prefix":    apiKey.Prefix,
		"type":      apiKey.Type,
		"createdAt": apiKey.CreatedAt.UnixMilli(),
		"key":       prefix + secret, // Full key shown once upon creation
	})
}

func (h *SettingsHandler) DeleteApiKey(c *gin.Context) {
	id := c.Param("id")
	h.db.Delete(&models.ApiKey{}, "id = ?", id)
	c.JSON(http.StatusOK, gin.H{"message": "API key deleted successfully"})
}

func (h *SettingsHandler) ListWebhooks(c *gin.Context) {
	var webhooks []models.Webhook
	h.db.Order("created_at desc").Find(&webhooks)

	type WebhookResponse struct {
		ID        string   `json:"id"`
		Name      string   `json:"name"`
		URL       string   `json:"url"`
		Events    []string `json:"events"`
		Active    bool     `json:"active"`
		CreatedAt int64    `json:"createdAt"`
	}

	res := make([]WebhookResponse, len(webhooks))
	for i, w := range webhooks {
		var events []string
		_ = json.Unmarshal([]byte(w.EventsJSON), &events)
		res[i] = WebhookResponse{
			ID:        w.ID,
			Name:      w.Name,
			URL:       w.URL,
			Events:    events,
			Active:    w.Active,
			CreatedAt: w.CreatedAt.UnixMilli(),
		}
	}
	c.JSON(http.StatusOK, res)
}

func (h *SettingsHandler) CreateWebhook(c *gin.Context) {
	var req CreateWebhookRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	eventsJSON, _ := json.Marshal(req.Events)
	wh := models.Webhook{
		Name:       req.Name,
		URL:        req.URL,
		EventsJSON: string(eventsJSON),
		Active:     true,
	}

	if err := h.db.Create(&wh).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create webhook"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":        wh.ID,
		"name":      wh.Name,
		"url":       wh.URL,
		"events":    req.Events,
		"active":    wh.Active,
		"createdAt": wh.CreatedAt.UnixMilli(),
	})
}

func (h *SettingsHandler) DeleteWebhook(c *gin.Context) {
	id := c.Param("id")
	h.db.Delete(&models.Webhook{}, "id = ?", id)
	c.JSON(http.StatusOK, gin.H{"message": "Webhook deleted successfully"})
}

func (h *SettingsHandler) OverviewStats(c *gin.Context) {
	var publishedCount, draftCount, memberCount, totalViews int64

	h.db.Model(&models.Post{}).Where("status = ?", models.PostStatusPublished).Count(&publishedCount)
	h.db.Model(&models.Post{}).Where("status = ?", models.PostStatusDraft).Count(&draftCount)
	h.db.Model(&models.Member{}).Where("status = ?", models.MemberStatusActive).Count(&memberCount)

	type Result struct {
		TotalViews int64
	}
	var res Result
	h.db.Model(&models.Post{}).Select("COALESCE(SUM(views), 0) as total_views").Scan(&res)
	totalViews = res.TotalViews

	c.JSON(http.StatusOK, gin.H{
		"totalViews":   totalViews,
		"viewsTrend":   12.4,
		"published":    publishedCount,
		"drafts":       draftCount,
		"members":      memberCount,
		"membersTrend": 8.2,
		"avgReadTime":  4.2,
	})
}

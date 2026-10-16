package handlers

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/spilecms/spile/api/internal/auth"
	"github.com/spilecms/spile/api/internal/email"
	"github.com/spilecms/spile/api/internal/models"
	"github.com/spilecms/spile/api/internal/storage"
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
	Type models.ApiKeyType `json:"type"`
}

type CreateWebhookRequest struct {
	Name   string   `json:"name" binding:"required"`
	URL    string   `json:"url" binding:"required"`
	Events []string `json:"events" binding:"required"`
	Secret string   `json:"secret"`
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

func (h *SettingsHandler) TestStorage(c *gin.Context) {
	var cfg map[string]any
	h.getSetting("storage", &cfg, map[string]any{
		"provider":  "local",
		"localPath": "./uploads",
	})
	provider, _ := cfg["provider"].(string)
	if provider == "s3" || provider == "r2" || provider == "minio" {
		bucket, _ := cfg["bucket"].(string)
		endpoint, _ := cfg["endpoint"].(string)
		region, _ := cfg["region"].(string)
		accessKey, _ := cfg["accessKey"].(string)
		secretKey, _ := cfg["secretKey"].(string)
		publicURL, _ := cfg["publicUrl"].(string)

		s3Prov, err := storage.NewS3StorageProvider(storage.S3Config{
			Provider:  provider,
			Bucket:    bucket,
			Endpoint:  endpoint,
			Region:    region,
			AccessKey: accessKey,
			SecretKey: secretKey,
			PublicURL: publicURL,
		})
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid storage configuration: " + err.Error()})
			return
		}
		if err := s3Prov.TestConnection(); err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "Storage connection failed: " + err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": fmt.Sprintf("%s bucket %q connection verified successfully!", strings.ToUpper(provider), bucket),
		})
		return
	}

	localPath, _ := cfg["localPath"].(string)
	if localPath == "" {
		localPath = "./uploads"
	}
	if err := os.MkdirAll(localPath, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Storage path is not writable: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Local storage directory is accessible and writable!",
	})
}

func (h *SettingsHandler) GetEmail(c *gin.Context) {
	var data map[string]any
	h.getSetting("email", &data, map[string]any{
		"fromName":  "Spile Editorial Team",
		"fromEmail": "newsletter@spile.io",
		"replyTo":   "team@spile.io",
		"provider":  "resend",
	})
	configured, reason := email.IsConfigured(h.db)
	data["isConfigured"] = configured
	data["configuredReason"] = reason
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
	configured, reason := email.IsConfigured(h.db)
	existing["isConfigured"] = configured
	existing["configuredReason"] = reason
	c.JSON(http.StatusOK, existing)
}

func (h *SettingsHandler) TestEmail(c *gin.Context) {
	if configured, reason := email.IsConfigured(h.db); !configured {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email service is not configured: " + reason})
		return
	}

	currentUser, ok := auth.GetCurrentUser(c)
	toEmail := "admin@spile.dev"
	if ok && currentUser.Email != "" {
		toEmail = currentUser.Email
	}
	err := email.Send(
		h.db,
		toEmail,
		"Spile CMS — Test Email Configuration",
		"<p>Your Spile CMS email integration is configured and working properly.</p>",
		"",
		"",
	)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "Failed to send test email: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Test email sent to " + toEmail,
	})
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
	hashBytes := sha256.Sum256([]byte(secret))
	secretHash := hex.EncodeToString(hashBytes[:])

	prefix := "pk_live_"
	fullPrefix := prefix + secret[:6] + "..."

	apiKey := models.ApiKey{
		Name:       req.Name,
		Prefix:     fullPrefix,
		SecretHash: secretHash,
		Type:       models.ApiKeyTypePublicRead,
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
		"key":       prefix + secret,
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
		Secret    string   `json:"secret,omitempty"`
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
			Secret:    w.Secret,
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
	secret := strings.TrimSpace(req.Secret)
	if secret == "" {
		randomBytes := make([]byte, 16)
		_, _ = rand.Read(randomBytes)
		secret = "whsec_" + hex.EncodeToString(randomBytes)
	}

	wh := models.Webhook{
		Name:       req.Name,
		URL:        req.URL,
		EventsJSON: string(eventsJSON),
		Secret:     secret,
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
		"secret":    wh.Secret,
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
	h.db.Model(&models.PageView{}).Count(&totalViews)

	now := time.Now()
	thirtyDaysAgo := now.AddDate(0, 0, -30)
	sixtyDaysAgo := now.AddDate(0, 0, -60)

	var currViews, prevViews int64
	h.db.Model(&models.PageView{}).Where("created_at >= ?", thirtyDaysAgo).Count(&currViews)
	h.db.Model(&models.PageView{}).Where("created_at >= ? AND created_at < ?", sixtyDaysAgo, thirtyDaysAgo).Count(&prevViews)

	var currMembers, prevMembers int64
	h.db.Model(&models.Member{}).Where("created_at >= ?", thirtyDaysAgo).Count(&currMembers)
	h.db.Model(&models.Member{}).Where("created_at >= ? AND created_at < ?", sixtyDaysAgo, thirtyDaysAgo).Count(&prevMembers)

	var avgReadSeconds float64
	h.db.Model(&models.PageView{}).Select("COALESCE(AVG(read_time_seconds), 0)").Scan(&avgReadSeconds)

	c.JSON(http.StatusOK, gin.H{
		"totalViews":   totalViews,
		"viewsTrend":   calcTrend(float64(currViews), float64(prevViews)),
		"published":    publishedCount,
		"drafts":       draftCount,
		"members":      memberCount,
		"membersTrend": calcTrend(float64(currMembers), float64(prevMembers)),
		"avgReadTime":  roundOneDecimal(avgReadSeconds / 60.0),
	})
}

func (h *SettingsHandler) OverviewViews(c *gin.Context) {
	rangeParam := c.DefaultQuery("range", "30d")
	days := 30
	if rangeParam == "7d" {
		days = 7
	} else if rangeParam == "90d" {
		days = 90
	}

	type ViewsPoint struct {
		Date     string `json:"date"`
		Views    int    `json:"views"`
		Visitors int    `json:"visitors"`
	}

	now := time.Now()
	since := now.AddDate(0, 0, -days)
	var pvs []models.PageView
	h.db.Where("created_at >= ?", since).Find(&pvs)

	type dayBucket struct {
		date     string
		views    int
		visitors map[string]struct{}
	}
	buckets := make([]dayBucket, days)
	dateIdx := make(map[string]int, days)
	for i := 0; i < days; i++ {
		t := now.AddDate(0, 0, -(days - 1 - i))
		d := t.Format("2006-01-02")
		buckets[i] = dayBucket{date: d, visitors: make(map[string]struct{})}
		dateIdx[d] = i
	}

	for _, pv := range pvs {
		d := pv.CreatedAt.Format("2006-01-02")
		if idx, ok := dateIdx[d]; ok {
			buckets[idx].views++
			buckets[idx].visitors[pv.VisitorHash] = struct{}{}
		}
	}

	points := make([]ViewsPoint, days)
	for i, b := range buckets {
		points[i] = ViewsPoint{
			Date:     b.date,
			Views:    b.views,
			Visitors: len(b.visitors),
		}
	}

	c.JSON(http.StatusOK, points)
}

func (h *SettingsHandler) OverviewActivity(c *gin.Context) {
	type ActivityItem struct {
		ID   string `json:"id"`
		Type string `json:"type"`
		Text string `json:"text"`
		At   int64  `json:"at"`
	}

	activities := make([]ActivityItem, 0)

	var posts []models.Post
	h.db.Order("updated_at desc").Limit(5).Find(&posts)
	for _, p := range posts {
		actType := "created"
		text := fmt.Sprintf("Created post \"%s\"", p.Title)
		if p.Status == models.PostStatusPublished {
			actType = "published"
			text = fmt.Sprintf("Published post \"%s\"", p.Title)
		} else if p.Status == models.PostStatusScheduled {
			actType = "scheduled"
			text = fmt.Sprintf("Scheduled post \"%s\"", p.Title)
		}
		activities = append(activities, ActivityItem{
			ID:   "post-" + p.ID,
			Type: actType,
			Text: text,
			At:   p.UpdatedAt.UnixMilli(),
		})
	}

	var members []models.Member
	h.db.Order("created_at desc").Limit(3).Find(&members)
	for _, m := range members {
		activities = append(activities, ActivityItem{
			ID:   "member-" + m.ID,
			Type: "member",
			Text: fmt.Sprintf("New subscriber %s", m.Email),
			At:   m.CreatedAt.UnixMilli(),
		})
	}

	sort.Slice(activities, func(i, j int) bool {
		return activities[i].At > activities[j].At
	})
	if len(activities) > 10 {
		activities = activities[:10]
	}

	c.JSON(http.StatusOK, activities)
}

package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/spilecms/spile/api/internal/auth"
	"github.com/spilecms/spile/api/internal/models"
	"github.com/spilecms/spile/api/internal/pagination"
	"github.com/spilecms/spile/api/internal/storage"
	"gorm.io/gorm"
)

type MediaHandler struct {
	db      *gorm.DB
	storage storage.Provider
}

func NewMediaHandler(db *gorm.DB, storageProvider storage.Provider) *MediaHandler {
	return &MediaHandler{
		db:      db,
		storage: storageProvider,
	}
}

type UpdateMediaRequest struct {
	Name    *string   `json:"name"`
	Title   *string   `json:"title"`
	AltText *string   `json:"altText"`
	Caption *string   `json:"caption"`
	Tags    *[]string `json:"tags"`
}

type BulkDeleteRequest struct {
	IDs []string `json:"ids" binding:"required"`
}

func (h *MediaHandler) Upload(c *gin.Context) {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File is required: " + err.Error()})
		return
	}

	maxMB := int64(50)
	if raw := os.Getenv("MAX_UPLOAD_SIZE_MB"); raw != "" {
		if parsed, err := strconv.ParseInt(raw, 10, 64); err == nil && parsed > 0 {
			maxMB = parsed
		}
	}
	if fileHeader.Size > maxMB*1024*1024 {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{
			"error": fmt.Sprintf("File size exceeds maximum allowed limit of %d MB", maxMB),
		})
		return
	}

	currentUser, ok := auth.GetCurrentUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	src, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read uploaded file"})
		return
	}
	defer src.Close()

	// Detect MIME type
	mimeType := fileHeader.Header.Get("Content-Type")
	if mimeType == "" || mimeType == "application/octet-stream" {
		ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
		switch ext {
		case ".png":
			mimeType = "image/png"
		case ".jpg", ".jpeg":
			mimeType = "image/jpeg"
		case ".gif":
			mimeType = "image/gif"
		case ".webp":
			mimeType = "image/webp"
		case ".svg":
			mimeType = "image/svg+xml"
		case ".mp4":
			mimeType = "video/mp4"
		case ".mp3":
			mimeType = "audio/mpeg"
		case ".pdf":
			mimeType = "application/pdf"
		default:
			mimeType = "application/octet-stream"
		}
	}

	fileURL, size, err := h.storage.Save(fileHeader.Filename, src)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to store file: " + err.Error()})
		return
	}

	altText := c.PostForm("altText")
	caption := c.PostForm("caption")
	rawTags := c.PostForm("tags")

	tagList := []string{}
	if rawTags != "" {
		if strings.HasPrefix(rawTags, "[") {
			_ = json.Unmarshal([]byte(rawTags), &tagList)
		} else {
			parts := strings.Split(rawTags, ",")
			for _, p := range parts {
				trimmed := strings.TrimSpace(p)
				if trimmed != "" {
					tagList = append(tagList, trimmed)
				}
			}
		}
	}
	tagsJSON, _ := json.Marshal(tagList)

	ext := filepath.Ext(fileHeader.Filename)
	title := strings.TrimSuffix(fileHeader.Filename, ext)

	mediaItem := models.MediaItem{
		Name:         fileHeader.Filename,
		Title:        title,
		AltText:      altText,
		Caption:      caption,
		MimeType:     mimeType,
		Size:         size,
		URL:          fileURL,
		ThumbnailURL: fileURL,
		UploadedByID: currentUser.ID,
		UploadedBy:   *currentUser,
		TagsJSON:     string(tagsJSON),
	}

	if err := h.db.Create(&mediaItem).Error; err != nil {
		_ = h.storage.Delete(fileURL)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record media: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, mediaItem.ToResponse())
}

func (h *MediaHandler) List(c *gin.Context) {
	mediaType := c.Query("type")
	query := c.Query("query")
	tag := c.Query("tag")
	sortBy := c.Query("sortBy")
	sortOrder := strings.ToLower(c.Query("sortOrder"))

	dbQuery := h.db.Model(&models.MediaItem{}).Preload("UploadedBy")

	if mediaType != "" && mediaType != "all" {
		switch mediaType {
		case "image":
			dbQuery = dbQuery.Where("mime_type LIKE ?", "image/%")
		case "video":
			dbQuery = dbQuery.Where("mime_type LIKE ?", "video/%")
		case "audio":
			dbQuery = dbQuery.Where("mime_type LIKE ?", "audio/%")
		case "document":
			dbQuery = dbQuery.Where("mime_type NOT LIKE ? AND mime_type NOT LIKE ? AND mime_type NOT LIKE ?", "image/%", "video/%", "audio/%")
		}
	}

	if tag != "" && tag != "all" {
		dbQuery = dbQuery.Where("tags_json LIKE ?", "%"+tag+"%")
	}

	if query != "" {
		q := "%" + strings.ToLower(query) + "%"
		dbQuery = dbQuery.Where("LOWER(name) LIKE ? OR LOWER(title) LIKE ? OR LOWER(alt_text) LIKE ?", q, q, q)
	}

	orderClause := "created_at desc"
	if sortBy != "" {
		dir := "desc"
		if sortOrder == "asc" {
			dir = "asc"
		}
		switch sortBy {
		case "name":
			orderClause = "name " + dir
		case "size":
			orderClause = "size " + dir
		default:
			orderClause = "created_at " + dir
		}
	}
	dbQuery = dbQuery.Order(orderClause)

	params := pagination.Parse(c)
	var total int64
	if err := dbQuery.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count media items"})
		return
	}

	var items []models.MediaItem
	if err := params.ApplyToQuery(dbQuery).Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch media items"})
		return
	}

	res := make([]models.MediaItemResponse, len(items))
	for i, it := range items {
		res[i] = it.ToResponse()
	}

	pagination.WriteResponse(c, params, total, res)
}

func (h *MediaHandler) Get(c *gin.Context) {
	id := c.Param("id")
	var item models.MediaItem
	if err := h.db.Preload("UploadedBy").First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Media item not found"})
		return
	}
	c.JSON(http.StatusOK, item.ToResponse())
}

func (h *MediaHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req UpdateMediaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	var item models.MediaItem
	if err := h.db.Preload("UploadedBy").First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Media item not found"})
		return
	}

	if req.Name != nil {
		item.Name = *req.Name
	}
	if req.Title != nil {
		item.Title = *req.Title
	}
	if req.AltText != nil {
		item.AltText = *req.AltText
	}
	if req.Caption != nil {
		item.Caption = *req.Caption
	}
	if req.Tags != nil {
		tagsBytes, _ := json.Marshal(*req.Tags)
		item.TagsJSON = string(tagsBytes)
	}

	if err := h.db.Save(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update media item"})
		return
	}

	c.JSON(http.StatusOK, item.ToResponse())
}

func (h *MediaHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	var item models.MediaItem
	if err := h.db.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Media item not found"})
		return
	}

	_ = h.storage.Delete(item.URL)
	if err := h.db.Delete(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete media record"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Media deleted successfully"})
}

func (h *MediaHandler) BulkDelete(c *gin.Context) {
	var req BulkDeleteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	var items []models.MediaItem
	h.db.Where("id IN ?", req.IDs).Find(&items)
	for _, it := range items {
		_ = h.storage.Delete(it.URL)
		_ = h.db.Delete(&it)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Media items deleted successfully"})
}

func (h *MediaHandler) Stats(c *gin.Context) {
	var items []models.MediaItem
	h.db.Find(&items)

	var totalSize int64
	var imageCount, videoCount, audioCount, documentCount int

	for _, it := range items {
		totalSize += it.Size
		if strings.HasPrefix(it.MimeType, "image/") {
			imageCount++
		} else if strings.HasPrefix(it.MimeType, "video/") {
			videoCount++
		} else if strings.HasPrefix(it.MimeType, "audio/") {
			audioCount++
		} else {
			documentCount++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"totalCount":    len(items),
		"totalSize":     totalSize,
		"imageCount":    imageCount,
		"videoCount":    videoCount,
		"audioCount":    audioCount,
		"documentCount": documentCount,
	})
}

func (h *MediaHandler) Tags(c *gin.Context) {
	var items []models.MediaItem
	h.db.Select("tags_json").Find(&items)

	set := make(map[string]struct{})
	for _, it := range items {
		if it.TagsJSON != "" {
			var tags []string
			if err := json.Unmarshal([]byte(it.TagsJSON), &tags); err == nil {
				for _, t := range tags {
					set[t] = struct{}{}
				}
			}
		}
	}

	result := make([]string, 0, len(set))
	for t := range set {
		result = append(result, t)
	}
	sort.Strings(result)

	c.JSON(http.StatusOK, result)
}

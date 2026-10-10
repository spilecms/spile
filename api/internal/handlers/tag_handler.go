package handlers

import (
	"net/http"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/spilecms/spile/api/internal/models"
	"gorm.io/gorm"
)

type TagHandler struct {
	db *gorm.DB
}

func NewTagHandler(db *gorm.DB) *TagHandler {
	return &TagHandler{db: db}
}

type CreateTagRequest struct {
	Name  string `json:"name" binding:"required"`
	Slug  string `json:"slug"`
	Color string `json:"color"`
}

type UpdateTagRequest struct {
	Name  string `json:"name"`
	Slug  string `json:"slug"`
	Color string `json:"color"`
}

func slugify(text string) string {
	reg := regexp.MustCompile("[^a-zA-Z0-9]+")
	slug := strings.ToLower(reg.ReplaceAllString(text, "-"))
	return strings.Trim(slug, "-")
}

func (h *TagHandler) List(c *gin.Context) {
	var tags []models.Tag
	if err := h.db.Order("name asc").Find(&tags).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tags"})
		return
	}

	res := make([]models.TagResponse, len(tags))
	for i, t := range tags {
		res[i] = t.ToResponse()
	}
	c.JSON(http.StatusOK, res)
}

func (h *TagHandler) Create(c *gin.Context) {
	var req CreateTagRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	slug := req.Slug
	if slug == "" {
		slug = slugify(req.Name)
	}

	color := req.Color
	if color == "" {
		color = "#6366f1"
	}

	tag := models.Tag{
		Name:  strings.TrimSpace(req.Name),
		Slug:  slug,
		Color: color,
	}

	if err := h.db.Create(&tag).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create tag: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, tag.ToResponse())
}

func (h *TagHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req UpdateTagRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	var tag models.Tag
	if err := h.db.First(&tag, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tag not found"})
		return
	}

	if req.Name != "" {
		tag.Name = strings.TrimSpace(req.Name)
	}
	if req.Slug != "" {
		tag.Slug = req.Slug
	}
	if req.Color != "" {
		tag.Color = req.Color
	}

	if err := h.db.Save(&tag).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update tag"})
		return
	}

	c.JSON(http.StatusOK, tag.ToResponse())
}

func (h *TagHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if err := h.db.Delete(&models.Tag{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete tag"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Tag deleted successfully"})
}

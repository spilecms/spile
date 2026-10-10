package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/spilecms/spile/api/internal/models"
	"gorm.io/gorm"
)

type LocaleHandler struct {
	db *gorm.DB
}

func NewLocaleHandler(db *gorm.DB) *LocaleHandler {
	return &LocaleHandler{db: db}
}

type CreateLocaleRequest struct {
	Code      string `json:"code" binding:"required"`
	Name      string `json:"name" binding:"required"`
	Flag      string `json:"flag" binding:"required"`
	Direction string `json:"direction"`
	IsDefault bool   `json:"isDefault"`
}

func (h *LocaleHandler) ensureDefaultLocale() {
	var count int64
	h.db.Model(&models.WorkspaceLocale{}).Count(&count)
	if count == 0 {
		defaultLoc := models.WorkspaceLocale{
			Code:      "en",
			Name:      "English",
			Flag:      "🇬🇧",
			Direction: "ltr",
			IsDefault: true,
		}
		_ = h.db.Create(&defaultLoc).Error
	}
}

func (h *LocaleHandler) List(c *gin.Context) {
	h.ensureDefaultLocale()

	var locales []models.WorkspaceLocale
	if err := h.db.Order("is_default desc, name asc").Find(&locales).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch locales"})
		return
	}

	c.JSON(http.StatusOK, locales)
}

func (h *LocaleHandler) Create(c *gin.Context) {
	var req CreateLocaleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	req.Code = strings.TrimSpace(strings.ToLower(req.Code))
	var count int64
	h.db.Model(&models.WorkspaceLocale{}).Where("code = ?", req.Code).Count(&count)
	if count > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Locale already exists"})
		return
	}

	dir := req.Direction
	if dir == "" {
		dir = "ltr"
	}

	loc := models.WorkspaceLocale{
		Code:      req.Code,
		Name:      strings.TrimSpace(req.Name),
		Flag:      req.Flag,
		Direction: dir,
		IsDefault: req.IsDefault,
	}

	if req.IsDefault {
		// Demote other defaults
		h.db.Model(&models.WorkspaceLocale{}).Where("is_default = ?", true).Update("is_default", false)
	}

	if err := h.db.Create(&loc).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create locale"})
		return
	}

	c.JSON(http.StatusCreated, loc)
}

func (h *LocaleHandler) SetDefault(c *gin.Context) {
	code := strings.ToLower(c.Param("code"))

	var loc models.WorkspaceLocale
	if err := h.db.First(&loc, "code = ?", code).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Locale not found"})
		return
	}

	// Demote all existing defaults
	h.db.Model(&models.WorkspaceLocale{}).Where("1 = 1").Update("is_default", false)

	loc.IsDefault = true
	if err := h.db.Save(&loc).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update default locale"})
		return
	}

	c.JSON(http.StatusOK, loc)
}

func (h *LocaleHandler) Delete(c *gin.Context) {
	code := strings.ToLower(c.Param("code"))

	var loc models.WorkspaceLocale
	if err := h.db.First(&loc, "code = ?", code).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Locale not found"})
		return
	}

	if loc.IsDefault {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete the default workspace locale"})
		return
	}

	if err := h.db.Delete(&loc).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete locale"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Locale deleted successfully"})
}

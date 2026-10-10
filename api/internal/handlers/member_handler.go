package handlers

import (
	"net/http"
	"net/mail"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/spilecms/spile/api/internal/models"
	"gorm.io/gorm"
)

type MemberHandler struct {
	db *gorm.DB
}

func NewMemberHandler(db *gorm.DB) *MemberHandler {
	return &MemberHandler{db: db}
}

type CreateMemberRequest struct {
	Email  string              `json:"email" binding:"required"`
	Name   string              `json:"name"`
	Status models.MemberStatus `json:"status"`
	Locale string              `json:"locale"`
}

type UpdateMemberRequest struct {
	Name   *string              `json:"name"`
	Status *models.MemberStatus `json:"status"`
	Locale *string              `json:"locale"`
}

func (h *MemberHandler) List(c *gin.Context) {
	status := c.Query("status")
	query := c.Query("query")

	dbQuery := h.db.Model(&models.Member{}).Order("subscribed_at desc")
	if status != "" && status != "all" {
		dbQuery = dbQuery.Where("status = ?", status)
	}

	if query != "" {
		q := "%" + strings.ToLower(query) + "%"
		dbQuery = dbQuery.Where("LOWER(email) LIKE ? OR LOWER(name) LIKE ?", q, q)
	}

	var members []models.Member
	if err := dbQuery.Find(&members).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch members"})
		return
	}

	res := make([]models.MemberResponse, len(members))
	for i, m := range members {
		res[i] = m.ToResponse()
	}
	c.JSON(http.StatusOK, res)
}

func (h *MemberHandler) Get(c *gin.Context) {
	id := c.Param("id")
	var m models.Member
	if err := h.db.First(&m, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Member not found"})
		return
	}
	c.JSON(http.StatusOK, m.ToResponse())
}

func (h *MemberHandler) Create(c *gin.Context) {
	var req CreateMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	if _, err := mail.ParseAddress(req.Email); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid email address format"})
		return
	}

	var count int64
	h.db.Model(&models.Member{}).Where("email = ?", req.Email).Count(&count)
	if count > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Member with this email already exists"})
		return
	}

	status := req.Status
	if status == "" {
		status = models.MemberStatusActive
	}

	member := models.Member{
		Email:  req.Email,
		Name:   req.Name,
		Status: status,
		Locale: req.Locale,
	}

	if err := h.db.Create(&member).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create member"})
		return
	}

	c.JSON(http.StatusCreated, member.ToResponse())
}

func (h *MemberHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req UpdateMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	var m models.Member
	if err := h.db.First(&m, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Member not found"})
		return
	}

	if req.Name != nil {
		m.Name = *req.Name
	}
	if req.Status != nil {
		m.Status = *req.Status
	}
	if req.Locale != nil {
		m.Locale = *req.Locale
	}

	if err := h.db.Save(&m).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update member"})
		return
	}

	c.JSON(http.StatusOK, m.ToResponse())
}

func (h *MemberHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if err := h.db.Delete(&models.Member{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete member"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Member deleted successfully"})
}

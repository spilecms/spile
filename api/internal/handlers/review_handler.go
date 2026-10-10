package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/spilecms/spile/api/internal/auth"
	"github.com/spilecms/spile/api/internal/models"
	"gorm.io/gorm"
)

type ReviewHandler struct {
	db *gorm.DB
}

func NewReviewHandler(db *gorm.DB) *ReviewHandler {
	return &ReviewHandler{db: db}
}

type CreateRevisionRequest struct {
	TargetType models.ReviewTargetType `json:"targetType" binding:"required"`
	TargetID   string                  `json:"targetId" binding:"required"`
	Title      string                  `json:"title" binding:"required"`
	Summary    string                  `json:"summary"`
	Content    any                     `json:"content"`
}

type CreateReviewRequestPayload struct {
	TargetType  models.ReviewTargetType `json:"targetType" binding:"required"`
	TargetID    string                  `json:"targetId" binding:"required"`
	TargetTitle string                  `json:"targetTitle" binding:"required"`
	RevisionID  string                  `json:"revisionId" binding:"required"`
	Summary     string                  `json:"summary"`
}

type UpdateReviewStatusRequest struct {
	Status      models.ReviewStatus `json:"status" binding:"required"`
	ReviewNotes string              `json:"reviewNotes"`
}

func (h *ReviewHandler) ListRevisions(c *gin.Context) {
	targetType := c.Query("targetType")
	targetID := c.Query("targetId")

	dbQuery := h.db.Model(&models.ContentRevision{}).Order("version_number desc")
	if targetType != "" {
		dbQuery = dbQuery.Where("target_type = ?", targetType)
	}
	if targetID != "" {
		dbQuery = dbQuery.Where("target_id = ?", targetID)
	}

	var revisions []models.ContentRevision
	if err := dbQuery.Find(&revisions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch revisions"})
		return
	}

	res := make([]models.RevisionResponse, len(revisions))
	for i, r := range revisions {
		res[i] = r.ToResponse()
	}
	c.JSON(http.StatusOK, res)
}

func (h *ReviewHandler) CreateRevision(c *gin.Context) {
	var req CreateRevisionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	currentUser, ok := auth.GetCurrentUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	var count int64
	h.db.Model(&models.ContentRevision{}).
		Where("target_type = ? AND target_id = ?", req.TargetType, req.TargetID).
		Count(&count)

	versionNum := int(count) + 1
	versionLabel := fmt.Sprintf("v%d.0", versionNum)

	var contentStr string
	if req.Content != nil {
		b, _ := json.Marshal(req.Content)
		contentStr = string(b)
	}

	revision := models.ContentRevision{
		TargetType:    req.TargetType,
		TargetID:      req.TargetID,
		VersionNumber: versionNum,
		VersionLabel:  versionLabel,
		Title:         req.Title,
		Summary:       req.Summary,
		Content:       contentStr,
		AuthorID:      currentUser.ID,
		AuthorName:    currentUser.Name,
		Status:        models.RevisionStatusDraft,
	}

	if err := h.db.Create(&revision).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create revision"})
		return
	}

	c.JSON(http.StatusCreated, revision.ToResponse())
}

func (h *ReviewHandler) ListReviewRequests(c *gin.Context) {
	status := c.Query("status")

	dbQuery := h.db.Model(&models.ReviewRequest{}).Order("created_at desc")
	if status != "" && status != "all" {
		dbQuery = dbQuery.Where("status = ?", status)
	}

	var requests []models.ReviewRequest
	if err := dbQuery.Find(&requests).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch review requests"})
		return
	}

	c.JSON(http.StatusOK, requests)
}

func (h *ReviewHandler) CreateReviewRequest(c *gin.Context) {
	var req CreateReviewRequestPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	currentUser, ok := auth.GetCurrentUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	reviewReq := models.ReviewRequest{
		TargetType:  req.TargetType,
		TargetID:    req.TargetID,
		TargetTitle: req.TargetTitle,
		RevisionID:  req.RevisionID,
		AuthorID:    currentUser.ID,
		AuthorName:  currentUser.Name,
		Summary:     req.Summary,
		Status:      models.ReviewStatusInReview,
	}

	if err := h.db.Create(&reviewReq).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to submit review request"})
		return
	}

	// Update revision status to in_review
	h.db.Model(&models.ContentRevision{}).Where("id = ?", req.RevisionID).Update("status", models.RevisionStatusInReview)

	// Create notification for editorial team
	notification := models.Notification{
		Type:       "review_requested",
		Title:      "Review Requested",
		Message:    fmt.Sprintf("%s requested review for \"%s\"", currentUser.Name, req.TargetTitle),
		TargetType: req.TargetType,
		TargetID:   req.TargetID,
		ReviewID:   reviewReq.ID,
	}
	_ = h.db.Create(&notification).Error

	c.JSON(http.StatusCreated, reviewReq)
}

func (h *ReviewHandler) UpdateReviewRequest(c *gin.Context) {
	id := c.Param("id")
	var req UpdateReviewStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	currentUser, ok := auth.GetCurrentUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	var reviewReq models.ReviewRequest
	if err := h.db.First(&reviewReq, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Review request not found"})
		return
	}

	reviewReq.Status = req.Status
	reviewReq.ReviewNotes = req.ReviewNotes
	reviewReq.ReviewerID = currentUser.ID
	reviewReq.ReviewerName = currentUser.Name

	if err := h.db.Save(&reviewReq).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update review request"})
		return
	}

	// Update corresponding revision
	var revStatus models.RevisionStatus
	var notifType string
	switch req.Status {
	case models.ReviewStatusApproved:
		revStatus = models.RevisionStatusApproved
		notifType = "review_approved"
	case models.ReviewStatusChangesRequired:
		revStatus = models.RevisionStatusChangesRequired
		notifType = "changes_requested"
	default:
		revStatus = models.RevisionStatusDraft
		notifType = "review_withdrawn"
	}

	h.db.Model(&models.ContentRevision{}).Where("id = ?", reviewReq.RevisionID).Update("status", revStatus)

	// Create notification for original author
	notification := models.Notification{
		Type:       notifType,
		Title:      fmt.Sprintf("Review %s", string(req.Status)),
		Message:    fmt.Sprintf("Your review request for \"%s\" was %s by %s", reviewReq.TargetTitle, string(req.Status), currentUser.Name),
		TargetType: reviewReq.TargetType,
		TargetID:   reviewReq.TargetID,
		ReviewID:   reviewReq.ID,
		UserID:     reviewReq.AuthorID,
	}
	_ = h.db.Create(&notification).Error

	c.JSON(http.StatusOK, reviewReq)
}

func (h *ReviewHandler) ListNotifications(c *gin.Context) {
	currentUser, ok := auth.GetCurrentUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	var notifications []models.Notification
	h.db.Where("user_id = ? OR user_id = ''", currentUser.ID).
		Order("created_at desc").
		Find(&notifications)

	c.JSON(http.StatusOK, notifications)
}

func (h *ReviewHandler) MarkNotificationRead(c *gin.Context) {
	id := c.Param("id")
	h.db.Model(&models.Notification{}).Where("id = ?", id).Update("read", true)
	c.JSON(http.StatusOK, gin.H{"message": "Notification marked as read"})
}

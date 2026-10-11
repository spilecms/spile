package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/spilecms/spile/api/internal/auth"
	"github.com/spilecms/spile/api/internal/models"
	"github.com/spilecms/spile/api/internal/search"
	"gorm.io/gorm"
)

type ReviewHandler struct {
	db       *gorm.DB
	searcher search.Searcher
}

func NewReviewHandler(db *gorm.DB, searchers ...search.Searcher) *ReviewHandler {
	var s search.Searcher
	if len(searchers) > 0 && searchers[0] != nil {
		s = searchers[0]
	} else {
		s, _ = search.NewSQLiteSearcher(db)
	}
	return &ReviewHandler{db: db, searcher: s}
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
	ReviewerID  string                  `json:"reviewerId"`
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

func (h *ReviewHandler) GetRevision(c *gin.Context) {
	id := c.Param("id")
	var revision models.ContentRevision
	if err := h.db.First(&revision, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Revision not found"})
		return
	}
	c.JSON(http.StatusOK, revision.ToResponse())
}

func (h *ReviewHandler) RestoreRevision(c *gin.Context) {
	id := c.Param("id")
	var revision models.ContentRevision
	if err := h.db.First(&revision, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Revision not found"})
		return
	}

	currentUser, ok := auth.GetCurrentUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	if revision.TargetType == models.ReviewTargetPost {
		var post models.Post
		if err := h.db.First(&post, "id = ?", revision.TargetID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Target post not found"})
			return
		}
		post.Content = revision.Content
		post.Title = revision.Title
		post.UpdatedAt = time.Now()
		_ = h.db.Save(&post).Error
		if h.searcher != nil {
			_ = h.searcher.IndexPost(&post)
		}
	} else if revision.TargetType == models.ReviewTargetDoc {
		var doc models.DocPage
		if err := h.db.First(&doc, "id = ?", revision.TargetID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Target doc page not found"})
			return
		}
		doc.Content = revision.Content
		doc.Title = revision.Title
		doc.UpdatedAt = time.Now()
		_ = h.db.Save(&doc).Error
		if h.searcher != nil {
			_ = h.searcher.IndexDocPage(&doc)
		}
	}

	var maxVersion int
	h.db.Model(&models.ContentRevision{}).
		Where("target_type = ? AND target_id = ?", revision.TargetType, revision.TargetID).
		Select("COALESCE(MAX(version_number), 0)").Scan(&maxVersion)

	newRev := models.ContentRevision{
		TargetType:    revision.TargetType,
		TargetID:      revision.TargetID,
		VersionNumber: maxVersion + 1,
		VersionLabel:  fmt.Sprintf("v%d.0", maxVersion+1),
		Title:         revision.Title,
		Summary:       fmt.Sprintf("Restored from %s", revision.VersionLabel),
		Content:       revision.Content,
		AuthorID:      currentUser.ID,
		AuthorName:    currentUser.Name,
		Status:        models.RevisionStatusDraft,
	}
	_ = h.db.Create(&newRev).Error

	c.JSON(http.StatusOK, newRev.ToResponse())
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

func (h *ReviewHandler) GetReviewRequest(c *gin.Context) {
	id := c.Param("id")
	var reviewReq models.ReviewRequest
	if err := h.db.First(&reviewReq, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Review request not found"})
		return
	}
	c.JSON(http.StatusOK, reviewReq)
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

	var reviewerName string
	if req.ReviewerID != "" {
		var reviewer models.User
		if err := h.db.First(&reviewer, "id = ?", req.ReviewerID).Error; err == nil {
			reviewerName = reviewer.Name
		}
	}

	reviewReq := models.ReviewRequest{
		TargetType:   req.TargetType,
		TargetID:     req.TargetID,
		TargetTitle:  req.TargetTitle,
		RevisionID:   req.RevisionID,
		AuthorID:     currentUser.ID,
		AuthorName:   currentUser.Name,
		ReviewerID:   req.ReviewerID,
		ReviewerName: reviewerName,
		Summary:      req.Summary,
		Status:       models.ReviewStatusInReview,
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
		UserID:     req.ReviewerID,
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

	var rev models.ContentRevision
	_ = h.db.First(&rev, "id = ?", reviewReq.RevisionID).Error

	if req.Status == models.ReviewStatusApproved && rev.ID != "" {
		now := time.Now()
		if reviewReq.TargetType == models.ReviewTargetPost {
			h.db.Model(&models.Post{}).Where("id = ?", reviewReq.TargetID).Updates(map[string]any{
				"content":      rev.Content,
				"title":        rev.Title,
				"status":       models.PostStatusPublished,
				"published_at": &now,
				"updated_at":   now,
			})
			if h.searcher != nil {
				var updatedPost models.Post
				if err := h.db.First(&updatedPost, "id = ?", reviewReq.TargetID).Error; err == nil {
					_ = h.searcher.IndexPost(&updatedPost)
				}
			}
		} else if reviewReq.TargetType == models.ReviewTargetDoc {
			var doc models.DocPage
			if err := h.db.First(&doc, "id = ?", reviewReq.TargetID).Error; err == nil {
				h.db.Model(&models.DocPage{}).Where("id = ?", reviewReq.TargetID).Updates(map[string]any{
					"content":    rev.Content,
					"title":      rev.Title,
					"status":     "published",
					"updated_at": now,
				})
				h.db.Model(&models.DocumentationProject{}).Where("id = ?", doc.ProjectID).Updates(map[string]any{
					"status":     "published",
					"updated_at": now,
				})
				if h.searcher != nil {
					var updatedDoc models.DocPage
					if err := h.db.First(&updatedDoc, "id = ?", reviewReq.TargetID).Error; err == nil {
						_ = h.searcher.IndexDocPage(&updatedDoc)
					}
				}
			}
		}
	}

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

	if req.Status == models.ReviewStatusApproved {
		c.JSON(http.StatusOK, gin.H{
			"review":   reviewReq,
			"revision": rev.ToResponse(),
		})
		return
	}

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

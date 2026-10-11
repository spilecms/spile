package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/spilecms/spile/api/internal/auth"
	"github.com/spilecms/spile/api/internal/models"
	"github.com/spilecms/spile/api/internal/webhook"
	"gorm.io/gorm"
)

type DocHandler struct {
	db *gorm.DB
}

func NewDocHandler(db *gorm.DB) *DocHandler {
	return &DocHandler{db: db}
}

type CreateProjectRequest struct {
	Title       string `json:"title" binding:"required"`
	Description string `json:"description"`
}

type UpdateProjectRequest struct {
	Title       *string `json:"title"`
	Description *string `json:"description"`
	Slug        *string `json:"slug"`
	Status      *string `json:"status"`
}

type CreatePageRequest struct {
	ProjectID string  `json:"projectId" binding:"required"`
	ParentID  *string `json:"parentId"`
	Title     string  `json:"title" binding:"required"`
	Slug      string  `json:"slug"`
	Icon      string  `json:"icon"`
	Content   any     `json:"content"`
	Locale    string  `json:"locale"`
}

type UpdatePageRequest struct {
	Title   *string `json:"title"`
	Slug    *string `json:"slug"`
	Icon    *string `json:"icon"`
	Status  *string `json:"status"`
	Content any     `json:"content"`
}

func (h *DocHandler) syncProjectStatus(projectID string) {
	if projectID == "" {
		return
	}
	var publishedCount int64
	h.db.Model(&models.DocPage{}).
		Where("project_id = ? AND status = ?", projectID, "published").
		Count(&publishedCount)

	newStatus := "draft"
	if publishedCount > 0 {
		newStatus = "published"
	}
	h.db.Model(&models.DocumentationProject{}).
		Where("id = ?", projectID).
		Update("status", newStatus)
}

func (h *DocHandler) buildNavigationTree(projectID, locale string, publishedOnly ...bool) []models.DocTreeItem {
	var pages []models.DocPage
	q := h.db.Where("project_id = ?", projectID)
	if len(publishedOnly) > 0 && publishedOnly[0] {
		q = q.Where("status = ?", "published")
	}
	q.Order("created_at asc").Find(&pages)

	// Filter or map for locale
	pageMap := make(map[string]*models.DocPage)
	for i := range pages {
		pageMap[pages[i].ID] = &pages[i]
	}

	// Group by parent
	childrenMap := make(map[string][]models.DocTreeItem)
	var rootItems []models.DocTreeItem

	for _, p := range pages {
		item := models.DocTreeItem{
			ID:                 p.ID,
			CanonicalID:        p.ID,
			ParentID:           p.ParentID,
			TranslationGroupID: p.TranslationGroupID,
			SourceDocID:        p.ID,
			LocalizedDocID:     p.ID,
			Locale:             p.Locale,
			Title:              p.Title,
			Slug:               p.Slug,
			Icon:               p.Icon,
			Status:             p.Status,
		}

		if p.ParentID == nil || *p.ParentID == "" {
			rootItems = append(rootItems, item)
		} else {
			parentID := *p.ParentID
			childrenMap[parentID] = append(childrenMap[parentID], item)
		}
	}

	var attachChildren func(items []models.DocTreeItem) []models.DocTreeItem
	attachChildren = func(items []models.DocTreeItem) []models.DocTreeItem {
		res := make([]models.DocTreeItem, len(items))
		for i, it := range items {
			if kids, ok := childrenMap[it.ID]; ok && len(kids) > 0 {
				it.Children = attachChildren(kids)
			}
			res[i] = it
		}
		return res
	}

	return attachChildren(rootItems)
}

func (h *DocHandler) ListProjects(c *gin.Context) {
	pubOnly := auth.IsPublicReadKey(c)
	var projects []models.DocumentationProject
	query := h.db.Order("created_at desc")
	if pubOnly {
		query = query.Where("status = ?", "published")
	}
	if err := query.Find(&projects).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch doc projects"})
		return
	}

	res := make([]models.DocProjectResponse, len(projects))
	for i, p := range projects {
		var pageCount int64
		countQ := h.db.Model(&models.DocPage{}).Where("project_id = ?", p.ID)
		if pubOnly {
			countQ = countQ.Where("status = ?", "published")
		}
		countQ.Count(&pageCount)

		items := h.buildNavigationTree(p.ID, "en", pubOnly)
		res[i] = models.DocProjectResponse{
			ID:          p.ID,
			Title:       p.Title,
			Description: p.Description,
			Slug:        p.Slug,
			Status:      p.Status,
			PagesCount:  int(pageCount),
			CreatedAt:   p.CreatedAt.UnixMilli(),
			UpdatedAt:   p.UpdatedAt.UnixMilli(),
			Navigation: models.DocNavigationManifest{
				ID:        p.ID + "-manifest",
				Locale:    "en",
				Items:     items,
				UpdatedAt: p.UpdatedAt.UnixMilli(),
			},
		}
	}

	c.JSON(http.StatusOK, res)
}

func (h *DocHandler) GetProject(c *gin.Context) {
	id := c.Param("id")
	pubOnly := auth.IsPublicReadKey(c)
	var p models.DocumentationProject
	query := h.db.Model(&models.DocumentationProject{})
	if pubOnly {
		query = query.Where("status = ?", "published")
	}
	if err := query.First(&p, "id = ? OR slug = ?", id, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	var pageCount int64
	countQ := h.db.Model(&models.DocPage{}).Where("project_id = ?", p.ID)
	if pubOnly {
		countQ = countQ.Where("status = ?", "published")
	}
	countQ.Count(&pageCount)

	items := h.buildNavigationTree(p.ID, "en", pubOnly)
	res := models.DocProjectResponse{
		ID:          p.ID,
		Title:       p.Title,
		Description: p.Description,
		Slug:        p.Slug,
		Status:      p.Status,
		PagesCount:  int(pageCount),
		CreatedAt:   p.CreatedAt.UnixMilli(),
		UpdatedAt:   p.UpdatedAt.UnixMilli(),
		Navigation: models.DocNavigationManifest{
			ID:        p.ID + "-manifest",
			Locale:    "en",
			Items:     items,
			UpdatedAt: p.UpdatedAt.UnixMilli(),
		},
	}
	c.JSON(http.StatusOK, res)
}

func (h *DocHandler) CreateProject(c *gin.Context) {
	var req CreateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	slug := slugify(req.Title)
	if slug == "" {
		slug = fmt.Sprintf("docs-%d", time.Now().Unix())
	}

	project := models.DocumentationProject{
		Title:       strings.TrimSpace(req.Title),
		Description: req.Description,
		Slug:        slug,
		Status:      "draft",
	}

	if err := h.db.Create(&project).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create documentation project"})
		return
	}

	// Create initial introduction page
	initContent, _ := json.Marshal(map[string]any{
		"time": time.Now().UnixMilli(),
		"blocks": []any{
			map[string]any{"type": "header", "data": map[string]any{"text": "Welcome to " + project.Title, "level": 1}},
			map[string]any{"type": "paragraph", "data": map[string]any{"text": "Start documenting here..."}},
		},
	})

	initPage := models.DocPage{
		ProjectID: project.ID,
		Title:     "Introduction",
		Slug:      "introduction",
		Locale:    "en",
		Status:    "draft",
		Content:   string(initContent),
	}
	_ = h.db.Create(&initPage).Error

	c.JSON(http.StatusCreated, gin.H{
		"project": models.DocProjectResponse{
			ID:          project.ID,
			Title:       project.Title,
			Description: project.Description,
			Slug:        project.Slug,
			Status:      project.Status,
			PagesCount:  1,
			CreatedAt:   project.CreatedAt.UnixMilli(),
			UpdatedAt:   project.UpdatedAt.UnixMilli(),
			Navigation: models.DocNavigationManifest{
				ID:        project.ID + "-manifest",
				Locale:    "en",
				Items:     h.buildNavigationTree(project.ID, "en"),
				UpdatedAt: project.UpdatedAt.UnixMilli(),
			},
		},
		"initialPage": initPage.ToResponse(),
	})
}

func (h *DocHandler) GetPage(c *gin.Context) {
	id := c.Param("id")
	var page models.DocPage
	query := h.db.Model(&models.DocPage{})
	if auth.IsPublicReadKey(c) {
		query = query.Where("status = ?", "published")
	}
	if err := query.First(&page, "id = ? OR slug = ?", id, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Doc page not found"})
		return
	}
	c.JSON(http.StatusOK, page.ToResponse())
}

func (h *DocHandler) CreatePage(c *gin.Context) {
	var req CreatePageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	slug := req.Slug
	if slug == "" {
		slug = slugify(req.Title)
	}

	locale := req.Locale
	if locale == "" {
		locale = "en"
	}

	var contentStr string
	if req.Content != nil {
		b, _ := json.Marshal(req.Content)
		contentStr = string(b)
	}

	page := models.DocPage{
		ProjectID:       req.ProjectID,
		ParentID:        req.ParentID,
		Title:           strings.TrimSpace(req.Title),
		Slug:            slug,
		Icon:            req.Icon,
		Locale:          locale,
		IsDefaultLocale: locale == "en",
		Status:          "draft",
		Content:         contentStr,
	}

	if err := h.db.Create(&page).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create doc page"})
		return
	}

	c.JSON(http.StatusCreated, page.ToResponse())
}

func (h *DocHandler) UpdatePage(c *gin.Context) {
	id := c.Param("id")
	var req UpdatePageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	var page models.DocPage
	if err := h.db.First(&page, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Doc page not found"})
		return
	}

	if req.Title != nil {
		page.Title = *req.Title
	}
	if req.Slug != nil {
		page.Slug = *req.Slug
	}
	if req.Icon != nil {
		page.Icon = *req.Icon
	}
	if req.Status != nil {
		page.Status = *req.Status
	}
	if req.Content != nil {
		b, _ := json.Marshal(req.Content)
		page.Content = string(b)
	}

	if err := h.db.Save(&page).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update doc page"})
		return
	}

	if req.Status != nil {
		h.syncProjectStatus(page.ProjectID)
	}

	resp := page.ToResponse()
	webhook.Dispatch(h.db, "doc.updated", resp)
	c.JSON(http.StatusOK, resp)
}

func (h *DocHandler) UpdateProject(c *gin.Context) {
	id := c.Param("id")
	var req UpdateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	var p models.DocumentationProject
	if err := h.db.First(&p, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	if req.Title != nil {
		p.Title = strings.TrimSpace(*req.Title)
	}
	if req.Description != nil {
		p.Description = *req.Description
	}
	if req.Slug != nil {
		p.Slug = *req.Slug
	}
	if req.Status != nil {
		p.Status = *req.Status
		// Master project toggle cascades status to all pages in this project
		if *req.Status == "published" || *req.Status == "draft" {
			h.db.Model(&models.DocPage{}).
				Where("project_id = ?", p.ID).
				Update("status", *req.Status)
		}
	}

	if err := h.db.Save(&p).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update project"})
		return
	}

	var pageCount int64
	h.db.Model(&models.DocPage{}).Where("project_id = ?", p.ID).Count(&pageCount)

	items := h.buildNavigationTree(p.ID, "en")
	res := models.DocProjectResponse{
		ID:          p.ID,
		Title:       p.Title,
		Description: p.Description,
		Slug:        p.Slug,
		Status:      p.Status,
		PagesCount:  int(pageCount),
		CreatedAt:   p.CreatedAt.UnixMilli(),
		UpdatedAt:   p.UpdatedAt.UnixMilli(),
		Navigation: models.DocNavigationManifest{
			ID:        p.ID + "-manifest",
			Locale:    "en",
			Items:     items,
			UpdatedAt: p.UpdatedAt.UnixMilli(),
		},
	}
	webhook.Dispatch(h.db, "doc.updated", res)
	c.JSON(http.StatusOK, res)
}

func (h *DocHandler) DeletePage(c *gin.Context) {
	id := c.Param("id")
	var page models.DocPage
	_ = h.db.First(&page, "id = ?", id).Error

	if err := h.db.Delete(&models.DocPage{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete doc page"})
		return
	}

	if page.ProjectID != "" {
		h.syncProjectStatus(page.ProjectID)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Doc page deleted successfully"})
}

func (h *DocHandler) DeleteProject(c *gin.Context) {
	id := c.Param("id")
	_ = h.db.Where("project_id = ?", id).Delete(&models.DocPage{}).Error
	if err := h.db.Delete(&models.DocumentationProject{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete project"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Project deleted successfully"})
}

func (h *DocHandler) GetNavigation(c *gin.Context) {
	idOrSlug := c.Param("id")
	locale := c.DefaultQuery("locale", "en")
	pubOnly := auth.IsPublicReadKey(c)

	projectID := idOrSlug
	var proj models.DocumentationProject
	if err := h.db.First(&proj, "id = ? OR slug = ?", idOrSlug, idOrSlug).Error; err == nil {
		projectID = proj.ID
	}

	manifest := models.DocNavigationManifest{
		ID:        projectID + "-manifest",
		Locale:    locale,
		Items:     h.buildNavigationTree(projectID, locale, pubOnly),
		UpdatedAt: time.Now().UnixMilli(),
	}

	c.JSON(http.StatusOK, manifest)
}

type UpdateNavigationRequest struct {
	Items  []models.DocTreeItem `json:"items" binding:"required"`
	Locale string               `json:"locale"`
}

func (h *DocHandler) UpdateNavigation(c *gin.Context) {
	projectID := c.Param("id")
	var req UpdateNavigationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	locale := req.Locale
	if locale == "" {
		locale = "en"
	}

	var walkItems func(items []models.DocTreeItem, parentID *string)
	walkItems = func(items []models.DocTreeItem, parentID *string) {
		for _, it := range items {
			h.db.Model(&models.DocPage{}).
				Where("id = ? AND project_id = ?", it.ID, projectID).
				Update("parent_id", parentID)
			if len(it.Children) > 0 {
				idCopy := it.ID
				walkItems(it.Children, &idCopy)
			}
		}
	}

	walkItems(req.Items, nil)

	manifest := models.DocNavigationManifest{
		ID:        projectID + "-manifest",
		Locale:    locale,
		Items:     h.buildNavigationTree(projectID, locale),
		UpdatedAt: time.Now().UnixMilli(),
	}

	c.JSON(http.StatusOK, manifest)
}

func (h *DocHandler) GetTranslations(c *gin.Context) {
	groupID := c.Param("groupId")
	var pages []models.DocPage
	query := h.db.Where("translation_group_id = ?", groupID)
	if auth.IsPublicReadKey(c) {
		query = query.Where("status = ?", "published")
	}
	if err := query.Find(&pages).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query translations"})
		return
	}
	res := make([]models.DocPageResponse, len(pages))
	for i, p := range pages {
		res[i] = p.ToResponse()
	}
	c.JSON(http.StatusOK, res)
}

type CreateDocTranslationRequest struct {
	Locale      string  `json:"locale" binding:"required"`
	Title       string  `json:"title"`
	Slug        string  `json:"slug"`
	CopyContent bool    `json:"copyContent"`
	ProjectID   *string `json:"projectId"`
}

func (h *DocHandler) CreateTranslation(c *gin.Context) {
	sourceID := c.Param("id")
	var req CreateDocTranslationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	var source models.DocPage
	if err := h.db.First(&source, "id = ?", sourceID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Source doc not found"})
		return
	}

	var existing models.DocPage
	if err := h.db.Where("translation_group_id = ? AND locale = ?", source.TranslationGroupID, req.Locale).First(&existing).Error; err == nil {
		c.JSON(http.StatusOK, existing.ToResponse())
		return
	}

	title := strings.TrimSpace(req.Title)
	if title == "" {
		title = fmt.Sprintf("%s (%s)", source.Title, strings.ToUpper(req.Locale))
	}

	slug := req.Slug
	if slug == "" {
		slug = fmt.Sprintf("%s-%s", source.Slug, req.Locale)
	}

	content := ""
	if req.CopyContent {
		content = source.Content
	}

	projID := source.ProjectID
	if req.ProjectID != nil && *req.ProjectID != "" {
		projID = *req.ProjectID
	}

	newDoc := models.DocPage{
		ProjectID:           projID,
		ParentID:            source.ParentID,
		TranslationGroupID:  source.TranslationGroupID,
		TranslationSourceID: &source.ID,
		Locale:              req.Locale,
		IsDefaultLocale:     false,
		Title:               title,
		Slug:                slug,
		Icon:                source.Icon,
		Status:              "draft",
		Content:             content,
	}

	if err := h.db.Create(&newDoc).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create translated doc"})
		return
	}

	c.JSON(http.StatusCreated, newDoc.ToResponse())
}

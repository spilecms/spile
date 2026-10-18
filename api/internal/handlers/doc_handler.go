package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/spilecms/spile/api/internal/auth"
	"github.com/spilecms/spile/api/internal/models"
	"github.com/spilecms/spile/api/internal/pagination"
	"github.com/spilecms/spile/api/internal/search"
	"github.com/spilecms/spile/api/internal/webhook"
	"gorm.io/gorm"
)

type DocHandler struct {
	db       *gorm.DB
	searcher search.Searcher
	navMu    sync.RWMutex
	navCache map[string][]models.DocTreeItem
}

func (h *DocHandler) invalidateNavCache(projectID string) {
	h.navMu.Lock()
	defer h.navMu.Unlock()
	if projectID == "" {
		h.navCache = make(map[string][]models.DocTreeItem)
		return
	}
	prefix := projectID + ":"
	for k := range h.navCache {
		if strings.HasPrefix(k, prefix) {
			delete(h.navCache, k)
		}
	}
}

func NewDocHandler(db *gorm.DB, searchers ...search.Searcher) *DocHandler {
	var s search.Searcher
	if len(searchers) > 0 && searchers[0] != nil {
		s = searchers[0]
	} else {
		s, _ = search.NewSQLiteSearcher(db)
	}
	return &DocHandler{
		db:       db,
		searcher: s,
		navCache: make(map[string][]models.DocTreeItem),
	}
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

func countTreeItems(items []models.DocTreeItem) int {
	count := 0
	for _, item := range items {
		count++
		if len(item.Children) > 0 {
			count += countTreeItems(item.Children)
		}
	}
	return count
}

func (h *DocHandler) buildNavigationTree(projectID, locale string, publishedOnly ...bool) []models.DocTreeItem {
	if locale == "" {
		locale = "en"
	}

	pubOnly := len(publishedOnly) > 0 && publishedOnly[0]
	cacheKey := projectID + ":" + locale + ":" + strconv.FormatBool(pubOnly)

	h.navMu.RLock()
	if cached, ok := h.navCache[cacheKey]; ok {
		h.navMu.RUnlock()
		return cached
	}
	h.navMu.RUnlock()

	var pages []models.DocPage
	q := h.db.Where("project_id = ?", projectID)
	if pubOnly {
		q = q.Where("status = ?", "published")
	}
	q.Order("created_at asc").Find(&pages)

	// Group pages by translationGroupId so translations are hydrated onto canonical tree nodes
	type groupData struct {
		canonical    *models.DocPage
		translations map[string]*models.DocPage
	}

	groups := make(map[string]*groupData)
	var groupOrder []string
	idToGroup := make(map[string]string)

	for i := range pages {
		p := &pages[i]
		groupID := p.TranslationGroupID
		if groupID == "" {
			groupID = p.ID
		}
		idToGroup[p.ID] = groupID

		g, exists := groups[groupID]
		if !exists {
			g = &groupData{
				translations: make(map[string]*models.DocPage),
			}
			groups[groupID] = g
			groupOrder = append(groupOrder, groupID)
		}

		loc := p.Locale
		if loc == "" {
			loc = "en"
		}
		g.translations[loc] = p

		// Identify canonical page (matches groupID, default locale, or first seen)
		if g.canonical == nil {
			g.canonical = p
		} else if p.ID == groupID {
			g.canonical = p
		} else if (p.Locale == "en" || p.IsDefaultLocale) && g.canonical.ID != groupID {
			g.canonical = p
		}
	}

	childrenMap := make(map[string][]models.DocTreeItem)
	var rootItems []models.DocTreeItem

	for _, groupID := range groupOrder {
		g := groups[groupID]
		canon := g.canonical
		if canon == nil {
			continue
		}

		displayPage := canon
		hasTranslation := false
		isFallback := false
		fallbackLocale := ""

		if locPage, ok := g.translations[locale]; ok {
			displayPage = locPage
			hasTranslation = true
		} else if canon.Locale == locale || (canon.Locale == "" && locale == "en") {
			hasTranslation = true
		} else {
			// Translation missing for requested locale: fall back to canonical
			isFallback = true
			fallbackLocale = canon.Locale
			if fallbackLocale == "" {
				fallbackLocale = "en"
			}
		}

		// Resolve parent ID to canonical page ID if parent belongs to a translation group
		var resolvedParentID *string
		if canon.ParentID != nil && *canon.ParentID != "" {
			rawParent := *canon.ParentID
			if parentGroupID, ok := idToGroup[rawParent]; ok {
				if pg, ok := groups[parentGroupID]; ok && pg.canonical != nil {
					cid := pg.canonical.ID
					resolvedParentID = &cid
				}
			}
			if resolvedParentID == nil {
				resolvedParentID = &rawParent
			}
		}

		item := models.DocTreeItem{
			ID:                 canon.ID,
			CanonicalID:        canon.ID,
			ParentID:           resolvedParentID,
			TranslationGroupID: groupID,
			SourceDocID:        canon.ID,
			LocalizedDocID:     displayPage.ID,
			Locale:             displayPage.Locale,
			Title:              displayPage.Title,
			Slug:               displayPage.Slug,
			Icon:               displayPage.Icon,
			Status:             displayPage.Status,
			HasTranslation:     hasTranslation,
			IsFallback:         isFallback,
			FallbackLocale:     fallbackLocale,
		}

		if resolvedParentID == nil || *resolvedParentID == "" {
			rootItems = append(rootItems, item)
		} else {
			parentID := *resolvedParentID
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

	result := attachChildren(rootItems)

	h.navMu.Lock()
	if h.navCache == nil {
		h.navCache = make(map[string][]models.DocTreeItem)
	}
	h.navCache[cacheKey] = result
	h.navMu.Unlock()

	return result
}

func (h *DocHandler) uniqueProjectSlug(desiredSlug string, excludeID string) string {
	slug := desiredSlug
	if slug == "" {
		slug = fmt.Sprintf("docs-%d", time.Now().Unix())
	}
	baseSlug := slug
	counter := 1
	for {
		var count int64
		q := h.db.Model(&models.DocumentationProject{}).Where("slug = ?", slug)
		if excludeID != "" {
			q = q.Where("id != ?", excludeID)
		}
		q.Count(&count)
		if count == 0 {
			return slug
		}
		counter++
		slug = fmt.Sprintf("%s-%d", baseSlug, counter)
	}
}

func (h *DocHandler) ListProjects(c *gin.Context) {
	pubOnly := auth.IsPublicReadKey(c)
	locale := c.DefaultQuery("locale", "en")
	var projects []models.DocumentationProject
	query := h.db.Model(&models.DocumentationProject{}).Order("created_at desc")
	if pubOnly {
		query = query.Where("status = ?", "published")
	}

	params := pagination.Parse(c)
	var total int64
	if err := query.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count doc projects"})
		return
	}

	if err := params.ApplyToQuery(query).Find(&projects).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch doc projects"})
		return
	}

	res := make([]models.DocProjectResponse, len(projects))
	for i, p := range projects {
		items := h.buildNavigationTree(p.ID, locale, pubOnly)
		res[i] = models.DocProjectResponse{
			ID:          p.ID,
			Title:       p.Title,
			Description: p.Description,
			Slug:        p.Slug,
			Status:      p.Status,
			PagesCount:  countTreeItems(items),
			CreatedAt:   p.CreatedAt.UnixMilli(),
			UpdatedAt:   p.UpdatedAt.UnixMilli(),
			Navigation: models.DocNavigationManifest{
				ID:        p.ID + "-manifest",
				Locale:    locale,
				Items:     items,
				UpdatedAt: p.UpdatedAt.UnixMilli(),
			},
		}
	}

	pagination.WriteResponse(c, params, total, res)
}

func (h *DocHandler) GetProject(c *gin.Context) {
	id := c.Param("id")
	locale := c.DefaultQuery("locale", "en")
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

	items := h.buildNavigationTree(p.ID, locale, pubOnly)
	res := models.DocProjectResponse{
		ID:          p.ID,
		Title:       p.Title,
		Description: p.Description,
		Slug:        p.Slug,
		Status:      p.Status,
		PagesCount:  countTreeItems(items),
		CreatedAt:   p.CreatedAt.UnixMilli(),
		UpdatedAt:   p.UpdatedAt.UnixMilli(),
		Navigation: models.DocNavigationManifest{
			ID:        p.ID + "-manifest",
			Locale:    locale,
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
	slug = h.uniqueProjectSlug(slug, "")

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
		ProjectID:       project.ID,
		Title:           "Introduction",
		Slug:            "introduction",
		Locale:          "en",
		IsDefaultLocale: true,
		Status:          "draft",
		Content:         string(initContent),
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
	locale := strings.TrimSpace(c.Query("locale"))

	var page models.DocPage
	query := h.db.Model(&models.DocPage{})
	if auth.IsPublicReadKey(c) {
		query = query.Where("status = ?", "published")
	}
	if err := query.First(&page, "id = ? OR slug = ?", id, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Doc page not found"})
		return
	}

	// If locale query is provided and differs from the page's current locale, resolve translated variant
	if locale != "" && page.Locale != locale {
		groupID := page.TranslationGroupID
		if groupID == "" {
			groupID = page.ID
		}

		var transPage models.DocPage
		transQuery := h.db.Model(&models.DocPage{})
		if auth.IsPublicReadKey(c) {
			transQuery = transQuery.Where("status = ?", "published")
		}

		if err := transQuery.First(&transPage, "(translation_group_id = ? OR id = ?) AND locale = ?", groupID, groupID, locale).Error; err == nil {
			c.JSON(http.StatusOK, transPage.ToResponse())
			return
		}
		// Graceful fallback to canonical page when translation is missing
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

	// Normalize parentId to canonical parent ID if a translated parent ID was passed
	parentID := req.ParentID
	if parentID != nil && *parentID != "" {
		var parentDoc models.DocPage
		if err := h.db.First(&parentDoc, "id = ?", *parentID).Error; err == nil {
			if parentDoc.TranslationSourceID != nil && *parentDoc.TranslationSourceID != "" {
				parentID = parentDoc.TranslationSourceID
			} else if parentDoc.TranslationGroupID != "" {
				canonID := parentDoc.TranslationGroupID
				parentID = &canonID
			}
		}
	}

	page := models.DocPage{
		ProjectID:       req.ProjectID,
		ParentID:        parentID,
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

	h.invalidateNavCache(req.ProjectID)

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

	h.invalidateNavCache(page.ProjectID)

	if req.Status != nil {
		h.syncProjectStatus(page.ProjectID)
	}
	if h.searcher != nil {
		h.searcher.IndexDocPageAsync(&page)
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
		p.Slug = h.uniqueProjectSlug(*req.Slug, p.ID)
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

	h.invalidateNavCache(p.ID)

	if h.searcher != nil {
		_ = h.searcher.IndexProjectPages(p.ID)
	}

	items := h.buildNavigationTree(p.ID, "en")
	res := models.DocProjectResponse{
		ID:          p.ID,
		Title:       p.Title,
		Description: p.Description,
		Slug:        p.Slug,
		Status:      p.Status,
		PagesCount:  countTreeItems(items),
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
	if err := h.db.First(&page, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Doc page not found"})
		return
	}

	deleteAllLocales := c.Query("delete_all_locales") == "true"
	groupID := page.TranslationGroupID
	if groupID == "" {
		groupID = id
	}

	var err error
	if deleteAllLocales {
		err = h.db.Delete(&models.DocPage{}, "id = ? OR translation_group_id = ?", id, groupID).Error
	} else {
		err = h.db.Delete(&models.DocPage{}, "id = ?", id).Error
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete doc page"})
		return
	}

	h.invalidateNavCache(page.ProjectID)

	if h.searcher != nil {
		h.searcher.DeleteEntityAsync("doc", id)
	}
	if page.ProjectID != "" {
		h.syncProjectStatus(page.ProjectID)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Doc page deleted successfully"})
}

func (h *DocHandler) DeleteProject(c *gin.Context) {
	id := c.Param("id")
	if h.searcher != nil {
		var pages []models.DocPage
		if err := h.db.Select("id").Where("project_id = ?", id).Find(&pages).Error; err == nil {
			for _, pg := range pages {
				h.searcher.DeleteEntityAsync("doc", pg.ID)
			}
		}
	}
	_ = h.db.Where("project_id = ?", id).Delete(&models.DocPage{}).Error
	if err := h.db.Delete(&models.DocumentationProject{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete project"})
		return
	}
	h.invalidateNavCache(id)
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

	// 1. Cycle detection in submitted navigation tree
	hasCycle := false
	var checkCycles func(items []models.DocTreeItem, ancestors map[string]bool)
	checkCycles = func(items []models.DocTreeItem, ancestors map[string]bool) {
		if hasCycle {
			return
		}
		for _, it := range items {
			canonID := it.CanonicalID
			if canonID == "" {
				canonID = it.ID
			}
			if ancestors[canonID] {
				hasCycle = true
				return
			}
			ancestors[canonID] = true
			if len(it.Children) > 0 {
				checkCycles(it.Children, ancestors)
			}
			delete(ancestors, canonID)
		}
	}
	checkCycles(req.Items, make(map[string]bool))
	if hasCycle {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Circular navigation tree hierarchy detected"})
		return
	}

	locale := req.Locale
	if locale == "" {
		locale = "en"
	}

	// 2. Transactional parent_id updates
	tx := h.db.Begin()
	var walkErr error
	var walkItems func(items []models.DocTreeItem, parentID *string)
	walkItems = func(items []models.DocTreeItem, parentID *string) {
		if walkErr != nil {
			return
		}
		for _, it := range items {
			canonID := it.CanonicalID
			if canonID == "" {
				canonID = it.ID
			}
			if err := tx.Model(&models.DocPage{}).
				Where("(id = ? OR translation_group_id = ?) AND project_id = ?", canonID, canonID, projectID).
				Update("parent_id", parentID).Error; err != nil {
				walkErr = err
				return
			}
			if len(it.Children) > 0 {
				idCopy := canonID
				walkItems(it.Children, &idCopy)
			}
		}
	}

	walkItems(req.Items, nil)
	if walkErr != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update navigation: " + walkErr.Error()})
		return
	}
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit navigation update"})
		return
	}

	h.invalidateNavCache(projectID)

	if h.searcher != nil {
		_ = h.searcher.IndexProjectPages(projectID)
	}

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
	query := h.db.Where("translation_group_id = ? OR id = ?", groupID, groupID)
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

	groupID := source.TranslationGroupID
	if groupID == "" {
		groupID = source.ID
		h.db.Model(&source).Update("translation_group_id", groupID)
	}

	var existing models.DocPage
	if err := h.db.Where("(translation_group_id = ? OR id = ?) AND locale = ?", groupID, groupID, req.Locale).First(&existing).Error; err == nil {
		c.JSON(http.StatusOK, existing.ToResponse())
		return
	}

	canonicalSource := source
	if source.TranslationSourceID != nil && *source.TranslationSourceID != "" {
		var canon models.DocPage
		if err := h.db.First(&canon, "id = ?", *source.TranslationSourceID).Error; err == nil {
			canonicalSource = canon
		}
	} else if groupID != source.ID {
		var canon models.DocPage
		if err := h.db.First(&canon, "id = ?", groupID).Error; err == nil {
			canonicalSource = canon
		}
	}

	localeLabel := strings.ToUpper(req.Locale)
	var wsLocale models.WorkspaceLocale
	if err := h.db.First(&wsLocale, "code = ?", req.Locale).Error; err == nil && wsLocale.Name != "" {
		localeLabel = wsLocale.Name
	}

	title := strings.TrimSpace(req.Title)
	if title == "" {
		title = fmt.Sprintf("%s (%s)", canonicalSource.Title, localeLabel)
	}

	slug := req.Slug
	if slug == "" {
		slug = fmt.Sprintf("%s-%s", canonicalSource.Slug, req.Locale)
	}

	content := ""
	if req.CopyContent {
		content = source.Content
	}

	projID := source.ProjectID
	if projID == "" {
		projID = canonicalSource.ProjectID
	}
	if req.ProjectID != nil && *req.ProjectID != "" {
		projID = *req.ProjectID
	}

	parentID := source.ParentID
	if parentID == nil {
		parentID = canonicalSource.ParentID
	}

	canonicalID := canonicalSource.ID

	newDoc := models.DocPage{
		ProjectID:           projID,
		ParentID:            parentID,
		TranslationGroupID:  groupID,
		TranslationSourceID: &canonicalID,
		Locale:              req.Locale,
		IsDefaultLocale:     req.Locale == "en",
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

	h.invalidateNavCache(projID)

	c.JSON(http.StatusCreated, newDoc.ToResponse())
}

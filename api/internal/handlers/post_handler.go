package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/spilecms/spile/api/internal/auth"
	"github.com/spilecms/spile/api/internal/models"
	"gorm.io/gorm"
)

type PostHandler struct {
	db *gorm.DB
}

func NewPostHandler(db *gorm.DB) *PostHandler {
	return &PostHandler{db: db}
}

type CreatePostRequest struct {
	Title               string            `json:"title" binding:"required"`
	Excerpt             string            `json:"excerpt"`
	Status              models.PostStatus `json:"status"`
	Content             any               `json:"content"`
	TagIDs              []string          `json:"tagIds"`
	AuthorIDs           []string          `json:"authorIds"`
	Slug                string            `json:"slug"`
	FeaturedImage       string            `json:"featuredImage"`
	SEO                 models.PostSEO    `json:"seo"`
	ReadingTime         int               `json:"readingTime"`
	Locale              string            `json:"locale"`
	TranslationGroupID  string            `json:"translationGroupId"`
	TranslationSourceID *string           `json:"translationSourceId"`
}

type UpdatePostRequest struct {
	Title               *string            `json:"title"`
	Excerpt             *string            `json:"excerpt"`
	Status              *models.PostStatus `json:"status"`
	Content             any                `json:"content"`
	TagIDs              *[]string          `json:"tagIds"`
	AuthorIDs           *[]string          `json:"authorIds"`
	Slug                *string            `json:"slug"`
	FeaturedImage       *string            `json:"featuredImage"`
	SEO                 *models.PostSEO    `json:"seo"`
	ReadingTime         *int               `json:"readingTime"`
	ScheduledFor        *int64             `json:"scheduledFor"`
	Locale              *string            `json:"locale"`
	TranslationGroupID  *string            `json:"translationGroupId"`
	TranslationSourceID *string            `json:"translationSourceId"`
}

type CreateTranslationRequest struct {
	Locale      string `json:"locale" binding:"required"`
	Title       string `json:"title"`
	CopyContent bool   `json:"copyContent"`
}

func (h *PostHandler) ensureUniqueSlug(desiredSlug string, excludeID string) string {
	slug := desiredSlug
	if slug == "" {
		slug = "post-" + uuid.NewString()[:8]
	}

	var count int64
	query := h.db.Model(&models.Post{}).Where("slug = ?", slug)
	if excludeID != "" {
		query = query.Where("id != ?", excludeID)
	}
	query.Count(&count)

	if count > 0 {
		return fmt.Sprintf("%s-%s", slug, uuid.NewString()[:6])
	}
	return slug
}

func (h *PostHandler) refreshTagCounts() {
	var tags []models.Tag
	h.db.Find(&tags)
	for _, t := range tags {
		var count int64
		h.db.Table("post_tags").Where("tag_id = ?", t.ID).Count(&count)
		h.db.Model(&models.Tag{}).Where("id = ?", t.ID).Update("post_count", int(count))
	}
}

func (h *PostHandler) List(c *gin.Context) {
	status := c.Query("status")
	query := c.Query("query")
	tagID := c.Query("tagId")
	authorID := c.Query("authorId")

	dbQuery := h.db.Model(&models.Post{}).
		Preload("Authors").
		Preload("Tags").
		Order("updated_at desc")

	if status != "" && status != "all" {
		dbQuery = dbQuery.Where("status = ?", status)
	}

	if tagID != "" {
		dbQuery = dbQuery.Joins("JOIN post_tags ON post_tags.post_id = posts.id").
			Where("post_tags.tag_id = ?", tagID)
	}

	if authorID != "" {
		dbQuery = dbQuery.Joins("JOIN post_authors ON post_authors.post_id = posts.id").
			Where("post_authors.user_id = ?", authorID)
	}

	if query != "" {
		q := "%" + strings.ToLower(query) + "%"
		dbQuery = dbQuery.Where("LOWER(title) LIKE ? OR LOWER(excerpt) LIKE ?", q, q)
	}

	var posts []models.Post
	if err := dbQuery.Find(&posts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query posts"})
		return
	}

	res := make([]models.PostResponse, len(posts))
	for i, p := range posts {
		res[i] = p.ToResponse()
	}

	c.JSON(http.StatusOK, res)
}

func (h *PostHandler) Get(c *gin.Context) {
	id := c.Param("id")
	var post models.Post
	if err := h.db.Preload("Authors").Preload("Tags").First(&post, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Post not found"})
		return
	}
	c.JSON(http.StatusOK, post.ToResponse())
}

func (h *PostHandler) Create(c *gin.Context) {
	var req CreatePostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	currentUser, ok := auth.GetCurrentUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	rawSlug := req.Slug
	if rawSlug == "" {
		rawSlug = slugify(req.Title)
	}
	slug := h.ensureUniqueSlug(rawSlug, "")

	var contentStr string
	if req.Content != nil {
		contentBytes, _ := json.Marshal(req.Content)
		contentStr = string(contentBytes)
	}

	status := req.Status
	if status == "" {
		status = models.PostStatusDraft
	}

	var publishedAt *time.Time
	if status == models.PostStatusPublished {
		now := time.Now()
		publishedAt = &now
	}

	postID := uuid.NewString()
	transGroupID := req.TranslationGroupID
	if transGroupID == "" {
		transGroupID = postID
	}

	locale := req.Locale
	if locale == "" {
		locale = "en"
	}

	post := models.Post{
		ID:                  postID,
		Type:                "post",
		Title:               req.Title,
		Excerpt:             req.Excerpt,
		Status:              status,
		Slug:                slug,
		FeaturedImage:       req.FeaturedImage,
		MetaTitle:           req.SEO.MetaTitle,
		MetaDescription:     req.SEO.MetaDescription,
		ReadingTime:         req.ReadingTime,
		PublishedAt:         publishedAt,
		Content:             contentStr,
		Locale:              locale,
		IsDefaultLocale:     locale == "en",
		TranslationGroupID:  transGroupID,
		TranslationSourceID: req.TranslationSourceID,
	}

	// Associate authors
	authorIDs := req.AuthorIDs
	if len(authorIDs) == 0 {
		authorIDs = []string{currentUser.ID}
	}
	var authors []models.User
	h.db.Where("id IN ?", authorIDs).Find(&authors)
	post.Authors = authors

	// Associate tags
	if len(req.TagIDs) > 0 {
		var tags []models.Tag
		h.db.Where("id IN ?", req.TagIDs).Find(&tags)
		post.Tags = tags
	}

	if err := h.db.Create(&post).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create post: " + err.Error()})
		return
	}

	h.refreshTagCounts()

	// Reload with associations
	h.db.Preload("Authors").Preload("Tags").First(&post, "id = ?", post.ID)
	c.JSON(http.StatusCreated, post.ToResponse())
}

func (h *PostHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req UpdatePostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	var post models.Post
	if err := h.db.Preload("Authors").Preload("Tags").First(&post, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Post not found"})
		return
	}

	if req.Title != nil {
		post.Title = *req.Title
	}
	if req.Excerpt != nil {
		post.Excerpt = *req.Excerpt
	}
	if req.Slug != nil && *req.Slug != "" {
		post.Slug = h.ensureUniqueSlug(*req.Slug, post.ID)
	}
	if req.FeaturedImage != nil {
		post.FeaturedImage = *req.FeaturedImage
	}
	if req.SEO != nil {
		post.MetaTitle = req.SEO.MetaTitle
		post.MetaDescription = req.SEO.MetaDescription
	}
	if req.ReadingTime != nil {
		post.ReadingTime = *req.ReadingTime
	}
	if req.Content != nil {
		contentBytes, _ := json.Marshal(req.Content)
		post.Content = string(contentBytes)
	}

	if req.Status != nil {
		nextStatus := *req.Status
		if nextStatus == models.PostStatusPublished && post.Status != models.PostStatusPublished {
			now := time.Now()
			post.PublishedAt = &now
		} else if nextStatus != models.PostStatusPublished {
			post.PublishedAt = nil
		}
		post.Status = nextStatus
	}

	if req.ScheduledFor != nil {
		if *req.ScheduledFor > 0 {
			t := time.UnixMilli(*req.ScheduledFor)
			post.ScheduledFor = &t
		} else {
			post.ScheduledFor = nil
		}
	}

	// Update tags if provided
	if req.TagIDs != nil {
		var newTags []models.Tag
		if len(*req.TagIDs) > 0 {
			h.db.Where("id IN ?", *req.TagIDs).Find(&newTags)
		}
		_ = h.db.Model(&post).Association("Tags").Replace(&newTags)
	}

	// Update authors if provided
	if req.AuthorIDs != nil && len(*req.AuthorIDs) > 0 {
		var newAuthors []models.User
		h.db.Where("id IN ?", *req.AuthorIDs).Find(&newAuthors)
		_ = h.db.Model(&post).Association("Authors").Replace(&newAuthors)
	}

	if err := h.db.Save(&post).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update post"})
		return
	}

	h.refreshTagCounts()

	h.db.Preload("Authors").Preload("Tags").First(&post, "id = ?", post.ID)
	c.JSON(http.StatusOK, post.ToResponse())
}

func (h *PostHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	var post models.Post
	if err := h.db.First(&post, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Post not found"})
		return
	}

	// Clear associations
	_ = h.db.Model(&post).Association("Authors").Clear()
	_ = h.db.Model(&post).Association("Tags").Clear()
	_ = h.db.Delete(&post).Error

	h.refreshTagCounts()
	c.JSON(http.StatusOK, gin.H{"message": "Post deleted successfully"})
}

func (h *PostHandler) Duplicate(c *gin.Context) {
	id := c.Param("id")
	var source models.Post
	if err := h.db.Preload("Authors").Preload("Tags").First(&source, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Post not found"})
		return
	}

	newPost := models.Post{
		ID:                  uuid.NewString(),
		Type:                source.Type,
		Title:               source.Title + " (copy)",
		Excerpt:             source.Excerpt,
		Status:              models.PostStatusDraft,
		Slug:                h.ensureUniqueSlug(source.Slug+"-copy", ""),
		FeaturedImage:       source.FeaturedImage,
		MetaTitle:           source.MetaTitle,
		MetaDescription:     source.MetaDescription,
		Views:               0,
		ReadingTime:         source.ReadingTime,
		Content:             source.Content,
		Locale:              source.Locale,
		IsDefaultLocale:     source.IsDefaultLocale,
		TranslationGroupID:  uuid.NewString(),
		Authors:             source.Authors,
		Tags:                source.Tags,
	}

	if err := h.db.Create(&newPost).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to duplicate post"})
		return
	}

	h.refreshTagCounts()
	c.JSON(http.StatusCreated, newPost.ToResponse())
}

func (h *PostHandler) CreateTranslation(c *gin.Context) {
	sourceID := c.Param("id")
	var req CreateTranslationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	var source models.Post
	if err := h.db.Preload("Authors").Preload("Tags").First(&source, "id = ?", sourceID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Source post not found"})
		return
	}

	groupID := source.TranslationGroupID
	if groupID == "" {
		groupID = source.ID
	}

	// Check if translation in this locale already exists
	var existing models.Post
	if err := h.db.Where("translation_group_id = ? AND locale = ?", groupID, req.Locale).First(&existing).Error; err == nil {
		c.JSON(http.StatusOK, existing.ToResponse())
		return
	}

	title := req.Title
	if title == "" {
		title = fmt.Sprintf("%s (%s)", source.Title, strings.ToUpper(req.Locale))
	}

	content := ""
	if req.CopyContent {
		content = source.Content
	}

	cleanSlug := strings.TrimPrefix(source.Slug, source.Locale+"/")
	transSlug := h.ensureUniqueSlug(fmt.Sprintf("%s/%s", req.Locale, cleanSlug), "")

	transPost := models.Post{
		ID:                  uuid.NewString(),
		Type:                source.Type,
		Title:               title,
		Excerpt:             source.Excerpt,
		Status:              models.PostStatusDraft,
		Slug:                transSlug,
		FeaturedImage:       source.FeaturedImage,
		MetaTitle:           source.MetaTitle,
		MetaDescription:     source.MetaDescription,
		ReadingTime:         source.ReadingTime,
		Content:             content,
		Locale:              req.Locale,
		IsDefaultLocale:     false,
		TranslationGroupID:  groupID,
		TranslationSourceID: &source.ID,
		Authors:             source.Authors,
		Tags:                source.Tags,
	}

	if err := h.db.Create(&transPost).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create translation"})
		return
	}

	h.refreshTagCounts()
	c.JSON(http.StatusCreated, transPost.ToResponse())
}

func (h *PostHandler) GetTranslations(c *gin.Context) {
	groupID := c.Param("groupId")
	var posts []models.Post
	if err := h.db.Preload("Authors").Preload("Tags").
		Where("translation_group_id = ? OR id = ?", groupID, groupID).
		Find(&posts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve translations"})
		return
	}

	res := make([]models.PostResponse, len(posts))
	for i, p := range posts {
		res[i] = p.ToResponse()
	}
	c.JSON(http.StatusOK, res)
}

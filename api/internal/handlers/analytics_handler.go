package handlers

import (
	"math"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/spilecms/spile/api/internal/models"
	"gorm.io/gorm"
)

type AnalyticsHandler struct {
	db *gorm.DB
}

func NewAnalyticsHandler(db *gorm.DB) *AnalyticsHandler {
	return &AnalyticsHandler{db: db}
}

type TrackPageViewRequest struct {
	EntityType      string `json:"entityType" binding:"required"`
	EntityID        string `json:"entityId" binding:"required"`
	VisitorHash     string `json:"visitorHash"`
	CountryCode     string `json:"countryCode"`
	CountryName     string `json:"countryName"`
	Referrer        string `json:"referrer"`
	Device          string `json:"device"`
	ReadTimeSeconds int    `json:"readTimeSeconds"`
	Bounced         bool   `json:"bounced"`
}

type AnalyticsOverviewResponse struct {
	TotalViews         int     `json:"totalViews"`
	ViewsTrend         float64 `json:"viewsTrend"`
	UniqueVisitors     int     `json:"uniqueVisitors"`
	VisitorsTrend      float64 `json:"visitorsTrend"`
	AvgReadTimeSeconds int     `json:"avgReadTimeSeconds"`
	ReadTimeTrend      float64 `json:"readTimeTrend"`
	BounceRate         float64 `json:"bounceRate"`
	BounceRateTrend    float64 `json:"bounceRateTrend"`
}

type TimeSeriesPoint struct {
	Date     string `json:"date"`
	Views    int    `json:"views"`
	Visitors int    `json:"visitors"`
}

type DocPageAnalyticsItem struct {
	PageID             string  `json:"pageId"`
	PageTitle          string  `json:"pageTitle"`
	ProjectID          string  `json:"projectId"`
	ProjectName        string  `json:"projectName"`
	Slug               string  `json:"slug"`
	Locale             string  `json:"locale"`
	Views              int     `json:"views"`
	UniqueVisitors     int     `json:"uniqueVisitors"`
	AvgReadTimeSeconds int     `json:"avgReadTimeSeconds"`
	BounceRate         float64 `json:"bounceRate"`
	LastVisitedAt      int64   `json:"lastVisitedAt"`
}

type PostAnalyticsItem struct {
	PostID             string  `json:"postId"`
	Title              string  `json:"title"`
	Slug               string  `json:"slug"`
	Views              int     `json:"views"`
	UniqueVisitors     int     `json:"uniqueVisitors"`
	AvgReadTimeSeconds int     `json:"avgReadTimeSeconds"`
	BounceRate         float64 `json:"bounceRate"`
	LastVisitedAt      int64   `json:"lastVisitedAt"`
}

type CountryTrafficItem struct {
	CountryCode string  `json:"countryCode"`
	CountryName string  `json:"countryName"`
	Views       int     `json:"views"`
	Visitors    int     `json:"visitors"`
	Percentage  float64 `json:"percentage"`
}

type ReferrerSourceItem struct {
	Source     string  `json:"source"`
	Visitors   int     `json:"visitors"`
	Percentage float64 `json:"percentage"`
}

type DeviceDistributionResponse struct {
	Desktop float64 `json:"desktop"`
	Mobile  float64 `json:"mobile"`
	Tablet  float64 `json:"tablet"`
}

func parseRangeDays(timeRange string) int {
	switch timeRange {
	case "24h":
		return 1
	case "7d":
		return 7
	case "90d":
		return 90
	case "1y":
		return 365
	default:
		return 30
	}
}

func roundOneDecimal(val float64) float64 {
	return math.Round(val*10) / 10
}

func calcTrend(current, previous float64) float64 {
	if previous == 0 {
		if current > 0 {
			return 100.0
		}
		return 0.0
	}
	return roundOneDecimal(((current - previous) / previous) * 100.0)
}

// Track records a pageview from a headless frontend client
func (h *AnalyticsHandler) Track(c *gin.Context) {
	var req TrackPageViewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	device := strings.ToLower(strings.TrimSpace(req.Device))
	if device == "" {
		ua := strings.ToLower(c.GetHeader("User-Agent"))
		if strings.Contains(ua, "ipad") || strings.Contains(ua, "tablet") {
			device = "tablet"
		} else if strings.Contains(ua, "mobile") || strings.Contains(ua, "android") || strings.Contains(ua, "iphone") {
			device = "mobile"
		} else {
			device = "desktop"
		}
	} else if device != "mobile" && device != "tablet" {
		device = "desktop"
	}

	countryCode := strings.ToUpper(strings.TrimSpace(req.CountryCode))
	if countryCode == "" {
		countryCode = strings.ToUpper(strings.TrimSpace(c.GetHeader("CF-IPCountry")))
		if countryCode == "" {
			countryCode = "UN"
		}
	}

	countryName := strings.TrimSpace(req.CountryName)
	if countryName == "" {
		countryName = "Unknown"
	}

	referrer := strings.TrimSpace(req.Referrer)
	if referrer == "" {
		referrer = strings.TrimSpace(c.GetHeader("Referer"))
		if referrer == "" {
			referrer = "Direct / Bookmark"
		}
	}

	readTime := req.ReadTimeSeconds
	if readTime < 0 {
		readTime = 0
	}

	visitorHash := strings.TrimSpace(req.VisitorHash)
	if visitorHash == "" {
		visitorHash = strings.TrimSpace(c.GetHeader("X-Forwarded-For"))
		if visitorHash != "" {
			if comma := strings.Index(visitorHash, ","); comma != -1 {
				visitorHash = strings.TrimSpace(visitorHash[:comma])
			}
		}
		if visitorHash == "" {
			visitorHash = strings.TrimSpace(c.GetHeader("X-Real-IP"))
		}
		if visitorHash == "" {
			visitorHash = c.ClientIP()
		}
	}

	pv := models.PageView{
		EntityType:      req.EntityType,
		EntityID:        req.EntityID,
		VisitorHash:     visitorHash,
		CountryCode:     countryCode,
		CountryName:     countryName,
		Referrer:        referrer,
		Device:          device,
		ReadTimeSeconds: readTime,
		Bounced:         req.Bounced,
	}

	if err := h.db.Create(&pv).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record pageview"})
		return
	}

	if req.EntityType == "post" {
		h.db.Model(&models.Post{}).Where("id = ?", req.EntityID).
			UpdateColumn("views", gorm.Expr("views + 1"))
	}

	c.JSON(http.StatusCreated, gin.H{"recorded": true, "id": pv.ID})
}

func summarizePageViews(pvs []models.PageView) (views int, uniqueVisitors int, avgRead int, bounceRate float64) {
	views = len(pvs)
	if views == 0 {
		return 0, 0, 0, 0
	}
	visitors := make(map[string]struct{})
	totalRead := 0
	bounced := 0
	for _, pv := range pvs {
		visitors[pv.VisitorHash] = struct{}{}
		totalRead += pv.ReadTimeSeconds
		if pv.Bounced {
			bounced++
		}
	}
	uniqueVisitors = len(visitors)
	avgRead = totalRead / views
	bounceRate = roundOneDecimal((float64(bounced) / float64(views)) * 100.0)
	return
}

func (h *AnalyticsHandler) fetchPageViews(entityType, entityID string, from, to time.Time) []models.PageView {
	query := h.db.Model(&models.PageView{}).Where("created_at >= ? AND created_at <= ?", from, to)
	if entityType != "" && entityID != "" {
		query = query.Where("entity_type = ? AND entity_id = ?", entityType, entityID)
	}
	var pvs []models.PageView
	query.Find(&pvs)
	return pvs
}

func (h *AnalyticsHandler) computeOverview(entityType, entityID string, days int) AnalyticsOverviewResponse {
	now := time.Now()
	currentStart := now.AddDate(0, 0, -days)
	prevStart := currentStart.AddDate(0, 0, -days)

	currPVs := h.fetchPageViews(entityType, entityID, currentStart, now)
	prevPVs := h.fetchPageViews(entityType, entityID, prevStart, currentStart)

	currViews, currVisitors, currRead, currBounce := summarizePageViews(currPVs)
	prevViews, prevVisitors, prevRead, prevBounce := summarizePageViews(prevPVs)

	return AnalyticsOverviewResponse{
		TotalViews:         currViews,
		ViewsTrend:         calcTrend(float64(currViews), float64(prevViews)),
		UniqueVisitors:     currVisitors,
		VisitorsTrend:      calcTrend(float64(currVisitors), float64(prevVisitors)),
		AvgReadTimeSeconds: currRead,
		ReadTimeTrend:      calcTrend(float64(currRead), float64(prevRead)),
		BounceRate:         currBounce,
		BounceRateTrend:    roundOneDecimal(currBounce - prevBounce),
	}
}

func (h *AnalyticsHandler) GetOverview(c *gin.Context) {
	days := parseRangeDays(c.DefaultQuery("timeRange", "30d"))
	c.JSON(http.StatusOK, h.computeOverview("", "", days))
}

func (h *AnalyticsHandler) computeTimeSeries(entityType, entityID string, timeRange string) []TimeSeriesPoint {
	now := time.Now()
	days := parseRangeDays(timeRange)
	since := now.AddDate(0, 0, -days)
	if timeRange == "24h" {
		since = now.Add(-24 * time.Hour)
	}

	pvs := h.fetchPageViews(entityType, entityID, since, now)

	pointsCount := days
	if timeRange == "24h" {
		pointsCount = 24
	} else if timeRange == "1y" {
		pointsCount = 12
	}

	type bucket struct {
		label    string
		views    int
		visitors map[string]struct{}
	}

	buckets := make([]bucket, pointsCount)
	keyToIdx := make(map[string]int, pointsCount)

	for i := 0; i < pointsCount; i++ {
		var label, key string
		if timeRange == "24h" {
			t := now.Add(time.Duration(-(pointsCount - 1 - i)) * time.Hour)
			label = t.Format("15:00")
			key = t.Format("2006-01-02 15")
		} else if timeRange == "1y" {
			t := now.AddDate(0, -(pointsCount - 1 - i), 0)
			label = t.Format("Jan 2006")
			key = t.Format("2006-01")
		} else {
			t := now.AddDate(0, 0, -(pointsCount - 1 - i))
			label = t.Format("Jan 2")
			key = t.Format("2006-01-02")
		}
		buckets[i] = bucket{label: label, visitors: make(map[string]struct{})}
		keyToIdx[key] = i
	}

	for _, pv := range pvs {
		var key string
		if timeRange == "24h" {
			key = pv.CreatedAt.Format("2006-01-02 15")
		} else if timeRange == "1y" {
			key = pv.CreatedAt.Format("2006-01")
		} else {
			key = pv.CreatedAt.Format("2006-01-02")
		}
		if idx, ok := keyToIdx[key]; ok {
			buckets[idx].views++
			buckets[idx].visitors[pv.VisitorHash] = struct{}{}
		}
	}

	points := make([]TimeSeriesPoint, pointsCount)
	for i, b := range buckets {
		points[i] = TimeSeriesPoint{
			Date:     b.label,
			Views:    b.views,
			Visitors: len(b.visitors),
		}
	}
	return points
}

func (h *AnalyticsHandler) GetTimeSeries(c *gin.Context) {
	timeRange := c.DefaultQuery("timeRange", "30d")
	c.JSON(http.StatusOK, h.computeTimeSeries("", "", timeRange))
}

func (h *AnalyticsHandler) GetDocPages(c *gin.Context) {
	var pages []models.DocPage
	h.db.Order("updated_at desc").Find(&pages)

	projects := make(map[string]string)
	var projList []models.DocumentationProject
	h.db.Find(&projList)
	for _, p := range projList {
		projects[p.ID] = p.Title
	}

	// Single aggregated query for all doc pageviews to eliminate N+1 database queries
	var allPvs []models.PageView
	h.db.Where("entity_type = ?", "doc").
		Order("created_at desc").
		Find(&allPvs)

	pvsByEntity := make(map[string][]models.PageView, len(pages))
	for _, pv := range allPvs {
		pvsByEntity[pv.EntityID] = append(pvsByEntity[pv.EntityID], pv)
	}

	res := make([]DocPageAnalyticsItem, 0, len(pages))
	for _, page := range pages {
		pvs := pvsByEntity[page.ID]

		views, visitors, avgRead, bounceRate := summarizePageViews(pvs)
		var lastVisited int64
		if len(pvs) > 0 {
			lastVisited = pvs[0].CreatedAt.UnixMilli()
		}

		res = append(res, DocPageAnalyticsItem{
			PageID:             page.ID,
			PageTitle:          page.Title,
			ProjectID:          page.ProjectID,
			ProjectName:        projects[page.ProjectID],
			Slug:               "/docs/" + page.Slug,
			Locale:             page.Locale,
			Views:              views,
			UniqueVisitors:     visitors,
			AvgReadTimeSeconds: avgRead,
			BounceRate:         bounceRate,
			LastVisitedAt:      lastVisited,
		})
	}

	sort.Slice(res, func(i, j int) bool {
		return res[i].Views > res[j].Views
	})
	c.JSON(http.StatusOK, res)
}

func (h *AnalyticsHandler) GetPosts(c *gin.Context) {
	var posts []models.Post
	h.db.Order("views desc, updated_at desc").Find(&posts)

	// Single aggregated query for all post pageviews to eliminate N+1 database queries
	var allPvs []models.PageView
	h.db.Where("entity_type = ?", "post").
		Order("created_at desc").
		Find(&allPvs)

	pvsByEntity := make(map[string][]models.PageView, len(posts))
	for _, pv := range allPvs {
		pvsByEntity[pv.EntityID] = append(pvsByEntity[pv.EntityID], pv)
	}

	res := make([]PostAnalyticsItem, 0, len(posts))
	for _, post := range posts {
		pvs := pvsByEntity[post.ID]

		views, visitors, avgRead, bounceRate := summarizePageViews(pvs)
		var lastVisited int64
		if len(pvs) > 0 {
			lastVisited = pvs[0].CreatedAt.UnixMilli()
		}

		res = append(res, PostAnalyticsItem{
			PostID:             post.ID,
			Title:              post.Title,
			Slug:               "/posts/" + post.Slug,
			Views:              views,
			UniqueVisitors:     visitors,
			AvgReadTimeSeconds: avgRead,
			BounceRate:         bounceRate,
			LastVisitedAt:      lastVisited,
		})
	}

	sort.Slice(res, func(i, j int) bool {
		return res[i].Views > res[j].Views
	})
	c.JSON(http.StatusOK, res)
}

func (h *AnalyticsHandler) computeCountries(entityType, entityID string, days int) []CountryTrafficItem {
	now := time.Now()
	pvs := h.fetchPageViews(entityType, entityID, now.AddDate(0, 0, -days), now)
	if len(pvs) == 0 {
		return []CountryTrafficItem{}
	}

	type agg struct {
		code     string
		name     string
		views    int
		visitors map[string]struct{}
	}
	byCountry := make(map[string]*agg)
	for _, pv := range pvs {
		code := pv.CountryCode
		if code == "" {
			code = "UN"
		}
		item, ok := byCountry[code]
		if !ok {
			name := pv.CountryName
			if name == "" {
				name = code
			}
			item = &agg{code: code, name: name, visitors: make(map[string]struct{})}
			byCountry[code] = item
		}
		item.views++
		item.visitors[pv.VisitorHash] = struct{}{}
	}

	totalViews := len(pvs)
	res := make([]CountryTrafficItem, 0, len(byCountry))
	for _, c := range byCountry {
		res = append(res, CountryTrafficItem{
			CountryCode: c.code,
			CountryName: c.name,
			Views:       c.views,
			Visitors:    len(c.visitors),
			Percentage:  roundOneDecimal((float64(c.views) / float64(totalViews)) * 100.0),
		})
	}
	sort.Slice(res, func(i, j int) bool {
		return res[i].Views > res[j].Views
	})
	return res
}

func (h *AnalyticsHandler) computeReferrers(entityType, entityID string, days int) []ReferrerSourceItem {
	now := time.Now()
	pvs := h.fetchPageViews(entityType, entityID, now.AddDate(0, 0, -days), now)
	if len(pvs) == 0 {
		return []ReferrerSourceItem{}
	}

	byRef := make(map[string]map[string]struct{})
	for _, pv := range pvs {
		ref := pv.Referrer
		if ref == "" {
			ref = "Direct / Bookmark"
		}
		if _, ok := byRef[ref]; !ok {
			byRef[ref] = make(map[string]struct{})
		}
		byRef[ref][pv.VisitorHash] = struct{}{}
	}

	totalVisitorRefs := 0
	for _, vset := range byRef {
		totalVisitorRefs += len(vset)
	}
	if totalVisitorRefs == 0 {
		totalVisitorRefs = 1
	}

	res := make([]ReferrerSourceItem, 0, len(byRef))
	for src, vset := range byRef {
		cnt := len(vset)
		res = append(res, ReferrerSourceItem{
			Source:     src,
			Visitors:   cnt,
			Percentage: roundOneDecimal((float64(cnt) / float64(totalVisitorRefs)) * 100.0),
		})
	}
	sort.Slice(res, func(i, j int) bool {
		return res[i].Visitors > res[j].Visitors
	})
	return res
}

func (h *AnalyticsHandler) computeDevices(entityType, entityID string, days int) DeviceDistributionResponse {
	now := time.Now()
	pvs := h.fetchPageViews(entityType, entityID, now.AddDate(0, 0, -days), now)
	if len(pvs) == 0 {
		return DeviceDistributionResponse{Desktop: 0, Mobile: 0, Tablet: 0}
	}

	var desktop, mobile, tablet int
	for _, pv := range pvs {
		switch pv.Device {
		case "mobile":
			mobile++
		case "tablet":
			tablet++
		default:
			desktop++
		}
	}
	total := float64(len(pvs))
	return DeviceDistributionResponse{
		Desktop: roundOneDecimal((float64(desktop) / total) * 100.0),
		Mobile:  roundOneDecimal((float64(mobile) / total) * 100.0),
		Tablet:  roundOneDecimal((float64(tablet) / total) * 100.0),
	}
}

func (h *AnalyticsHandler) GetCountries(c *gin.Context) {
	days := parseRangeDays(c.DefaultQuery("timeRange", "30d"))
	c.JSON(http.StatusOK, h.computeCountries("", "", days))
}

func (h *AnalyticsHandler) GetReferrers(c *gin.Context) {
	days := parseRangeDays(c.DefaultQuery("timeRange", "30d"))
	c.JSON(http.StatusOK, h.computeReferrers("", "", days))
}

func (h *AnalyticsHandler) GetDevices(c *gin.Context) {
	days := parseRangeDays(c.DefaultQuery("timeRange", "30d"))
	c.JSON(http.StatusOK, h.computeDevices("", "", days))
}

func (h *AnalyticsHandler) GetEntityDetail(c *gin.Context) {
	entityType := c.Param("type")
	entityID := c.Param("id")
	timeRange := c.DefaultQuery("timeRange", "30d")
	days := parseRangeDays(timeRange)

	title := "Untitled"
	slug := "/"
	locale := "en"
	status := "published"
	projectID := ""
	projectName := ""

	if entityType == "post" {
		var post models.Post
		if err := h.db.First(&post, "id = ?", entityID).Error; err == nil {
			title = post.Title
			slug = "/posts/" + post.Slug
			locale = post.Locale
			status = string(post.Status)
		}
	} else {
		var doc models.DocPage
		if err := h.db.First(&doc, "id = ?", entityID).Error; err == nil {
			title = doc.Title
			slug = "/docs/" + doc.Slug
			locale = doc.Locale
			status = doc.Status
			projectID = doc.ProjectID
			var proj models.DocumentationProject
			if err := h.db.First(&proj, "id = ?", doc.ProjectID).Error; err == nil {
				projectName = proj.Title
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"entityId":    entityID,
		"entityType":  entityType,
		"title":       title,
		"slug":        slug,
		"locale":      locale,
		"projectId":   projectID,
		"projectName": projectName,
		"status":      status,
		"overview":    h.computeOverview(entityType, entityID, days),
		"timeSeries":  h.computeTimeSeries(entityType, entityID, timeRange),
		"countries":   h.computeCountries(entityType, entityID, days),
		"referrers":   h.computeReferrers(entityType, entityID, days),
		"devices":     h.computeDevices(entityType, entityID, days),
	})
}

package search

import (
	"crypto/sha1"
	"encoding/hex"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"
	"unicode"

	"github.com/spilecms/spile/api/internal/models"
	"gorm.io/gorm"
)

const (
	clientIndexMaxBodyChars = 300
	searchSnippetMaxChars   = 180
)

// SearchParams defines filters and query options for Searcher.Search.
type SearchParams struct {
	Query      string
	EntityType string // "" / "all" | "doc" / "docs" | "post" / "posts"
	ProjectID  string // Project ID or Project Slug
	Locale     string // e.g., "en"
	Limit      int
}

// Searcher abstracts the full-text search engine (SQLite FTS5 or Postgres tsvector/pg_trgm).
type Searcher interface {
	EnsureSchema() error
	IndexDocPage(page *models.DocPage) error
	IndexPost(post *models.Post) error
	IndexProjectPages(projectID string) error
	DeleteEntity(entityType, entityID string) error
	SyncAllPublished() error
	Search(params SearchParams) (*models.SearchResponse, error)
	GetProjectSearchIndex(projectIDOrSlug, locale string) (*models.ClientSearchIndexResponse, string, error)
}

// SQLiteSearcher implements Searcher using SQLite FTS5 with bm25 per-column weights and custom tokenchars '-_'.
type SQLiteSearcher struct {
	db      *gorm.DB
	hasFTS5 bool
}

// NewSQLiteSearcher initializes a SQLite FTS5-backed Searcher and ensures the FTS virtual table exists.
func NewSQLiteSearcher(db *gorm.DB) (*SQLiteSearcher, error) {
	s := &SQLiteSearcher{db: db}
	if err := s.EnsureSchema(); err != nil {
		return nil, err
	}
	return s, nil
}

// EnsureSchema creates the FTS5 virtual table with tokenchars '-_' so identifiers like X-Spile-Signature and pk_live stay intact.
func (s *SQLiteSearcher) EnsureSchema() error {
	createFTS := `
	CREATE VIRTUAL TABLE IF NOT EXISTS search_sections_fts USING fts5(
		section_id UNINDEXED,
		page_title,
		section_title,
		param_names,
		body_text,
		code_text,
		tokenize = "unicode61 tokenchars '-_'"
	);`
	if err := s.db.Exec(createFTS).Error; err != nil {
		// Fallback gracefully if an environment lacks FTS5
		s.hasFTS5 = false
		return nil
	}
	s.hasFTS5 = true
	return nil
}

// DeleteEntity removes all indexed sections for a doc page or post from both search_sections and search_sections_fts.
func (s *SQLiteSearcher) DeleteEntity(entityType, entityID string) error {
	if entityID == "" {
		return nil
	}
	return s.db.Transaction(func(tx *gorm.DB) error {
		if s.hasFTS5 {
			subQuery := `DELETE FROM search_sections_fts WHERE section_id IN (SELECT id FROM search_sections WHERE entity_type = ? AND entity_id = ?)`
			if err := tx.Exec(subQuery, entityType, entityID).Error; err != nil {
				return err
			}
		}
		return tx.Where("entity_type = ? AND entity_id = ?", entityType, entityID).
			Delete(&models.SearchSection{}).Error
	})
}

func (s *SQLiteSearcher) replaceEntitySections(entityType, entityID string, sections []models.SearchSection) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		if s.hasFTS5 {
			delFTS := `DELETE FROM search_sections_fts WHERE section_id IN (SELECT id FROM search_sections WHERE entity_type = ? AND entity_id = ?)`
			if err := tx.Exec(delFTS, entityType, entityID).Error; err != nil {
				return err
			}
		}
		if err := tx.Where("entity_type = ? AND entity_id = ?", entityType, entityID).
			Delete(&models.SearchSection{}).Error; err != nil {
			return err
		}

		for i := range sections {
			sec := &sections[i]
			if err := tx.Create(sec).Error; err != nil {
				return err
			}
			if s.hasFTS5 {
				insFTS := `INSERT INTO search_sections_fts (section_id, page_title, section_title, param_names, body_text, code_text) VALUES (?, ?, ?, ?, ?, ?)`
				if err := tx.Exec(insFTS, sec.ID, sec.PageTitle, sec.SectionTitle, sec.ParamNames, sec.BodyText, sec.CodeText).Error; err != nil {
					return err
				}
			}
		}
		return nil
	})
}

// buildDocPageTreePath walks up ParentID to construct [ProjectTitle, ...AncestorPageTitles, PageTitle].
func (s *SQLiteSearcher) buildDocPageTreePath(page *models.DocPage, projectTitle string) []string {
	var chain []string
	if strings.TrimSpace(page.Title) != "" {
		chain = append(chain, strings.TrimSpace(page.Title))
	}

	visited := map[string]bool{page.ID: true}
	currParentID := page.ParentID
	for currParentID != nil && *currParentID != "" && !visited[*currParentID] {
		visited[*currParentID] = true
		var parent models.DocPage
		if err := s.db.Select("id, parent_id, title").First(&parent, "id = ?", *currParentID).Error; err != nil {
			break
		}
		if strings.TrimSpace(parent.Title) != "" {
			chain = append([]string{strings.TrimSpace(parent.Title)}, chain...)
		}
		currParentID = parent.ParentID
	}

	if strings.TrimSpace(projectTitle) != "" {
		chain = append([]string{strings.TrimSpace(projectTitle)}, chain...)
	}
	return chain
}

// IndexDocPage chunks and indexes a DocPage if and only if its status is "published".
// If the page is draft or unpublished, any existing rows for it are deleted.
func (s *SQLiteSearcher) IndexDocPage(page *models.DocPage) error {
	if page == nil || page.ID == "" {
		return nil
	}
	if page.Status != "published" {
		return s.DeleteEntity("doc", page.ID)
	}

	var proj models.DocumentationProject
	if page.ProjectID != "" {
		_ = s.db.First(&proj, "id = ?", page.ProjectID).Error
	}

	treePath := s.buildDocPageTreePath(page, proj.Title)
	sections := ChunkEditorContent(ChunkInput{
		EntityID:     page.ID,
		EntityType:   "doc",
		ProjectID:    page.ProjectID,
		ProjectSlug:  proj.Slug,
		ProjectTitle: proj.Title,
		Locale:       page.Locale,
		PageTitle:    page.Title,
		PageSlug:     page.Slug,
		PageTreePath: treePath,
		ContentJSON:  page.Content,
		UpdatedAt:    page.UpdatedAt,
	})

	return s.replaceEntitySections("doc", page.ID, sections)
}

// IndexProjectPages re-indexes all pages belonging to a DocumentationProject (used after bulk publish/unpublish).
func (s *SQLiteSearcher) IndexProjectPages(projectID string) error {
	if projectID == "" {
		return nil
	}
	var pages []models.DocPage
	if err := s.db.Where("project_id = ?", projectID).Find(&pages).Error; err != nil {
		return err
	}
	for i := range pages {
		if err := s.IndexDocPage(&pages[i]); err != nil {
			return err
		}
	}
	return nil
}

// IndexPost chunks and indexes a Post if and only if its status is "published".
// If the post is draft, in_review, or scheduled, any existing rows for it are deleted.
func (s *SQLiteSearcher) IndexPost(post *models.Post) error {
	if post == nil || post.ID == "" {
		return nil
	}
	if post.Status != models.PostStatusPublished {
		return s.DeleteEntity("post", post.ID)
	}

	sections := ChunkEditorContent(ChunkInput{
		EntityID:     post.ID,
		EntityType:   "post",
		Locale:       post.Locale,
		PageTitle:    post.Title,
		PageSlug:     post.Slug,
		Excerpt:      post.Excerpt,
		PageTreePath: []string{post.Title},
		ContentJSON:  post.Content,
		UpdatedAt:    post.UpdatedAt,
	})

	return s.replaceEntitySections("post", post.ID, sections)
}

// SyncAllPublished rebuilds the search_sections and FTS5 index for all currently published docs and posts.
func (s *SQLiteSearcher) SyncAllPublished() error {
	// Remove any orphaned non-published rows first
	if err := s.db.Exec(`DELETE FROM search_sections WHERE entity_type = 'doc' AND entity_id NOT IN (SELECT id FROM doc_pages WHERE status = 'published')`).Error; err != nil {
		return err
	}
	if err := s.db.Exec(`DELETE FROM search_sections WHERE entity_type = 'post' AND entity_id NOT IN (SELECT id FROM posts WHERE status = 'published')`).Error; err != nil {
		return err
	}
	if s.hasFTS5 {
		_ = s.db.Exec(`DELETE FROM search_sections_fts WHERE section_id NOT IN (SELECT id FROM search_sections)`)
	}

	var publishedPages []models.DocPage
	if err := s.db.Where("status = ?", "published").Find(&publishedPages).Error; err == nil {
		for i := range publishedPages {
			_ = s.IndexDocPage(&publishedPages[i])
		}
	}

	var publishedPosts []models.Post
	if err := s.db.Where("status = ?", models.PostStatusPublished).Find(&publishedPosts).Error; err == nil {
		for i := range publishedPosts {
			_ = s.IndexPost(&publishedPosts[i])
		}
	}

	return nil
}

// tokenizeQuery splits user input into clean tokens preserving '-' and '_' inside words (e.g. "X-Spile-Signature", "pk_live").
func tokenizeQuery(raw string) []string {
	var tokens []string
	var buf strings.Builder

	flush := func() {
		if buf.Len() > 0 {
			tok := strings.Trim(buf.String(), "-_")
			if tok != "" {
				tokens = append(tokens, tok)
			}
			buf.Reset()
		}
	}

	for _, r := range raw {
		if unicode.IsLetter(r) || unicode.IsDigit(r) || r == '-' || r == '_' {
			buf.WriteRune(r)
		} else {
			flush()
		}
	}
	flush()
	return tokens
}

// buildFTS5Query constructs a safe FTS5 prefix query where each token matches as a prefix ("tok"*).
func buildFTS5Query(tokens []string) string {
	if len(tokens) == 0 {
		return ""
	}
	parts := make([]string, 0, len(tokens))
	for _, tok := range tokens {
		escaped := strings.ReplaceAll(tok, `"`, `""`)
		parts = append(parts, fmt.Sprintf(`"%s"*`, escaped))
	}
	return strings.Join(parts, " AND ")
}

type ftsCandidate struct {
	models.SearchSection
	RawBM25 float64 `gorm:"column:raw_bm25"`
}

// Search executes a full-text search across indexed published sections with bm25 ranking, param boosting, and safe highlight ranges.
func (s *SQLiteSearcher) Search(params SearchParams) (*models.SearchResponse, error) {
	rawQ := strings.TrimSpace(params.Query)
	tokens := tokenizeQuery(rawQ)
	if len(tokens) == 0 {
		return &models.SearchResponse{
			Query:   rawQ,
			Total:   0,
			Results: []models.SearchResult{},
		}, nil
	}

	limit := params.Limit
	if limit <= 0 {
		limit = 20
	}
	if limit > 50 {
		limit = 50
	}

	entityFilter := normalizeEntityTypeFilter(params.EntityType)
	localeFilter := strings.TrimSpace(params.Locale)
	projectFilter := strings.TrimSpace(params.ProjectID)

	var candidates []ftsCandidate

	if s.hasFTS5 {
		ftsExpr := buildFTS5Query(tokens)
		// bm25 weights: page_title=10.0, section_title=8.0, param_names=15.0, body_text=2.0, code_text=1.0
		query := s.db.Table("search_sections_fts").
			Select("search_sections.*, bm25(search_sections_fts, 10.0, 8.0, 15.0, 2.0, 1.0) AS raw_bm25").
			Joins("JOIN search_sections ON search_sections.id = search_sections_fts.section_id").
			Where("search_sections_fts MATCH ?", ftsExpr)

		if entityFilter != "" {
			query = query.Where("search_sections.entity_type = ?", entityFilter)
		}
		if localeFilter != "" {
			query = query.Where("search_sections.locale = ?", localeFilter)
		}
		if projectFilter != "" {
			query = query.Where("(search_sections.project_id = ? OR search_sections.project_slug = ?)", projectFilter, projectFilter)
		}

		err := query.Order("raw_bm25 ASC").Limit(limit * 2).Scan(&candidates).Error
		if err != nil {
			// Fallback to SQL scan if FTS query syntax had an edge case
			candidates = s.fallbackScanCandidates(tokens, entityFilter, localeFilter, projectFilter, limit*2)
		}
	} else {
		candidates = s.fallbackScanCandidates(tokens, entityFilter, localeFilter, projectFilter, limit*2)
	}

	results := make([]models.SearchResult, 0, len(candidates))
	for _, cand := range candidates {
		// Convert negative bm25 score into a positive relevance score and apply exact-match boosts
		score := math.Abs(cand.RawBM25) * 10.0
		if score == 0 {
			score = 10.0
		}
		lowerQ := strings.ToLower(rawQ)
		if cand.ParamNames != "" && strings.Contains(strings.ToLower(cand.ParamNames), lowerQ) {
			score += 50.0
		}
		if strings.Contains(strings.ToLower(cand.SectionTitle), lowerQ) {
			score += 30.0
		}
		if strings.Contains(strings.ToLower(cand.PageTitle), lowerQ) {
			score += 25.0
		}
		score = math.Round(score*100) / 100

		snippet := buildContextualSnippet(cand.SearchSection, tokens, searchSnippetMaxChars)
		titleMatches := ComputeMatchRanges(cand.SectionTitle, tokens)
		snippetMatches := ComputeMatchRanges(snippet, tokens)

		var paramList []string
		if strings.TrimSpace(cand.ParamNames) != "" {
			paramList = strings.Fields(cand.ParamNames)
		}

		results = append(results, models.SearchResult{
			ID:             cand.ID,
			EntityID:       cand.EntityID,
			EntityType:     cand.EntityType,
			ProjectID:      cand.ProjectID,
			ProjectSlug:    cand.ProjectSlug,
			ProjectTitle:   cand.ProjectTitle,
			Locale:         cand.Locale,
			PageTitle:      cand.PageTitle,
			PageSlug:       cand.PageSlug,
			SectionTitle:   cand.SectionTitle,
			HeadingPath:    cand.HeadingPath(),
			Anchor:         cand.Anchor,
			BlockID:        cand.BlockID,
			Kind:           cand.Kind,
			ParamNames:     paramList,
			Snippet:        snippet,
			TitleMatches:   titleMatches,
			SnippetMatches: snippetMatches,
			Score:          score,
			UpdatedAt:      cand.UpdatedAt.UnixMilli(),
		})
	}

	sort.SliceStable(results, func(i, j int) bool {
		return results[i].Score > results[j].Score
	})
	if len(results) > limit {
		results = results[:limit]
	}

	return &models.SearchResponse{
		Query:   rawQ,
		Total:   len(results),
		Results: results,
	}, nil
}

func (s *SQLiteSearcher) fallbackScanCandidates(tokens []string, entityFilter, localeFilter, projectFilter string, limit int) []ftsCandidate {
	q := s.db.Model(&models.SearchSection{})
	if entityFilter != "" {
		q = q.Where("entity_type = ?", entityFilter)
	}
	if localeFilter != "" {
		q = q.Where("locale = ?", localeFilter)
	}
	if projectFilter != "" {
		q = q.Where("(project_id = ? OR project_slug = ?)", projectFilter, projectFilter)
	}
	for _, tok := range tokens {
		like := "%" + strings.ToLower(tok) + "%"
		q = q.Where(
			"(LOWER(page_title) LIKE ? OR LOWER(section_title) LIKE ? OR LOWER(param_names) LIKE ? OR LOWER(body_text) LIKE ? OR LOWER(code_text) LIKE ?)",
			like, like, like, like, like,
		)
	}
	var secs []models.SearchSection
	_ = q.Limit(limit).Find(&secs).Error
	out := make([]ftsCandidate, len(secs))
	for i, sec := range secs {
		out[i] = ftsCandidate{SearchSection: sec, RawBM25: -2.0}
	}
	return out
}

// GetProjectSearchIndex builds a compact client-side search index (for MiniSearch / cmdk) and returns an ETag.
func (s *SQLiteSearcher) GetProjectSearchIndex(projectIDOrSlug, locale string) (*models.ClientSearchIndexResponse, string, error) {
	var proj models.DocumentationProject
	if err := s.db.Where("id = ? OR slug = ?", projectIDOrSlug, projectIDOrSlug).First(&proj).Error; err != nil {
		return nil, "", err
	}

	loc := strings.TrimSpace(locale)
	if loc == "" {
		loc = "en"
	}

	var sections []models.SearchSection
	if err := s.db.Where("entity_type = ? AND project_id = ? AND locale = ?", "doc", proj.ID, loc).
		Order("page_slug ASC, section_order ASC").
		Find(&sections).Error; err != nil {
		return nil, "", err
	}

	items := make([]models.ClientSearchIndexItem, 0, len(sections))
	var maxUpdated int64 = proj.UpdatedAt.UnixMilli()

	hasher := sha1.New()
	_, _ = fmt.Fprintf(hasher, "%s:%s:%d:", proj.ID, loc, len(sections))

	for _, sec := range sections {
		ts := sec.UpdatedAt.UnixMilli()
		if ts > maxUpdated {
			maxUpdated = ts
		}
		_, _ = fmt.Fprintf(hasher, "%s:%d;", sec.ID, ts)

		var paramList []string
		if strings.TrimSpace(sec.ParamNames) != "" {
			paramList = strings.Fields(sec.ParamNames)
		}

		compactBody := truncateRunes(sec.BodyText, clientIndexMaxBodyChars)

		items = append(items, models.ClientSearchIndexItem{
			ID:           sec.ID,
			PageID:       sec.EntityID,
			Locale:       sec.Locale,
			PageTitle:    sec.PageTitle,
			PageSlug:     sec.PageSlug,
			SectionTitle: sec.SectionTitle,
			HeadingPath:  sec.HeadingPath(),
			Anchor:       sec.Anchor,
			Kind:         sec.Kind,
			ParamNames:   paramList,
			Text:         compactBody,
			UpdatedAt:    ts,
		})
	}

	etag := fmt.Sprintf(`W/"%s"`, hex.EncodeToString(hasher.Sum(nil))[:16])

	resp := &models.ClientSearchIndexResponse{
		ProjectID:   proj.ID,
		ProjectSlug: proj.Slug,
		Locale:      loc,
		UpdatedAt:   maxUpdated,
		Total:       len(items),
		Items:       items,
	}
	return resp, etag, nil
}

func normalizeEntityTypeFilter(t string) string {
	switch strings.ToLower(strings.TrimSpace(t)) {
	case "doc", "docs":
		return "doc"
	case "post", "posts":
		return "post"
	default:
		return ""
	}
}

// buildContextualSnippet extracts a plain-text window (~maxChars) centered around the first matched query token.
func buildContextualSnippet(sec models.SearchSection, tokens []string, maxChars int) string {
	source := strings.TrimSpace(sec.BodyText)
	if source == "" && strings.TrimSpace(sec.ParamNames) != "" {
		source = strings.TrimSpace(sec.ParamNames)
	}
	if source == "" && strings.TrimSpace(sec.CodeText) != "" {
		source = strings.ReplaceAll(strings.TrimSpace(sec.CodeText), "\n", " ")
	}
	if source == "" {
		source = sec.SectionTitle
	}

	runes := []rune(source)
	if len(runes) <= maxChars {
		return source
	}

	lowerSource := strings.ToLower(source)
	lowerRunes := []rune(lowerSource)

	firstMatchRuneIdx := -1
	for _, tok := range tokens {
		tokLower := []rune(strings.ToLower(tok))
		if idx := indexRunes(lowerRunes, tokLower); idx >= 0 {
			if firstMatchRuneIdx == -1 || idx < firstMatchRuneIdx {
				firstMatchRuneIdx = idx
			}
		}
	}

	if firstMatchRuneIdx <= 0 {
		return string(runes[:maxChars]) + "…"
	}

	half := maxChars / 2
	start := firstMatchRuneIdx - half/2
	if start < 0 {
		start = 0
	}
	end := start + maxChars
	if end > len(runes) {
		end = len(runes)
		start = end - maxChars
		if start < 0 {
			start = 0
		}
	}

	// Snap to word boundaries if possible
	if start > 0 {
		for start < firstMatchRuneIdx && !unicode.IsSpace(runes[start]) {
			start++
		}
		start = strings.IndexFunc(string(runes[start:]), func(r rune) bool { return !unicode.IsSpace(r) }) + start
	}

	prefix := ""
	if start > 0 {
		prefix = "…"
	}
	suffix := ""
	if end < len(runes) {
		suffix = "…"
	}

	return prefix + strings.TrimSpace(string(runes[start:end])) + suffix
}

// ComputeMatchRanges returns merged rune offset ranges [Start, End) where any token matches case-insensitively in text.
func ComputeMatchRanges(text string, tokens []string) []models.MatchRange {
	if text == "" || len(tokens) == 0 {
		return []models.MatchRange{}
	}
	lowerRunes := []rune(strings.ToLower(text))
	var rawRanges []models.MatchRange

	for _, tok := range tokens {
		tokRunes := []rune(strings.ToLower(strings.TrimSpace(tok)))
		if len(tokRunes) == 0 {
			continue
		}
		offset := 0
		for offset <= len(lowerRunes)-len(tokRunes) {
			idx := indexRunes(lowerRunes[offset:], tokRunes)
			if idx < 0 {
				break
			}
			absStart := offset + idx
			absEnd := absStart + len(tokRunes)
			// Extend to end of word if prefix match
			for absEnd < len(lowerRunes) && (unicode.IsLetter(lowerRunes[absEnd]) || unicode.IsDigit(lowerRunes[absEnd]) || lowerRunes[absEnd] == '-' || lowerRunes[absEnd] == '_') {
				absEnd++
			}
			rawRanges = append(rawRanges, models.MatchRange{
				Start: absStart,
				End:   absEnd,
			})
			offset = absEnd
		}
	}

	if len(rawRanges) == 0 {
		return []models.MatchRange{}
	}

	sort.Slice(rawRanges, func(i, j int) bool {
		if rawRanges[i].Start == rawRanges[j].Start {
			return rawRanges[i].End < rawRanges[j].End
		}
		return rawRanges[i].Start < rawRanges[j].Start
	})

	merged := []models.MatchRange{rawRanges[0]}
	for i := 1; i < len(rawRanges); i++ {
		last := &merged[len(merged)-1]
		if rawRanges[i].Start <= last.End {
			if rawRanges[i].End > last.End {
				last.End = rawRanges[i].End
			}
		} else {
			merged = append(merged, rawRanges[i])
		}
	}
	return merged
}

func indexRunes(haystack, needle []rune) int {
	if len(needle) == 0 || len(needle) > len(haystack) {
		return -1
	}
	for i := 0; i <= len(haystack)-len(needle); i++ {
		match := true
		for j := 0; j < len(needle); j++ {
			if haystack[i+j] != needle[j] {
				match = false
				break
			}
		}
		if match {
			return i
		}
	}
	return -1
}

func truncateRunes(s string, maxRunes int) string {
	r := []rune(strings.TrimSpace(s))
	if len(r) <= maxRunes {
		return string(r)
	}
	cut := maxRunes
	for cut > maxRunes*3/4 && !unicode.IsSpace(r[cut]) {
		cut--
	}
	return strings.TrimSpace(string(r[:cut])) + "…"
}

var _ = time.Now

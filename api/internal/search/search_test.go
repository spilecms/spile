package search_test

import (
	"compress/gzip"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/spilecms/spile/api/internal/models"
	"github.com/spilecms/spile/api/internal/search"
	"github.com/spilecms/spile/api/internal/testutils"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestChunker_EdgeCasesAndGitHubAnchors(t *testing.T) {
	longParagraph := strings.Repeat("Spile chunks long sections so snippets remain dense and relevant. ", 25) // ~1650 chars

	editorJSON := `{
		"time": 1760000000000,
		"blocks": [
			{"id": "b0", "type": "paragraph", "data": {"text": "Welcome to the <b>Spile</b> webhook guide."}},
			{"id": "h1", "type": "header", "data": {"text": "Rate Limiting", "level": 2}},
			{"id": "p1", "type": "paragraph", "data": {"text": "Default limits apply per token."}},
			{"id": "h2", "type": "header", "data": {"text": "Burst Quotas", "level": 3}},
			{"id": "pf1", "type": "paramField", "data": {"name": "X-Spile-Signature", "type": "string", "paramType": "header", "description": "HMAC-SHA256 signature"}},
			{"id": "c1", "type": "code", "data": {"code": "const token = 'pk_live_secret_example';", "filename": "client.ts"}},
			{"id": "h3", "type": "header", "data": {"text": "Rate Limiting", "level": 2}},
			{"id": "p2", "type": "paragraph", "data": {"text": "` + longParagraph + `"}}
		]
	}`

	sections := search.ChunkEditorContent(search.ChunkInput{
		EntityID:     "page-1",
		EntityType:   "doc",
		ProjectID:    "proj-1",
		ProjectSlug:  "dev-docs",
		ProjectTitle: "Developer Docs",
		Locale:       "en",
		PageTitle:    "Webhooks",
		PageSlug:     "webhooks",
		PageTreePath: []string{"Developer Docs", "Guides", "Webhooks"},
		ContentJSON:  editorJSON,
	})

	// Expect:
	// 0: intro ("Welcome to the Spile webhook guide.")
	// 1: H2 "Rate Limiting" (anchor: "rate-limiting")
	// 2: H3 "Burst Quotas" under H2 "Rate Limiting" (anchor: "burst-quotas", headingPath includes H2 > H3)
	// 3 & 4: second H2 "Rate Limiting" (anchor: "rate-limiting-1") split into 2 chunks because > 1200 chars
	require.Len(t, sections, 5)

	// 1. Intro section before first heading
	assert.Equal(t, "intro", sections[0].Kind)
	assert.Equal(t, "", sections[0].Anchor)
	assert.Equal(t, "Webhooks", sections[0].SectionTitle)
	assert.Equal(t, "Welcome to the Spile webhook guide.", sections[0].BodyText)
	assert.Equal(t, []string{"Developer Docs", "Guides", "Webhooks"}, sections[0].HeadingPath())

	// 2. First "Rate Limiting" H2
	assert.Equal(t, "section", sections[1].Kind)
	assert.Equal(t, "rate-limiting", sections[1].Anchor)
	assert.Equal(t, "h1", sections[1].BlockID)
	assert.Equal(t, []string{"Developer Docs", "Guides", "Webhooks", "Rate Limiting"}, sections[1].HeadingPath())

	// 3. Nested H3 "Burst Quotas" under H2 "Rate Limiting"
	assert.Equal(t, "burst-quotas", sections[2].Anchor)
	assert.Equal(t, []string{"Developer Docs", "Guides", "Webhooks", "Rate Limiting", "Burst Quotas"}, sections[2].HeadingPath())
	assert.Contains(t, sections[2].ParamNames, "X-Spile-Signature")
	assert.Contains(t, sections[2].CodeText, "pk_live_secret_example")

	// 4. Duplicate heading "Rate Limiting" gets GitHub-style "-1" dedupe and splits long body into 2 chunks
	assert.Equal(t, "rate-limiting-1", sections[3].Anchor)
	assert.Equal(t, "rate-limiting-1", sections[4].Anchor)
	assert.LessOrEqual(t, len(sections[3].BodyText), 1200)
	assert.NotEmpty(t, sections[4].BodyText)
}

func TestChunker_BlockNoteFormat_And_NestedAccordions(t *testing.T) {
	blockNoteJSON := `[
		{
			"id": "b0",
			"type": "paragraph",
			"props": {},
			"content": [{"type": "text", "text": "Welcome to the BlockNote powered docs.", "styles": {}}],
			"children": []
		},
		{
			"id": "h1",
			"type": "heading",
			"props": {"level": 2},
			"content": [{"type": "text", "text": "Architecture Overview", "styles": {}}],
			"children": []
		},
		{
			"id": "acc1",
			"type": "accordion",
			"props": {},
			"content": [{"type": "text", "text": "Database Schema Details", "styles": {}}],
			"children": [
				{
					"id": "p-nested",
					"type": "paragraph",
					"props": {},
					"content": [{"type": "text", "text": "SQLite WAL mode is enabled for maximum concurrency.", "styles": {}}],
					"children": []
				},
				{
					"id": "callout1",
					"type": "callout",
					"props": {"type": "tip"},
					"content": [{"type": "text", "text": "Remember to run vacuum regularly.", "styles": {}}],
					"children": []
				}
			]
		},
		{
			"id": "c1",
			"type": "codeBlock",
			"props": {"language": "go"},
			"content": [{"type": "text", "text": "db.Exec(\"PRAGMA journal_mode=WAL;\")", "styles": {}}],
			"children": []
		}
	]`

	sections := search.ChunkEditorContent(search.ChunkInput{
		EntityID:     "page-bn-1",
		EntityType:   "doc",
		ProjectID:    "proj-1",
		ProjectSlug:  "dev-docs",
		ProjectTitle: "Developer Docs",
		Locale:       "en",
		PageTitle:    "Architecture",
		PageSlug:     "architecture",
		PageTreePath: []string{"Developer Docs", "Architecture"},
		ContentJSON:  blockNoteJSON,
	})

	require.Len(t, sections, 2)

	// 0: intro
	assert.Equal(t, "intro", sections[0].Kind)
	assert.Equal(t, "Welcome to the BlockNote powered docs.", sections[0].BodyText)

	// 1: section "Architecture Overview"
	assert.Equal(t, "section", sections[1].Kind)
	assert.Equal(t, "architecture-overview", sections[1].Anchor)
	assert.Equal(t, "Architecture Overview", sections[1].SectionTitle)
	assert.Contains(t, sections[1].BodyText, "Database Schema Details")
	assert.Contains(t, sections[1].BodyText, "SQLite WAL mode is enabled for maximum concurrency.")
	assert.Contains(t, sections[1].BodyText, "Remember to run vacuum regularly.")
	assert.Contains(t, sections[1].CodeText, "PRAGMA journal_mode=WAL")
}

func TestSearchAPI_FTS5_Tokenization_DraftExclusion_And_ClientIndex(t *testing.T) {
	app := testutils.NewTestApp(t)
	db := app.DB
	router := app.Router
	owner := app.CreateUser("Owner", "owner@spile.io", "Password123!", models.RoleOwner)
	adminToken := app.CreateSession(owner.ID)

	// Create a published project
	proj := models.DocumentationProject{
		ID:     "proj-sdk",
		Title:  "Spile SDK",
		Slug:   "spile-sdk",
		Status: "published",
	}
	require.NoError(t, db.Create(&proj).Error)

	searcher, err := search.NewSQLiteSearcher(db)
	require.NoError(t, err)

	// 1. Create a published doc page with hyphenated/underscored identifiers and HTML-injected text
	pubContent := `{
		"blocks": [
			{"id": "intro-p", "type": "paragraph", "data": {"text": "Authenticate requests with your <script>alert(1)</script> pk_live_token key."}},
			{"id": "hdr-sig", "type": "header", "data": {"text": "Webhook Verification", "level": 2}},
			{"id": "pf-sig", "type": "paramField", "data": {"name": "X-Spile-Signature", "type": "string", "paramType": "header", "description": "HMAC signature header for webhook verification"}},
			{"id": "code-sig", "type": "code", "data": {"code": "verifyHmac(rawBody, headers['x-spile-signature'])"}}
		]
	}`
	pubPage := models.DocPage{
		ID:        "doc-pub-1",
		ProjectID: proj.ID,
		Locale:    "en",
		Title:     "Authentication & Webhooks",
		Slug:      "auth-webhooks",
		Status:    "published",
		Content:   pubContent,
	}
	require.NoError(t, db.Create(&pubPage).Error)
	require.NoError(t, searcher.IndexDocPage(&pubPage))

	// 2. Create a DRAFT doc page that must NEVER appear in search
	draftPage := models.DocPage{
		ID:        "doc-draft-1",
		ProjectID: proj.ID,
		Locale:    "en",
		Title:     "Secret Draft Roadmap",
		Slug:      "secret-draft",
		Status:    "draft",
		Content:   `{"blocks":[{"id":"d1","type":"paragraph","data":{"text":"X-Spile-Signature secret unreleased feature"}}]}`,
	}
	require.NoError(t, db.Create(&draftPage).Error)
	require.NoError(t, searcher.IndexDocPage(&draftPage))

	// 3. Test prefix & hyphenated token search: "X-Spile" should find "X-Spile-Signature" in the published page only
	req := httptest.NewRequest(http.MethodGet, "/api/v1/search?q=X-Spile&type=docs&projectId=spile-sdk&locale=en", nil)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)
	var searchResp models.SearchResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &searchResp))
	require.Equal(t, 1, searchResp.Total)
	hit := searchResp.Results[0]
	assert.Equal(t, "doc-pub-1", hit.EntityID)
	assert.Equal(t, "Webhook Verification", hit.SectionTitle)
	assert.Equal(t, "webhook-verification", hit.Anchor)
	assert.Contains(t, hit.ParamNames, "X-Spile-Signature")
	assert.NotEmpty(t, hit.SnippetMatches)

	// 4. Test underscore prefix token search: "pk_live" matches "pk_live_token" in the intro section and strips <script> tags
	req2 := httptest.NewRequest(http.MethodGet, "/api/v1/search?q=pk_live", nil)
	req2.Header.Set("Authorization", "Bearer "+adminToken)
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)

	require.Equal(t, http.StatusOK, w2.Code)
	var searchResp2 models.SearchResponse
	require.NoError(t, json.Unmarshal(w2.Body.Bytes(), &searchResp2))
	require.Equal(t, 1, searchResp2.Total)
	assert.Equal(t, "intro", searchResp2.Results[0].Kind)
	assert.Equal(t, "", searchResp2.Results[0].Anchor)
	assert.NotContains(t, searchResp2.Results[0].Snippet, "<script>")

	// 5. Test Client Search Index endpoint with Gzip + ETag (304 Not Modified)
	idxReq := httptest.NewRequest(http.MethodGet, "/api/v1/docs/projects/spile-sdk/search-index?locale=en", nil)
	idxReq.Header.Set("Authorization", "Bearer "+adminToken)
	idxReq.Header.Set("Accept-Encoding", "gzip")
	idxW := httptest.NewRecorder()
	router.ServeHTTP(idxW, idxReq)

	require.Equal(t, http.StatusOK, idxW.Code)
	assert.Equal(t, "gzip", idxW.Header().Get("Content-Encoding"))
	etag := idxW.Header().Get("ETag")
	assert.NotEmpty(t, etag)

	gzReader, err := gzip.NewReader(idxW.Body)
	require.NoError(t, err)
	unzipped, err := io.ReadAll(gzReader)
	require.NoError(t, err)
	_ = gzReader.Close()

	var clientIdx models.ClientSearchIndexResponse
	require.NoError(t, json.Unmarshal(unzipped, &clientIdx))
	assert.Equal(t, 2, clientIdx.Total) // intro + Webhook Verification section
	// Ensure code blocks are omitted from client search index
	for _, item := range clientIdx.Items {
		assert.NotContains(t, item.Text, "verifyHmac")
	}

	// Conditional request with If-None-Match returns 304 Not Modified
	cachedReq := httptest.NewRequest(http.MethodGet, "/api/v1/docs/projects/spile-sdk/search-index?locale=en", nil)
	cachedReq.Header.Set("Authorization", "Bearer "+adminToken)
	cachedReq.Header.Set("If-None-Match", etag)
	cachedW := httptest.NewRecorder()
	router.ServeHTTP(cachedW, cachedReq)
	assert.Equal(t, http.StatusNotModified, cachedW.Code)

	// 6. Unpublishing the page removes it from search immediately
	pubPage.Status = "draft"
	require.NoError(t, db.Save(&pubPage).Error)
	require.NoError(t, searcher.IndexDocPage(&pubPage))

	reqAfterUnpublish := httptest.NewRequest(http.MethodGet, "/api/v1/search?q=X-Spile", nil)
	reqAfterUnpublish.Header.Set("Authorization", "Bearer "+adminToken)
	wAfter := httptest.NewRecorder()
	router.ServeHTTP(wAfter, reqAfterUnpublish)
	var emptyResp models.SearchResponse
	require.NoError(t, json.Unmarshal(wAfter.Body.Bytes(), &emptyResp))
	assert.Equal(t, 0, emptyResp.Total)
}

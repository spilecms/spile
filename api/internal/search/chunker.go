package search

import (
	"encoding/json"
	"fmt"
	"html"
	"regexp"
	"strings"
	"time"
	"unicode"

	"github.com/google/uuid"
	"github.com/spilecms/spile/api/internal/models"
)

const maxSectionBodyChars = 1200

var (
	htmlTagRegex        = regexp.MustCompile(`<[^>]*>`)
	multiSpaceRegex     = regexp.MustCompile(`\s+`)
	nonSlugCharRegex    = regexp.MustCompile(`[^\p{L}\p{N}\s-_]`)
	slugHyphenCollapse  = regexp.MustCompile(`[-_\s]+`)
)

// BlockNoteInline represents an inline formatted text node in BlockNote JSON.
type BlockNoteInline struct {
	Type   string         `json:"type"`
	Text   string         `json:"text"`
	Styles map[string]any `json:"styles,omitempty"`
}

// BlockNoteBlock represents a block item in BlockNote JSON.
type BlockNoteBlock struct {
	ID       string            `json:"id"`
	Type     string            `json:"type"`
	Props    map[string]any    `json:"props"`
	Content  []BlockNoteInline `json:"content"`
	Children []BlockNoteBlock  `json:"children"`
}

func (b *BlockNoteBlock) ExtractText() string {
	var sb strings.Builder
	for _, c := range b.Content {
		sb.WriteString(c.Text)
	}
	return StripHTML(sb.String())
}

// EditorOutputData represents the top-level Editor.js JSON payload.
type EditorOutputData struct {
	Time    int64         `json:"time"`
	Blocks  []EditorBlock `json:"blocks"`
	Version string        `json:"version"`
}

// EditorBlock represents a single block in Editor.js OutputData.
type EditorBlock struct {
	ID   string          `json:"id"`
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

// ChunkInput holds the metadata and raw Editor.js JSON needed to chunk a published DocPage or Post.
type ChunkInput struct {
	EntityID     string
	EntityType   string // "doc" | "post"
	ProjectID    string
	ProjectSlug  string
	ProjectTitle string
	Locale       string
	PageTitle    string
	PageSlug     string
	Excerpt      string
	PageTreePath []string // e.g., ["Developer Docs", "Authentication", "API Keys"]
	ContentJSON  string
	UpdatedAt    time.Time
}

// StripHTML strips inline Editor.js HTML tags (<b>, <code>, <mark>, <a>, etc.), unescapes HTML entities, and normalizes whitespace.
func StripHTML(input string) string {
	if input == "" {
		return ""
	}
	cleaned := htmlTagRegex.ReplaceAllString(input, " ")
	cleaned = html.UnescapeString(cleaned)
	cleaned = strings.ReplaceAll(cleaned, "\u00a0", " ")
	cleaned = multiSpaceRegex.ReplaceAllString(cleaned, " ")
	return strings.TrimSpace(cleaned)
}

// SlugifyGitHub generates a GitHub-style anchor slug from heading text and deduplicates collisions using seenCounts.
// First occurrence: "rate-limiting"
// Second occurrence: "rate-limiting-1"
// Third occurrence: "rate-limiting-2"
func SlugifyGitHub(text string, seenCounts map[string]int) string {
	clean := StripHTML(text)
	clean = strings.ToLower(clean)

	// Keep letters, digits, spaces, hyphens, underscores
	clean = nonSlugCharRegex.ReplaceAllString(clean, "")
	clean = strings.TrimSpace(clean)
	base := slugHyphenCollapse.ReplaceAllString(clean, "-")
	base = strings.Trim(base, "-")

	if base == "" {
		base = "section"
	}

	if seenCounts == nil {
		return base
	}

	count, exists := seenCounts[base]
	seenCounts[base] = count + 1
	if !exists {
		return base
	}
	return fmt.Sprintf("%s-%d", base, count)
}

type headingStackEntry struct {
	Level int
	Title string
}

type rawSectionAccumulator struct {
	Kind         string
	SectionTitle string
	Anchor       string
	BlockID      string
	HeadingPath  []string
	Paragraphs   []string
	CodeBlocks   []string
	ParamNames   []string
}

func processBlockNoteBlocks(
	blocks []BlockNoteBlock,
	baseTree []string,
	seenAnchors map[string]int,
	headingStack *[]headingStackEntry,
	current **rawSectionAccumulator,
	accumulators *[]*rawSectionAccumulator,
) {
	for _, blk := range blocks {
		switch blk.Type {
		case "heading":
			hTitle := blk.ExtractText()
			if hTitle == "" {
				continue
			}
			level := 2
			if blk.Props != nil {
				if l, ok := blk.Props["level"].(float64); ok && l >= 1 && l <= 6 {
					level = int(l)
				}
			}

			if (*current).Kind == "section" || len((*current).Paragraphs) > 0 || len((*current).CodeBlocks) > 0 || len((*current).ParamNames) > 0 {
				*accumulators = append(*accumulators, *current)
			}

			for len(*headingStack) > 0 && (*headingStack)[len(*headingStack)-1].Level >= level {
				*headingStack = (*headingStack)[:len(*headingStack)-1]
			}
			*headingStack = append(*headingStack, headingStackEntry{
				Level: level,
				Title: hTitle,
			})

			path := make([]string, 0, len(baseTree)+len(*headingStack))
			path = append(path, baseTree...)
			for _, h := range *headingStack {
				if len(path) > 0 && strings.EqualFold(path[len(path)-1], h.Title) {
					continue
				}
				path = append(path, h.Title)
			}

			anchor := SlugifyGitHub(hTitle, seenAnchors)
			*current = &rawSectionAccumulator{
				Kind:         "section",
				SectionTitle: hTitle,
				Anchor:       anchor,
				BlockID:      blk.ID,
				HeadingPath:  path,
			}

		case "paragraph", "blockquote", "bulletListItem", "numberedListItem", "checkListItem", "callout", "accordion":
			if txt := blk.ExtractText(); txt != "" {
				(*current).Paragraphs = append((*current).Paragraphs, txt)
			}

		case "paramField", "responseField":
			if blk.Props != nil {
				if name, ok := blk.Props["name"].(string); ok && name != "" {
					(*current).ParamNames = append((*current).ParamNames, name)
				}
			}
			if txt := blk.ExtractText(); txt != "" {
				(*current).Paragraphs = append((*current).Paragraphs, txt)
			}

		case "codeBlock":
			if c := blk.ExtractText(); c != "" {
				(*current).CodeBlocks = append((*current).CodeBlocks, c)
			}

		case "codeGroup":
			if blk.Props != nil {
				if tabsStr, ok := blk.Props["tabsJson"].(string); ok && tabsStr != "" {
					var tabs []struct {
						Label string `json:"label"`
						Code  string `json:"code"`
					}
					if err := json.Unmarshal([]byte(tabsStr), &tabs); err == nil {
						for _, tab := range tabs {
							if tab.Code != "" {
								(*current).CodeBlocks = append((*current).CodeBlocks, tab.Code)
							}
						}
					}
				}
			}
		}

		if len(blk.Children) > 0 {
			processBlockNoteBlocks(blk.Children, baseTree, seenAnchors, headingStack, current, accumulators)
		}
	}
}

// ChunkEditorContent parses Editor.js JSON into one or more SearchSection rows ready for database + FTS indexing.
func ChunkEditorContent(in ChunkInput) []models.SearchSection {
	locale := strings.TrimSpace(in.Locale)
	if locale == "" {
		locale = "en"
	}
	updatedAt := in.UpdatedAt
	if updatedAt.IsZero() {
		updatedAt = time.Now()
	}

	baseTree := make([]string, 0, len(in.PageTreePath)+1)
	for _, p := range in.PageTreePath {
		if t := strings.TrimSpace(p); t != "" {
			baseTree = append(baseTree, t)
		}
	}
	if len(baseTree) == 0 && strings.TrimSpace(in.PageTitle) != "" {
		baseTree = append(baseTree, strings.TrimSpace(in.PageTitle))
	}

	seenAnchors := make(map[string]int)
	var headingStack []headingStackEntry

	// Start with an "intro" accumulator for content before the first heading (and post excerpt if present)
	current := &rawSectionAccumulator{
		Kind:         "intro",
		SectionTitle: strings.TrimSpace(in.PageTitle),
		Anchor:       "",
		BlockID:      "",
		HeadingPath:  append([]string{}, baseTree...),
	}
	if excerpt := StripHTML(in.Excerpt); excerpt != "" {
		current.Paragraphs = append(current.Paragraphs, excerpt)
	}

	var accumulators []*rawSectionAccumulator

	flushCurrent := func() {
		if current == nil {
			return
		}
		// Keep a section if it's an explicit heading section OR if the intro has content/title
		hasContent := len(current.Paragraphs) > 0 || len(current.CodeBlocks) > 0 || len(current.ParamNames) > 0
		if current.Kind == "section" || hasContent || len(accumulators) == 0 {
			accumulators = append(accumulators, current)
		}
	}

	contentTrimmed := strings.TrimSpace(in.ContentJSON)
	if strings.HasPrefix(contentTrimmed, "[") {
		var bnBlocks []BlockNoteBlock
		if err := json.Unmarshal([]byte(contentTrimmed), &bnBlocks); err == nil && len(bnBlocks) > 0 {
			processBlockNoteBlocks(bnBlocks, baseTree, seenAnchors, &headingStack, &current, &accumulators)
		}
	} else if strings.HasPrefix(contentTrimmed, "{") {
		var output EditorOutputData
		_ = json.Unmarshal([]byte(contentTrimmed), &output)

	for _, blk := range output.Blocks {
		switch blk.Type {
		case "header":
			var hData struct {
				Text  string `json:"text"`
				Level int    `json:"level"`
			}
			if err := json.Unmarshal(blk.Data, &hData); err != nil {
				continue
			}
			hTitle := StripHTML(hData.Text)
			if hTitle == "" {
				continue
			}
			level := hData.Level
			if level < 1 || level > 6 {
				level = 2
			}

			// Flush previous section if it was a heading section or non-empty intro
			if current.Kind == "section" || len(current.Paragraphs) > 0 || len(current.CodeBlocks) > 0 || len(current.ParamNames) > 0 {
				accumulators = append(accumulators, current)
			}

			// Pop headings of >= level from the stack so H2 > H3 hierarchy stays accurate
			for len(headingStack) > 0 && headingStack[len(headingStack)-1].Level >= level {
				headingStack = headingStack[:len(headingStack)-1]
			}
			headingStack = append(headingStack, headingStackEntry{
				Level: level,
				Title: hTitle,
			})

			path := make([]string, 0, len(baseTree)+len(headingStack))
			path = append(path, baseTree...)
			for _, h := range headingStack {
				// Avoid duplicating the page title if H1 is identical to PageTitle
				if len(path) > 0 && strings.EqualFold(path[len(path)-1], h.Title) {
					continue
				}
				path = append(path, h.Title)
			}

			anchor := SlugifyGitHub(hTitle, seenAnchors)
			current = &rawSectionAccumulator{
				Kind:         "section",
				SectionTitle: hTitle,
				Anchor:       anchor,
				BlockID:      blk.ID,
				HeadingPath:  path,
			}

		case "paragraph":
			var pData struct {
				Text string `json:"text"`
			}
			if json.Unmarshal(blk.Data, &pData) == nil {
				if txt := StripHTML(pData.Text); txt != "" {
					current.Paragraphs = append(current.Paragraphs, txt)
				}
			}

		case "quote":
			var qData struct {
				Text    string `json:"text"`
				Caption string `json:"caption"`
			}
			if json.Unmarshal(blk.Data, &qData) == nil {
				parts := compactStrings(StripHTML(qData.Text), StripHTML(qData.Caption))
				if len(parts) > 0 {
					current.Paragraphs = append(current.Paragraphs, strings.Join(parts, " — "))
				}
			}

		case "callout", "warning":
			var cData struct {
				Title   string `json:"title"`
				Message string `json:"message"`
				Text    string `json:"text"`
			}
			if json.Unmarshal(blk.Data, &cData) == nil {
				msg := cData.Message
				if msg == "" {
					msg = cData.Text
				}
				parts := compactStrings(StripHTML(cData.Title), StripHTML(msg))
				if len(parts) > 0 {
					current.Paragraphs = append(current.Paragraphs, strings.Join(parts, ": "))
				}
			}

		case "accordion", "expandable":
			var aData struct {
				Title   string `json:"title"`
				Badge   string `json:"badge"`
				Content string `json:"content"`
			}
			if json.Unmarshal(blk.Data, &aData) == nil {
				parts := compactStrings(StripHTML(aData.Title), StripHTML(aData.Badge), StripHTML(aData.Content))
				if len(parts) > 0 {
					current.Paragraphs = append(current.Paragraphs, strings.Join(parts, " — "))
				}
			}

		case "list":
			items := extractNestedListItems(blk.Data)
			if len(items) > 0 {
				current.Paragraphs = append(current.Paragraphs, strings.Join(items, " • "))
			}

		case "checklist":
			var chkData struct {
				Items []struct {
					Text string `json:"text"`
				} `json:"items"`
			}
			if json.Unmarshal(blk.Data, &chkData) == nil {
				var items []string
				for _, it := range chkData.Items {
					if t := StripHTML(it.Text); t != "" {
						items = append(items, t)
					}
				}
				if len(items) > 0 {
					current.Paragraphs = append(current.Paragraphs, strings.Join(items, " • "))
				}
			}

		case "table":
			var tData struct {
				Content [][]string `json:"content"`
			}
			if json.Unmarshal(blk.Data, &tData) == nil {
				var rows []string
				for _, row := range tData.Content {
					var cells []string
					for _, cell := range row {
						if c := StripHTML(cell); c != "" {
							cells = append(cells, c)
						}
					}
					if len(cells) > 0 {
						rows = append(rows, strings.Join(cells, " | "))
					}
				}
				if len(rows) > 0 {
					current.Paragraphs = append(current.Paragraphs, strings.Join(rows, " ; "))
				}
			}

		case "paramField", "responseField":
			var fData struct {
				Name         string `json:"name"`
				Type         string `json:"type"`
				ParamType    string `json:"paramType"`
				DefaultValue string `json:"defaultValue"`
				Description  string `json:"description"`
			}
			if json.Unmarshal(blk.Data, &fData) == nil {
				name := strings.TrimSpace(StripHTML(fData.Name))
				if name != "" {
					current.ParamNames = appendUnique(current.ParamNames, name)
				}
				desc := StripHTML(fData.Description)
				meta := compactStrings(name, StripHTML(fData.Type), StripHTML(fData.ParamType), desc)
				if len(meta) > 0 {
					current.Paragraphs = append(current.Paragraphs, strings.Join(meta, " "))
				}
			}

		case "code":
			var codeData struct {
				Code     string `json:"code"`
				Filename string `json:"filename"`
			}
			if json.Unmarshal(blk.Data, &codeData) == nil {
				if fn := strings.TrimSpace(codeData.Filename); fn != "" {
					current.ParamNames = appendUnique(current.ParamNames, fn)
				}
				if c := strings.TrimSpace(codeData.Code); c != "" {
					current.CodeBlocks = append(current.CodeBlocks, c)
				}
			}

		case "codeGroup":
			var cgData struct {
				Tabs []struct {
					Label string `json:"label"`
					Code  string `json:"code"`
				} `json:"tabs"`
			}
			if json.Unmarshal(blk.Data, &cgData) == nil {
				for _, tab := range cgData.Tabs {
					if c := strings.TrimSpace(tab.Code); c != "" {
						current.CodeBlocks = append(current.CodeBlocks, c)
					}
				}
			}

		case "requestExample":
			var reqData struct {
				Method   string `json:"method"`
				Endpoint string `json:"endpoint"`
				Tabs     []struct {
					Label string `json:"label"`
					Code  string `json:"code"`
				} `json:"tabs"`
			}
			if json.Unmarshal(blk.Data, &reqData) == nil {
				ep := strings.TrimSpace(reqData.Endpoint)
				method := strings.TrimSpace(reqData.Method)
				if ep != "" {
					current.ParamNames = appendUnique(current.ParamNames, ep)
					current.Paragraphs = append(current.Paragraphs, strings.TrimSpace(method+" "+ep))
				}
				for _, tab := range reqData.Tabs {
					if c := strings.TrimSpace(tab.Code); c != "" {
						current.CodeBlocks = append(current.CodeBlocks, c)
					}
				}
			}

		case "responseExample":
			var resData struct {
				Tabs []struct {
					StatusText string `json:"statusText"`
					Code       string `json:"code"`
				} `json:"tabs"`
			}
			if json.Unmarshal(blk.Data, &resData) == nil {
				for _, tab := range resData.Tabs {
					if c := strings.TrimSpace(tab.Code); c != "" {
						current.CodeBlocks = append(current.CodeBlocks, c)
					}
				}
			}
		}
	}
}

	flushCurrent()

	// Convert accumulators into SearchSection models, splitting long sections (> maxSectionBodyChars) by paragraph boundaries
	var results []models.SearchSection
	order := 0

	for _, acc := range accumulators {
		bodyChunks := splitParagraphsByMaxSize(acc.Paragraphs, maxSectionBodyChars)
		codeJoined := strings.Join(acc.CodeBlocks, "\n")
		paramsJoined := strings.Join(acc.ParamNames, " ")

		for idx, bodyChunk := range bodyChunks {
			sec := models.SearchSection{
				ID:           uuid.NewString(),
				EntityID:     in.EntityID,
				EntityType:   in.EntityType,
				ProjectID:    in.ProjectID,
				ProjectSlug:  in.ProjectSlug,
				ProjectTitle: in.ProjectTitle,
				Locale:       locale,
				PageTitle:    strings.TrimSpace(in.PageTitle),
				PageSlug:     strings.TrimSpace(in.PageSlug),
				SectionTitle: acc.SectionTitle,
				Anchor:       acc.Anchor,
				BlockID:      acc.BlockID,
				Kind:         acc.Kind,
				BodyText:     bodyChunk,
				SectionOrder: order,
				UpdatedAt:    updatedAt,
			}
			// Attach code and param_names to the first chunk of the section (or all if single)
			if idx == 0 {
				sec.CodeText = codeJoined
				sec.ParamNames = paramsJoined
			} else {
				sec.ParamNames = paramsJoined
			}
			sec.SetHeadingPath(acc.HeadingPath)
			results = append(results, sec)
			order++
		}
	}

	return results
}

func extractNestedListItems(raw json.RawMessage) []string {
	var data struct {
		Items []json.RawMessage `json:"items"`
	}
	if err := json.Unmarshal(raw, &data); err != nil {
		return nil
	}
	var out []string
	var walkItems func(items []json.RawMessage)
	walkItems = func(items []json.RawMessage) {
		for _, itemRaw := range items {
			// Editor.js list items can be plain strings or NestedList objects { content, items }
			var strItem string
			if err := json.Unmarshal(itemRaw, &strItem); err == nil {
				if clean := StripHTML(strItem); clean != "" {
					out = append(out, clean)
				}
				continue
			}
			var objItem struct {
				Content string            `json:"content"`
				Text    string            `json:"text"`
				Items   []json.RawMessage `json:"items"`
			}
			if err := json.Unmarshal(itemRaw, &objItem); err == nil {
				txt := objItem.Content
				if txt == "" {
					txt = objItem.Text
				}
				if clean := StripHTML(txt); clean != "" {
					out = append(out, clean)
				}
				if len(objItem.Items) > 0 {
					walkItems(objItem.Items)
				}
			}
		}
	}
	walkItems(data.Items)
	return out
}

func splitParagraphsByMaxSize(paragraphs []string, maxChars int) []string {
	if len(paragraphs) == 0 {
		return []string{""}
	}
	var chunks []string
	var current strings.Builder

	for _, p := range paragraphs {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		// If a single paragraph is larger than maxChars, split it on sentence/word boundaries
		if len(p) > maxChars {
			if current.Len() > 0 {
				chunks = append(chunks, current.String())
				current.Reset()
			}
			chunks = append(chunks, splitLongString(p, maxChars)...)
			continue
		}
		if current.Len() > 0 && current.Len()+1+len(p) > maxChars {
			chunks = append(chunks, current.String())
			current.Reset()
		}
		if current.Len() > 0 {
			current.WriteString(" ")
		}
		current.WriteString(p)
	}
	if current.Len() > 0 {
		chunks = append(chunks, current.String())
	}
	if len(chunks) == 0 {
		return []string{""}
	}
	return chunks
}

func splitLongString(s string, maxChars int) []string {
	var parts []string
	runes := []rune(s)
	for len(runes) > maxChars {
		cut := maxChars
		for cut > maxChars/2 && !unicode.IsSpace(runes[cut]) {
			cut--
		}
		parts = append(parts, strings.TrimSpace(string(runes[:cut])))
		runes = runes[cut:]
	}
	if rest := strings.TrimSpace(string(runes)); rest != "" {
		parts = append(parts, rest)
	}
	return parts
}

func compactStrings(vals ...string) []string {
	var out []string
	for _, v := range vals {
		if t := strings.TrimSpace(v); t != "" {
			out = append(out, t)
		}
	}
	return out
}

func appendUnique(slice []string, item string) []string {
	for _, existing := range slice {
		if strings.EqualFold(existing, item) {
			return slice
		}
	}
	return append(slice, item)
}

package email_test

import (
	"testing"

	"github.com/spilecms/spile/api/internal/email"
	"github.com/spilecms/spile/api/internal/models"
	"github.com/stretchr/testify/assert"
)

func TestRenderNewsletterHTML_Fallback(t *testing.T) {
	nl := &models.Newsletter{
		Title:       "Weekly Digest #1",
		PreviewText: "Highlights of this week's open source news.",
		Content:     "",
	}

	html := email.RenderNewsletterHTML(nl)
	assert.Contains(t, html, "Weekly Digest #1")
	assert.Contains(t, html, "Highlights of this week&#39;s open source news.")
	assert.Contains(t, html, "Spile CMS")
}

func TestRenderBlockNoteJSONToHTML_HeadingsAndParagraphs(t *testing.T) {
	contentJSON := `[
		{
			"type": "heading",
			"props": { "level": 1 },
			"content": [{ "type": "text", "text": "Main Heading" }]
		},
		{
			"type": "paragraph",
			"content": [
				{ "type": "text", "text": "This is " },
				{ "type": "text", "text": "bold", "styles": { "bold": true } },
				{ "type": "text", "text": " and " },
				{ "type": "text", "text": "italic", "styles": { "italic": true } },
				{ "type": "text", "text": " text." }
			]
		}
	]`

	html := email.RenderBlockNoteJSONToHTML(contentJSON)
	assert.Contains(t, html, "<h1")
	assert.Contains(t, html, "Main Heading")
	assert.Contains(t, html, "<strong>bold</strong>")
	assert.Contains(t, html, "<em>italic</em>")
}

func TestRenderBlockNoteJSONToHTML_ListsAndCode(t *testing.T) {
	contentJSON := `[
		{
			"type": "bulletListItem",
			"content": [{ "type": "text", "text": "First bullet" }]
		},
		{
			"type": "bulletListItem",
			"content": [{ "type": "text", "text": "Second bullet" }]
		},
		{
			"type": "codeBlock",
			"content": [{ "type": "text", "text": "fmt.Println(\"Hello <world>\")" }]
		}
	]`

	html := email.RenderBlockNoteJSONToHTML(contentJSON)
	assert.Contains(t, html, "<ul")
	assert.Contains(t, html, "First bullet")
	assert.Contains(t, html, "Second bullet")
	assert.Contains(t, html, "</ul>")
	assert.Contains(t, html, "<pre")
	assert.Contains(t, html, "fmt.Println(&#34;Hello &lt;world&gt;&#34;)")
}

func TestRenderBlockNoteJSONToHTML_CalloutAndQuote(t *testing.T) {
	contentJSON := `[
		{
			"type": "blockquote",
			"content": [{ "type": "text", "text": "The greatest glory in living lies not in never falling." }]
		},
		{
			"type": "callout",
			"content": [{ "type": "text", "text": "Pro tip: Always backup your database." }]
		},
		{
			"type": "paragraph",
			"content": [
				{
					"type": "link",
					"href": "https://spile.io",
					"content": [{ "type": "text", "text": "Visit Website" }]
				}
			]
		}
	]`

	html := email.RenderBlockNoteJSONToHTML(contentJSON)
	assert.Contains(t, html, "<blockquote")
	assert.Contains(t, html, "The greatest glory in living lies not in never falling.")
	assert.Contains(t, html, "background-color: #f0fdf4")
	assert.Contains(t, html, "Pro tip: Always backup your database.")
	assert.Contains(t, html, "<a href=\"https://spile.io\"")
	assert.Contains(t, html, "Visit Website")
}

func TestRenderBlockNoteJSONToHTML_Image(t *testing.T) {
	contentJSON := `[
		{
			"type": "image",
			"props": {
				"url": "https://spile.io/logo.png",
				"caption": "Spile Logo"
			}
		}
	]`

	html := email.RenderBlockNoteJSONToHTML(contentJSON)
	assert.Contains(t, html, "<img src=\"https://spile.io/logo.png\"")
	assert.Contains(t, html, "Spile Logo")
}

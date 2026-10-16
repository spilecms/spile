package email

import (
	"encoding/json"
	"fmt"
	"html"
	"strings"

	"github.com/spilecms/spile/api/internal/models"
)

// BlockNoteInline represents an inline formatted text or link node in BlockNote JSON.
type BlockNoteInline struct {
	Type    string            `json:"type"`
	Text    string            `json:"text"`
	Styles  map[string]any    `json:"styles,omitempty"`
	Href    string            `json:"href,omitempty"`
	Content []BlockNoteInline `json:"content,omitempty"`
}

// BlockNoteBlock represents an individual block item in BlockNote JSON.
type BlockNoteBlock struct {
	ID       string            `json:"id"`
	Type     string            `json:"type"`
	Props    map[string]any    `json:"props,omitempty"`
	Content  []BlockNoteInline `json:"content,omitempty"`
	Children []BlockNoteBlock  `json:"children,omitempty"`
}

// RenderNewsletterHTML converts a Newsletter model with its BlockNote editor content
// into clean, responsive, email-client-safe HTML.
func RenderNewsletterHTML(nl *models.Newsletter) string {
	if nl == nil {
		return ""
	}

	bodyContent := RenderBlockNoteJSONToHTML(nl.Content)
	if strings.TrimSpace(bodyContent) == "" && strings.TrimSpace(nl.PreviewText) != "" {
		bodyContent = fmt.Sprintf("<p style=\"font-size: 16px; line-height: 1.6; color: #374151; margin: 0 0 16px;\">%s</p>", html.EscapeString(nl.PreviewText))
	}

	title := html.EscapeString(nl.Title)
	previewText := html.EscapeString(nl.PreviewText)

	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>%s</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: 100%%;">
  <!-- Preheader text for inbox preview -->
  <div style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    %s
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%%" style="background-color: #f4f4f5; padding: 24px 0;">
    <tr>
      <td align="center">
        <!-- Main Email Container (600px width) -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e4e4e7; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 16px; border-bottom: 1px solid #f4f4f5;">
              <h1 style="margin: 0; font-size: 26px; font-weight: 700; color: #09090b; line-height: 1.3;">%s</h1>
            </td>
          </tr>
          <!-- Content Body -->
          <tr>
            <td style="padding: 24px 32px; color: #27272a; font-size: 16px; line-height: 1.6;">
              %s
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #fafafa; border-top: 1px solid #f4f4f5; text-align: center; color: #71717a; font-size: 13px; line-height: 1.5;">
              <p style="margin: 0 0 8px;">Published with <strong>Spile CMS</strong></p>
              <p style="margin: 0; color: #a1a1aa;">You are receiving this because you subscribed to our newsletter.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`, title, previewText, title, bodyContent)
}

// RenderBlockNoteJSONToHTML deserializes BlockNote JSON and converts all blocks to email-safe HTML.
func RenderBlockNoteJSONToHTML(contentJSON string) string {
	raw := strings.TrimSpace(contentJSON)
	if raw == "" || raw == "null" || raw == "[]" {
		return ""
	}

	var blocks []BlockNoteBlock
	// Attempt parsing as direct array of BlockNote blocks
	if err := json.Unmarshal([]byte(raw), &blocks); err != nil {
		// Attempt parsing as { "blocks": [...] } (Editor.js fallback)
		var wrapper struct {
			Blocks []BlockNoteBlock `json:"blocks"`
		}
		if errWrapper := json.Unmarshal([]byte(raw), &wrapper); errWrapper == nil && len(wrapper.Blocks) > 0 {
			blocks = wrapper.Blocks
		} else {
			// If not JSON, render as plain paragraph
			return fmt.Sprintf("<p style=\"margin: 0 0 16px; line-height: 1.6;\">%s</p>", html.EscapeString(raw))
		}
	}

	return renderBlocks(blocks)
}

func renderBlocks(blocks []BlockNoteBlock) string {
	var sb strings.Builder
	inBulletList := false
	inNumberedList := false

	closeLists := func() {
		if inBulletList {
			sb.WriteString("</ul>\n")
			inBulletList = false
		}
		if inNumberedList {
			sb.WriteString("</ol>\n")
			inNumberedList = false
		}
	}

	for _, block := range blocks {
		switch block.Type {
		case "bulletListItem":
			if inNumberedList {
				sb.WriteString("</ol>\n")
				inNumberedList = false
			}
			if !inBulletList {
				sb.WriteString("<ul style=\"margin: 0 0 16px; padding-left: 24px; color: #27272a;\">\n")
				inBulletList = true
			}
			sb.WriteString(fmt.Sprintf("  <li style=\"margin-bottom: 6px; line-height: 1.6;\">%s", renderInlines(block.Content)))
			if len(block.Children) > 0 {
				sb.WriteString(renderBlocks(block.Children))
			}
			sb.WriteString("</li>\n")
			continue

		case "numberedListItem":
			if inBulletList {
				sb.WriteString("</ul>\n")
				inBulletList = false
			}
			if !inNumberedList {
				sb.WriteString("<ol style=\"margin: 0 0 16px; padding-left: 24px; color: #27272a;\">\n")
				inNumberedList = true
			}
			sb.WriteString(fmt.Sprintf("  <li style=\"margin-bottom: 6px; line-height: 1.6;\">%s", renderInlines(block.Content)))
			if len(block.Children) > 0 {
				sb.WriteString(renderBlocks(block.Children))
			}
			sb.WriteString("</li>\n")
			continue

		default:
			closeLists()
		}

		switch block.Type {
		case "paragraph":
			text := renderInlines(block.Content)
			if strings.TrimSpace(text) == "" {
				text = "&nbsp;"
			}
			sb.WriteString(fmt.Sprintf("<p style=\"margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #27272a;\">%s</p>\n", text))

		case "heading":
			level := 2
			if block.Props != nil {
				if l, ok := block.Props["level"].(float64); ok && l >= 1 && l <= 6 {
					level = int(l)
				}
			}
			switch level {
			case 1:
				sb.WriteString(fmt.Sprintf("<h1 style=\"margin: 28px 0 12px; font-size: 24px; font-weight: 700; color: #09090b; line-height: 1.3;\">%s</h1>\n", renderInlines(block.Content)))
			case 2:
				sb.WriteString(fmt.Sprintf("<h2 style=\"margin: 24px 0 12px; font-size: 20px; font-weight: 600; color: #09090b; line-height: 1.35;\">%s</h2>\n", renderInlines(block.Content)))
			case 3:
				sb.WriteString(fmt.Sprintf("<h3 style=\"margin: 20px 0 8px; font-size: 17px; font-weight: 600; color: #18181b; line-height: 1.4;\">%s</h3>\n", renderInlines(block.Content)))
			default:
				sb.WriteString(fmt.Sprintf("<h4 style=\"margin: 16px 0 8px; font-size: 15px; font-weight: 600; color: #18181b;\">%s</h4>\n", renderInlines(block.Content)))
			}

		case "checkListItem":
			checked := false
			if block.Props != nil {
				if chk, ok := block.Props["checked"].(bool); ok {
					checked = chk
				}
			}
			icon := "☐"
			textColor := "#27272a"
			if checked {
				icon = "☑"
				textColor = "#71717a"
			}
			sb.WriteString(fmt.Sprintf("<p style=\"margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: %s;\"><span style=\"margin-right: 8px; font-size: 18px;\">%s</span>%s</p>\n", textColor, icon, renderInlines(block.Content)))

		case "blockquote":
			sb.WriteString(fmt.Sprintf("<blockquote style=\"margin: 16px 0; padding: 8px 16px; border-left: 4px solid #6366f1; background-color: #f8fafc; color: #475569; font-style: italic; border-radius: 0 4px 4px 0;\">%s</blockquote>\n", renderInlines(block.Content)))

		case "callout":
			sb.WriteString(fmt.Sprintf("<div style=\"margin: 16px 0; padding: 14px 18px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; color: #166534; font-size: 15px; line-height: 1.5;\">%s</div>\n", renderInlines(block.Content)))

		case "codeBlock":
			codeText := extractRawText(block.Content)
			sb.WriteString(fmt.Sprintf("<pre style=\"margin: 16px 0; padding: 14px; background-color: #18181b; color: #fafafa; border-radius: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 13px; line-height: 1.5; overflow-x: auto;\"><code>%s</code></pre>\n", html.EscapeString(codeText)))

		case "codeGroup":
			if block.Props != nil {
				if tabsStr, ok := block.Props["tabsJson"].(string); ok && tabsStr != "" {
					var tabs []struct {
						Label string `json:"label"`
						Code  string `json:"code"`
					}
					if err := json.Unmarshal([]byte(tabsStr), &tabs); err == nil && len(tabs) > 0 {
						for _, t := range tabs {
							sb.WriteString(fmt.Sprintf("<div style=\"margin: 16px 0;\"><div style=\"font-size: 12px; font-weight: 600; color: #71717a; text-transform: uppercase; margin-bottom: 4px;\">%s</div><pre style=\"margin: 0; padding: 14px; background-color: #18181b; color: #fafafa; border-radius: 6px; font-family: monospace; font-size: 13px;\"><code>%s</code></pre></div>\n", html.EscapeString(t.Label), html.EscapeString(t.Code)))
						}
					}
				}
			}

		case "mathBlock":
			formula := ""
			if block.Props != nil {
				if f, ok := block.Props["formula"].(string); ok {
					formula = f
				}
			}
			if formula == "" {
				formula = extractRawText(block.Content)
			}
			sb.WriteString(fmt.Sprintf("<div style=\"margin: 16px 0; padding: 12px; background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 6px; text-align: center; font-family: 'KaTeX_Math', Times, serif; font-size: 17px; color: #18181b;\">$$ %s $$</div>\n", html.EscapeString(formula)))

		case "image":
			url := ""
			caption := ""
			if block.Props != nil {
				if u, ok := block.Props["url"].(string); ok {
					url = u
				}
				if c, ok := block.Props["caption"].(string); ok {
					caption = c
				}
			}
			if url != "" {
				sb.WriteString(fmt.Sprintf("<div style=\"margin: 20px 0; text-align: center;\"><img src=\"%s\" alt=\"%s\" style=\"max-width: 100%%; height: auto; border-radius: 6px; display: inline-block;\">", html.EscapeString(url), html.EscapeString(caption)))
				if caption != "" {
					sb.WriteString(fmt.Sprintf("<p style=\"margin: 6px 0 0; font-size: 13px; color: #71717a;\">%s</p>", html.EscapeString(caption)))
				}
				sb.WriteString("</div>\n")
			}

		case "divider":
			sb.WriteString("<hr style=\"border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;\">\n")

		default:
			// Fallback: render any block with content as a paragraph
			if len(block.Content) > 0 {
				sb.WriteString(fmt.Sprintf("<p style=\"margin: 0 0 16px; font-size: 16px; line-height: 1.6;\">%s</p>\n", renderInlines(block.Content)))
			}
		}

		if len(block.Children) > 0 && block.Type != "bulletListItem" && block.Type != "numberedListItem" {
			sb.WriteString(renderBlocks(block.Children))
		}
	}

	closeLists()
	return sb.String()
}

func renderInlines(inlines []BlockNoteInline) string {
	var sb strings.Builder
	for _, inline := range inlines {
		if inline.Type == "link" && inline.Href != "" {
			linkText := inline.Text
			if len(inline.Content) > 0 {
				linkText = renderInlines(inline.Content)
			} else {
				linkText = html.EscapeString(linkText)
			}
			sb.WriteString(fmt.Sprintf("<a href=\"%s\" style=\"color: #4f46e5; text-decoration: underline;\">%s</a>", html.EscapeString(inline.Href), linkText))
			continue
		}

		text := html.EscapeString(inline.Text)
		if len(inline.Styles) == 0 {
			sb.WriteString(text)
			continue
		}

		if b, ok := inline.Styles["bold"].(bool); ok && b {
			text = fmt.Sprintf("<strong>%s</strong>", text)
		}
		if i, ok := inline.Styles["italic"].(bool); ok && i {
			text = fmt.Sprintf("<em>%s</em>", text)
		}
		if u, ok := inline.Styles["underline"].(bool); ok && u {
			text = fmt.Sprintf("<u>%s</u>", text)
		}
		if s, ok := inline.Styles["strike"].(bool); ok && s {
			text = fmt.Sprintf("<s>%s</s>", text)
		}
		if c, ok := inline.Styles["code"].(bool); ok && c {
			text = fmt.Sprintf("<code style=\"background-color: #f4f4f5; padding: 2px 5px; border-radius: 4px; font-family: monospace; font-size: 0.9em; color: #09090b;\">%s</code>", text)
		}
		if color, ok := inline.Styles["textColor"].(string); ok && color != "" {
			text = fmt.Sprintf("<span style=\"color: %s;\">%s</span>", html.EscapeString(color), text)
		}

		sb.WriteString(text)
	}
	return sb.String()
}

func extractRawText(inlines []BlockNoteInline) string {
	var sb strings.Builder
	for _, in := range inlines {
		sb.WriteString(in.Text)
		if len(in.Content) > 0 {
			sb.WriteString(extractRawText(in.Content))
		}
	}
	return sb.String()
}

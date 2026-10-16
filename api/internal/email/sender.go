package email

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/smtp"
	"strings"
	"time"

	"github.com/spilecms/spile/api/internal/models"
	"gorm.io/gorm"
)

type Config struct {
	Provider   string `json:"provider"`
	FromName   string `json:"fromName"`
	FromEmail  string `json:"fromEmail"`
	ReplyTo    string `json:"replyTo"`
	ApiKey     string `json:"apiKey"`
	SmtpHost   string `json:"smtpHost"`
	SmtpPort   int    `json:"smtpPort"`
	SmtpUser   string `json:"smtpUser"`
	SmtpPass   string `json:"smtpPass"`
	SmtpSecure bool   `json:"smtpSecure"`
}

func LoadConfig(db *gorm.DB) Config {
	cfg := Config{
		Provider:  "resend",
		FromName:  "Spile Editorial Team",
		FromEmail: "newsletter@spile.io",
		ReplyTo:   "team@spile.io",
		SmtpPort:  587,
	}
	if db == nil {
		return cfg
	}
	var s models.SystemSetting
	if err := db.First(&s, "key = ?", "email").Error; err == nil {
		_ = json.Unmarshal([]byte(s.ValueJSON), &cfg)
	}
	return cfg
}

// IsConfigured returns true if a valid email provider configuration exists and has required credentials.
func IsConfigured(db *gorm.DB) (bool, string) {
	cfg := LoadConfig(db)
	provider := strings.ToLower(strings.TrimSpace(cfg.Provider))
	if provider == "mock" || provider == "dev" || provider == "test" {
		return true, ""
	}
	if strings.TrimSpace(cfg.FromEmail) == "" {
		return false, "Sender email address is not configured"
	}
	switch provider {
	case "smtp":
		if strings.TrimSpace(cfg.SmtpHost) == "" {
			return false, "SMTP host is not configured"
		}
		return true, ""
	case "resend":
		if strings.TrimSpace(cfg.ApiKey) == "" {
			return false, "Resend API key is not configured"
		}
		return true, ""
	case "ses", "amazon_ses":
		if strings.TrimSpace(cfg.ApiKey) == "" {
			return false, "Amazon SES credentials are not configured"
		}
		return true, ""
	default:
		if strings.TrimSpace(cfg.ApiKey) == "" && strings.TrimSpace(cfg.SmtpHost) == "" {
			return false, fmt.Sprintf("%s credentials are not configured", cfg.Provider)
		}
		return true, ""
	}
}

// Send transmits an email using the configured provider (Resend API or SMTP).
// Returns an error if the email provider credentials are not configured.
func Send(db *gorm.DB, toEmail, subject, htmlBody, fromNameOverride, fromEmailOverride string) error {
	if configured, reason := IsConfigured(db); !configured {
		return fmt.Errorf("email service is not configured: %s", reason)
	}

	cfg := LoadConfig(db)

	fromName := cfg.FromName
	if strings.TrimSpace(fromNameOverride) != "" {
		fromName = strings.TrimSpace(fromNameOverride)
	}
	fromEmail := cfg.FromEmail
	if strings.TrimSpace(fromEmailOverride) != "" {
		fromEmail = strings.TrimSpace(fromEmailOverride)
	}
	fromHeader := fmt.Sprintf("%s <%s>", fromName, fromEmail)

	provider := strings.ToLower(strings.TrimSpace(cfg.Provider))
	if provider == "mock" || provider == "dev" || provider == "test" {
		log.Printf("[email:%s] To=%s Subject=%q From=%s", provider, toEmail, subject, fromHeader)
		return nil
	}

	if provider == "smtp" {
		port := cfg.SmtpPort
		if port == 0 {
			port = 587
		}
		addr := fmt.Sprintf("%s:%d", cfg.SmtpHost, port)
		var smtpAuth smtp.Auth
		if cfg.SmtpUser != "" {
			smtpAuth = smtp.PlainAuth("", cfg.SmtpUser, cfg.SmtpPass, cfg.SmtpHost)
		}
		msg := fmt.Sprintf(
			"From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=\"UTF-8\"\r\n\r\n%s",
			fromHeader,
			toEmail,
			subject,
			htmlBody,
		)
		return smtp.SendMail(addr, smtpAuth, fromEmail, []string{toEmail}, []byte(msg))
	}

	// Resend / HTTP API provider
	payload := map[string]any{
		"from":    fromHeader,
		"to":      []string{toEmail},
		"subject": subject,
		"html":    htmlBody,
	}
	if cfg.ReplyTo != "" {
		payload["reply_to"] = cfg.ReplyTo
	}
	bodyBytes, _ := json.Marshal(payload)

	req, err := http.NewRequest(http.MethodPost, "https://api.resend.com/emails", bytes.NewReader(bodyBytes))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+cfg.ApiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("email provider returned status %d", resp.StatusCode)
	}
	return nil
}

package webhook

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/spilecms/spile/api/internal/models"
	"gorm.io/gorm"
)

type WebhookPayload struct {
	Event     string `json:"event"`
	Timestamp int64  `json:"timestamp"`
	Data      any    `json:"data"`
}

// ComputeSignature calculates the HMAC-SHA256 signature for a webhook payload using the shared secret.
func ComputeSignature(payload []byte, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	return hex.EncodeToString(mac.Sum(nil))
}

// Dispatch asynchronously sends an HTTP POST payload to all active webhooks subscribed to the given event.
// If the webhook has a secret configured, an HMAC-SHA256 signature is included in the X-Spile-Signature header.
func Dispatch(db *gorm.DB, event string, data any) {
	if db == nil || event == "" {
		return
	}

	go func() {
		var webhooks []models.Webhook
		if err := db.Where("active = ?", true).Find(&webhooks).Error; err != nil || len(webhooks) == 0 {
			return
		}

		timestamp := time.Now().UnixMilli()
		bodyBytes, err := json.Marshal(WebhookPayload{
			Event:     event,
			Timestamp: timestamp,
			Data:      data,
		})
		if err != nil {
			return
		}

		client := &http.Client{Timeout: 10 * time.Second}

		for _, wh := range webhooks {
			var events []string
			_ = json.Unmarshal([]byte(wh.EventsJSON), &events)

			matched := false
			for _, evt := range events {
				if evt == event || evt == "*" {
					matched = true
					break
				}
			}
			if !matched {
				continue
			}

			req, err := http.NewRequest(http.MethodPost, wh.URL, bytes.NewReader(bodyBytes))
			if err != nil {
				continue
			}
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("User-Agent", "Spile-CMS-Webhook/1.0")
			req.Header.Set("X-Spile-Event", event)
			req.Header.Set("X-Spile-Timestamp", strconv.FormatInt(timestamp, 10))

			if wh.Secret != "" {
				sig := ComputeSignature(bodyBytes, wh.Secret)
				req.Header.Set("X-Spile-Signature", "sha256="+sig)
			}

			resp, err := client.Do(req)
			if err != nil {
				log.Printf("[webhook] delivery failed for %s (%s): %v", wh.Name, wh.URL, err)
				continue
			}
			_ = resp.Body.Close()
		}
	}()
}

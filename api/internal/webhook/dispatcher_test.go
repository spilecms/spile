package webhook_test

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/spilecms/spile/api/internal/models"
	"github.com/spilecms/spile/api/internal/testutils"
	"github.com/spilecms/spile/api/internal/webhook"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestWebhook_HMACSignatureAndDispatch(t *testing.T) {
	app := testutils.NewTestApp(t)

	secret := "whsec_supersecretkey123"
	var receivedHeaderSig string
	var receivedTimestamp string
	var receivedEvent string
	var receivedBody []byte
	var wg sync.WaitGroup
	wg.Add(1)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedHeaderSig = r.Header.Get("X-Spile-Signature")
		receivedTimestamp = r.Header.Get("X-Spile-Timestamp")
		receivedEvent = r.Header.Get("X-Spile-Event")
		receivedBody, _ = io.ReadAll(r.Body)
		w.WriteHeader(http.StatusOK)
		wg.Done()
	}))
	defer server.Close()

	eventsJSON, _ := json.Marshal([]string{"post.published"})
	wh := models.Webhook{
		Name:       "Test HMAC Hook",
		URL:        server.URL,
		EventsJSON: string(eventsJSON),
		Secret:     secret,
		Active:     true,
	}
	app.DB.Create(&wh)

	testData := map[string]string{"title": "Spile Launch v0.1.0"}
	webhook.Dispatch(app.DB, "post.published", testData)

	// Wait with timeout for the background goroutine to deliver the webhook
	done := make(chan struct{})
	go func() {
		wg.Wait()
		close(done)
	}()

	select {
	case <-done:
	case <-time.After(3 * time.Second):
		t.Fatal("Webhook delivery timed out")
	}

	assert.Equal(t, "post.published", receivedEvent)
	assert.NotEmpty(t, receivedTimestamp)
	assert.NotEmpty(t, receivedHeaderSig)

	expectedSig := "sha256=" + webhook.ComputeSignature(receivedBody, secret)
	assert.Equal(t, expectedSig, receivedHeaderSig)

	var payload webhook.WebhookPayload
	err := json.Unmarshal(receivedBody, &payload)
	require.NoError(t, err)
	assert.Equal(t, "post.published", payload.Event)
}

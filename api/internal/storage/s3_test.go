package storage_test

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/spilecms/spile/api/internal/storage"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestS3StorageProvider_SaveAndDelete(t *testing.T) {
	var receivedAuth string
	var receivedMethod string
	var receivedPath string

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedMethod = r.Method
		receivedPath = r.URL.Path
		receivedAuth = r.Header.Get("Authorization")
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	prov, err := storage.NewS3StorageProvider(storage.S3Config{
		Provider:  "r2",
		Bucket:    "media",
		Endpoint:  server.URL,
		Region:    "auto",
		AccessKey: "test-access-key",
		SecretKey: "test-secret-key",
		PublicURL: "https://cdn.example.com",
	})
	require.NoError(t, err)

	// 1. Test Save
	content := []byte("fake-image-bytes")
	fileURL, size, err := prov.Save("hero-banner.png", bytes.NewReader(content))
	require.NoError(t, err)

	assert.Equal(t, int64(len(content)), size)
	assert.True(t, strings.HasPrefix(fileURL, "https://cdn.example.com/hero-banner-"))
	assert.True(t, strings.HasSuffix(fileURL, ".png"))
	assert.Equal(t, http.MethodPut, receivedMethod)
	assert.True(t, strings.HasPrefix(receivedPath, "/media/hero-banner-"))
	assert.Contains(t, receivedAuth, "AWS4-HMAC-SHA256 Credential=test-access-key")

	// 2. Test Delete
	err = prov.Delete(fileURL)
	require.NoError(t, err)
	assert.Equal(t, http.MethodDelete, receivedMethod)
	assert.True(t, strings.HasPrefix(receivedPath, "/media/hero-banner-"))
}

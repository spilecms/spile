package sigv4_test

import (
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/spilecms/spile/api/internal/sigv4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSigV4_SignRequest(t *testing.T) {
	req, err := http.NewRequest(http.MethodPut, "https://mybucket.s3.us-east-1.amazonaws.com/test.jpg", strings.NewReader("image-content"))
	require.NoError(t, err)

	now := time.Date(2026, 10, 16, 12, 0, 0, 0, time.UTC)
	err = sigv4.SignRequest(req, []byte("image-content"), "AKIAIOSFODNN7EXAMPLE", "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY", "us-east-1", "s3", now)
	require.NoError(t, err)

	auth := req.Header.Get("Authorization")
	assert.NotEmpty(t, auth)
	assert.True(t, strings.HasPrefix(auth, "AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20261016/us-east-1/s3/aws4_request"))
	assert.Contains(t, auth, "SignedHeaders=")
	assert.Contains(t, auth, "Signature=")

	assert.Equal(t, "20261016T120000Z", req.Header.Get("x-amz-date"))
	assert.NotEmpty(t, req.Header.Get("x-amz-content-sha256"))
}

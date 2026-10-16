package routes_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/spilecms/spile/api/internal/routes"
	"github.com/stretchr/testify/assert"
)

func TestRateLimiter(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	limiter := routes.NewRateLimiter(3, 200*time.Millisecond)
	r.GET("/limited", limiter.Middleware(), func(c *gin.Context) {
		c.String(http.StatusOK, "ok")
	})

	// First 3 requests should succeed
	for i := 0; i < 3; i++ {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/limited", nil)
		req.RemoteAddr = "192.168.1.100:12345"
		r.ServeHTTP(w, req)
		assert.Equal(t, http.StatusOK, w.Code)
	}

	// 4th request should be blocked with 429 Too Many Requests
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/limited", nil)
	req.RemoteAddr = "192.168.1.100:12345"
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusTooManyRequests, w.Code)
	assert.Contains(t, w.Body.String(), "Too many requests")

	// Wait for window to reset
	time.Sleep(250 * time.Millisecond)

	// Should succeed again after window reset
	wReset := httptest.NewRecorder()
	reqReset, _ := http.NewRequest("GET", "/limited", nil)
	reqReset.RemoteAddr = "192.168.1.100:12345"
	r.ServeHTTP(wReset, reqReset)
	assert.Equal(t, http.StatusOK, wReset.Code)
}

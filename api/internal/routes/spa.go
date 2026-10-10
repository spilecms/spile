package routes

import (
	"io/fs"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// RegisterSPA mounts an embedded filesystem for Single Page Application serving
func RegisterSPA(r *gin.Engine, distFS fs.FS) {
	if distFS == nil {
		return
	}

	fileServer := http.FileServer(http.FS(distFS))

	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path

		// Never intercept API routes or uploads
		if strings.HasPrefix(path, "/api") || strings.HasPrefix(path, "/uploads") {
			c.JSON(http.StatusNotFound, gin.H{"error": "Endpoint not found"})
			return
		}

		// Only handle GET and HEAD requests
		if c.Request.Method != http.MethodGet && c.Request.Method != http.MethodHead {
			c.Status(http.StatusMethodNotAllowed)
			return
		}

		// Check if the requested static asset exists in embedded files (e.g. assets/*.js, favicon.ico)
		trimmedPath := strings.TrimPrefix(path, "/")
		if trimmedPath != "" {
			if f, err := distFS.Open(trimmedPath); err == nil {
				_ = f.Close()
				fileServer.ServeHTTP(c.Writer, c.Request)
				return
			}
		}

		// SPA Fallback: serve index.html for all frontend routes (e.g. /dashboard, /editor, /settings)
		indexBytes, err := fs.ReadFile(distFS, "index.html")
		if err != nil {
			c.String(http.StatusNotFound, "Embedded frontend index.html not found")
			return
		}

		c.Data(http.StatusOK, "text/html; charset=utf-8", indexBytes)
	})
}

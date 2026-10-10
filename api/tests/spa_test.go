package tests

import (
	"net/http"
	"testing"

	"github.com/spilecms/spile/api/internal/routes"
	"github.com/spilecms/spile/api/internal/testutils"
	"github.com/spilecms/spile/web"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestEmbeddedSPA_Serving(t *testing.T) {
	app := testutils.NewTestApp(t)

	distFS, err := web.DistFS()
	require.NoError(t, err)

	// Mount SPA
	routes.RegisterSPA(app.Router, distFS)

	// 1. Root route "/" should serve embedded index.html
	rootRes := app.Client().Get("/")
	assert.Equal(t, http.StatusOK, rootRes.Code)
	assert.Contains(t, rootRes.Body.String(), "<html")

	// 2. Client-side route (e.g. /dashboard/posts) should fallback to index.html
	spaRouteRes := app.Client().Get("/dashboard/posts")
	assert.Equal(t, http.StatusOK, spaRouteRes.Code)
	assert.Contains(t, spaRouteRes.Body.String(), "<html")

	// 3. API route should not be intercepted by SPA
	apiRes := app.Client().Get("/api/v1/health")
	assert.Equal(t, http.StatusOK, apiRes.Code)
	assert.Contains(t, apiRes.Body.String(), `"status":"ok"`)

	// 4. Missing API route should return 404 JSON, not HTML
	api404Res := app.Client().Get("/api/v1/nonexistent")
	assert.Equal(t, http.StatusNotFound, api404Res.Code)
	assert.Contains(t, api404Res.Body.String(), "Endpoint not found")
}

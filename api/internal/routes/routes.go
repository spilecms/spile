package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/spilecms/spile/api/internal/auth"
	"github.com/spilecms/spile/api/internal/handlers"
	"github.com/spilecms/spile/api/internal/models"
	"github.com/spilecms/spile/api/internal/search"
	"github.com/spilecms/spile/api/internal/storage"
	"gorm.io/gorm"
)

// SetupRouter initializes Gin engine with all routes and middlewares
func SetupRouter(db *gorm.DB, storageProvider storage.Provider) *gin.Engine {
	r := gin.New()
	r.Use(gin.Recovery())

	// Enable CORS for headless frontend clients and local dev servers
	r.Use(func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin != "" {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Access-Control-Allow-Credentials", "true")
		} else {
			c.Header("Access-Control-Allow-Origin", "*")
		}
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, X-Requested-With, If-None-Match")
		c.Header("Access-Control-Expose-Headers", "ETag")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	})

	// Static serving of uploaded files if using local disk
	if local, ok := storageProvider.(*storage.LocalStorageProvider); ok {
		r.Static(local.PublicURL, local.BaseDir)
	}

	// Attach authentication context to every request
	r.Use(auth.AuthenticateMiddleware(db))

	searcher, _ := search.NewSQLiteSearcher(db)

	v1 := r.Group("/api/v1")
	{
		// Health check & OpenAPI specification
		v1.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"status": "ok"})
		})
		v1.GET("/openapi.json", handlers.ServeOpenAPISpec)
		v1.GET("/openapi", handlers.ServeOpenAPIDocs)

		// Full-Text Search route (supports both pk_live_... and admin JWT)
		searchHandler := handlers.NewSearchHandler(db, searcher)
		v1.GET("/search", auth.RequireAuth(), searchHandler.Search)

		// Auth routes
		authHandler := handlers.NewAuthHandler(db)
		authGroup := v1.Group("/auth")
		{
			authGroup.POST("/register", authHandler.Register)
			authGroup.POST("/login", authHandler.Login)
			authGroup.GET("/me", auth.RequireAuth(), authHandler.Me)
			authGroup.POST("/logout", auth.RequireAuth(), authHandler.Logout)
		}

		// User & Team management routes
		userHandler := handlers.NewUserHandler(db)
		userGroup := v1.Group("/users")
		userGroup.Use(auth.RequireAuth())
		{
			userGroup.GET("", userHandler.List)
			userGroup.PUT("/profile", userHandler.UpdateProfile)
			userGroup.POST("/invite", auth.RequireRoles(models.RoleAdmin, models.RoleOwner), userHandler.Invite)
			userGroup.PUT("/:id/role", auth.RequireRoles(models.RoleAdmin, models.RoleOwner), userHandler.UpdateRole)
			userGroup.DELETE("/:id", auth.RequireRoles(models.RoleAdmin, models.RoleOwner), userHandler.Delete)
		}

		// Tags routes
		tagHandler := handlers.NewTagHandler(db)
		tagGroup := v1.Group("/tags")
		tagGroup.Use(auth.RequireAuth())
		{
			tagGroup.GET("", tagHandler.List)
			tagGroup.POST("", auth.RequireRoles(models.RoleAuthor, models.RoleEditor, models.RoleAdmin, models.RoleOwner), tagHandler.Create)
			tagGroup.PUT("/:id", auth.RequireRoles(models.RoleAuthor, models.RoleEditor, models.RoleAdmin, models.RoleOwner), tagHandler.Update)
			tagGroup.DELETE("/:id", auth.RequireRoles(models.RoleEditor, models.RoleAdmin, models.RoleOwner), tagHandler.Delete)
		}

		// Locales routes
		localeHandler := handlers.NewLocaleHandler(db)
		localeGroup := v1.Group("/locales")
		localeGroup.Use(auth.RequireAuth())
		{
			localeGroup.GET("", localeHandler.List)
			localeGroup.POST("", auth.RequireRoles(models.RoleAdmin, models.RoleOwner), localeHandler.Create)
			localeGroup.PUT("/:code/default", auth.RequireRoles(models.RoleAdmin, models.RoleOwner), localeHandler.SetDefault)
			localeGroup.DELETE("/:code", auth.RequireRoles(models.RoleAdmin, models.RoleOwner), localeHandler.Delete)
		}

		// Posts routes
		postHandler := handlers.NewPostHandler(db, searcher)
		postGroup := v1.Group("/posts")
		postGroup.Use(auth.RequireAuth())
		{
			postGroup.GET("", postHandler.List)
			postGroup.GET("/:id", postHandler.Get)
			postGroup.POST("", postHandler.Create)
			postGroup.PUT("/:id", postHandler.Update)
			postGroup.DELETE("/:id", auth.RequireRoles(models.RoleAuthor, models.RoleEditor, models.RoleAdmin, models.RoleOwner), postHandler.Delete)
			postGroup.POST("/:id/duplicate", postHandler.Duplicate)
			postGroup.GET("/translations/:groupId", postHandler.GetTranslations)
			postGroup.POST("/:id/translations", postHandler.CreateTranslation)
		}

		// Media routes
		if storageProvider != nil {
			mediaHandler := handlers.NewMediaHandler(db, storageProvider)
			mediaGroup := v1.Group("/media")
			mediaGroup.Use(auth.RequireAuth())
			{
				mediaGroup.GET("", mediaHandler.List)
				mediaGroup.GET("/stats", mediaHandler.Stats)
				mediaGroup.GET("/tags", mediaHandler.Tags)
				mediaGroup.GET("/:id", mediaHandler.Get)
				mediaGroup.POST("/upload", mediaHandler.Upload)
				mediaGroup.PUT("/:id", mediaHandler.Update)
				mediaGroup.DELETE("/:id", mediaHandler.Delete)
				mediaGroup.POST("/bulk-delete", mediaHandler.BulkDelete)
			}
		}

		// Docs routes
		docHandler := handlers.NewDocHandler(db, searcher)
		docGroup := v1.Group("/docs")
		docGroup.Use(auth.RequireAuth())
		{
			docGroup.GET("/projects", docHandler.ListProjects)
			docGroup.GET("/projects/:id", docHandler.GetProject)
			docGroup.POST("/projects", auth.RequireRoles(models.RoleEditor, models.RoleAdmin, models.RoleOwner), docHandler.CreateProject)
			docGroup.PUT("/projects/:id", auth.RequireRoles(models.RoleEditor, models.RoleAdmin, models.RoleOwner), docHandler.UpdateProject)
			docGroup.DELETE("/projects/:id", auth.RequireRoles(models.RoleAdmin, models.RoleOwner), docHandler.DeleteProject)
			docGroup.GET("/projects/:id/navigation", docHandler.GetNavigation)
			docGroup.PUT("/projects/:id/navigation", auth.RequireRoles(models.RoleAuthor, models.RoleEditor, models.RoleAdmin, models.RoleOwner), docHandler.UpdateNavigation)
			docGroup.GET("/projects/:id/search-index", searchHandler.GetProjectSearchIndex)
			docGroup.GET("/pages/:id", docHandler.GetPage)
			docGroup.POST("/pages", auth.RequireRoles(models.RoleAuthor, models.RoleEditor, models.RoleAdmin, models.RoleOwner), docHandler.CreatePage)
			docGroup.PUT("/pages/:id", auth.RequireRoles(models.RoleAuthor, models.RoleEditor, models.RoleAdmin, models.RoleOwner), docHandler.UpdatePage)
			docGroup.DELETE("/pages/:id", auth.RequireRoles(models.RoleEditor, models.RoleAdmin, models.RoleOwner), docHandler.DeletePage)
			docGroup.GET("/translations/:groupId", docHandler.GetTranslations)
			docGroup.POST("/pages/:id/translations", auth.RequireRoles(models.RoleAuthor, models.RoleEditor, models.RoleAdmin, models.RoleOwner), docHandler.CreateTranslation)
		}

		// Members (Subscribers) routes
		memberHandler := handlers.NewMemberHandler(db)
		memberGroup := v1.Group("/members")
		memberGroup.Use(auth.RequireAuth())
		{
			memberGroup.GET("", memberHandler.List)
			memberGroup.GET("/:id", memberHandler.Get)
			memberGroup.POST("", auth.RequireRoles(models.RoleEditor, models.RoleAdmin, models.RoleOwner), memberHandler.Create)
			memberGroup.PUT("/:id", auth.RequireRoles(models.RoleEditor, models.RoleAdmin, models.RoleOwner), memberHandler.Update)
			memberGroup.DELETE("/:id", auth.RequireRoles(models.RoleAdmin, models.RoleOwner), memberHandler.Delete)
		}

		// Newsletters routes
		newsletterHandler := handlers.NewNewsletterHandler(db)
		newsletterGroup := v1.Group("/newsletters")
		newsletterGroup.Use(auth.RequireAuth())
		{
			newsletterGroup.GET("", newsletterHandler.List)
			newsletterGroup.GET("/:id", newsletterHandler.Get)
			newsletterGroup.POST("", auth.RequireRoles(models.RoleEditor, models.RoleAdmin, models.RoleOwner), newsletterHandler.Create)
			newsletterGroup.PUT("/:id", auth.RequireRoles(models.RoleEditor, models.RoleAdmin, models.RoleOwner), newsletterHandler.Update)
			newsletterGroup.DELETE("/:id", auth.RequireRoles(models.RoleAdmin, models.RoleOwner), newsletterHandler.Delete)
			newsletterGroup.POST("/:id/duplicate", auth.RequireRoles(models.RoleEditor, models.RoleAdmin, models.RoleOwner), newsletterHandler.Duplicate)
			newsletterGroup.POST("/:id/test", auth.RequireRoles(models.RoleEditor, models.RoleAdmin, models.RoleOwner), newsletterHandler.SendTest)
			newsletterGroup.POST("/:id/send", auth.RequireRoles(models.RoleAdmin, models.RoleOwner), newsletterHandler.Send)
		}

		// Editorial Review & Notifications routes
		reviewHandler := handlers.NewReviewHandler(db, searcher)
		reviewGroup := v1.Group("/reviews")
		reviewGroup.Use(auth.RequireAuth())
		{
			reviewGroup.GET("/revisions", reviewHandler.ListRevisions)
			reviewGroup.GET("/revisions/:id", reviewHandler.GetRevision)
			reviewGroup.POST("/revisions", reviewHandler.CreateRevision)
			reviewGroup.POST("/revisions/:id/restore", reviewHandler.RestoreRevision)
			reviewGroup.GET("/requests", reviewHandler.ListReviewRequests)
			reviewGroup.GET("/requests/:id", reviewHandler.GetReviewRequest)
			reviewGroup.POST("/requests", reviewHandler.CreateReviewRequest)
			reviewGroup.PUT("/requests/:id", auth.RequireRoles(models.RoleEditor, models.RoleAdmin, models.RoleOwner), reviewHandler.UpdateReviewRequest)
		}

		notificationGroup := v1.Group("/notifications")
		notificationGroup.Use(auth.RequireAuth())
		{
			notificationGroup.GET("", reviewHandler.ListNotifications)
			notificationGroup.PUT("/:id/read", reviewHandler.MarkNotificationRead)
		}

		// Overview Analytics & Settings routes
		settingsHandler := handlers.NewSettingsHandler(db)
		v1.GET("/overview/stats", auth.RequireAuth(), settingsHandler.OverviewStats)
		v1.GET("/overview/views", auth.RequireAuth(), settingsHandler.OverviewViews)
		v1.GET("/overview/activity", auth.RequireAuth(), settingsHandler.OverviewActivity)

		analyticsHandler := handlers.NewAnalyticsHandler(db)
		v1.POST("/analytics/track", analyticsHandler.Track)
		analyticsGroup := v1.Group("/analytics")
		analyticsGroup.Use(auth.RequireAuth())
		{
			analyticsGroup.GET("/overview", analyticsHandler.GetOverview)
			analyticsGroup.GET("/timeseries", analyticsHandler.GetTimeSeries)
			analyticsGroup.GET("/docs", analyticsHandler.GetDocPages)
			analyticsGroup.GET("/posts", analyticsHandler.GetPosts)
			analyticsGroup.GET("/countries", analyticsHandler.GetCountries)
			analyticsGroup.GET("/referrers", analyticsHandler.GetReferrers)
			analyticsGroup.GET("/devices", analyticsHandler.GetDevices)
			analyticsGroup.GET("/entity/:type/:id", analyticsHandler.GetEntityDetail)
		}

		settingsGroup := v1.Group("/settings")
		settingsGroup.Use(auth.RequireAuth())
		{
			settingsGroup.GET("/storage", settingsHandler.GetStorage)
			settingsGroup.PUT("/storage", auth.RequireRoles(models.RoleAdmin, models.RoleOwner), settingsHandler.UpdateStorage)
			settingsGroup.POST("/storage/test", auth.RequireRoles(models.RoleAdmin, models.RoleOwner), settingsHandler.TestStorage)
			settingsGroup.GET("/email", settingsHandler.GetEmail)
			settingsGroup.PUT("/email", auth.RequireRoles(models.RoleAdmin, models.RoleOwner), settingsHandler.UpdateEmail)
			settingsGroup.POST("/email/test", auth.RequireRoles(models.RoleAdmin, models.RoleOwner), settingsHandler.TestEmail)
			settingsGroup.GET("/ai", settingsHandler.GetAI)
			settingsGroup.PUT("/ai", auth.RequireRoles(models.RoleAdmin, models.RoleOwner), settingsHandler.UpdateAI)
			settingsGroup.GET("/api-keys", auth.RequireRoles(models.RoleAdmin, models.RoleOwner), settingsHandler.ListApiKeys)
			settingsGroup.POST("/api-keys", auth.RequireRoles(models.RoleAdmin, models.RoleOwner), settingsHandler.CreateApiKey)
			settingsGroup.DELETE("/api-keys/:id", auth.RequireRoles(models.RoleAdmin, models.RoleOwner), settingsHandler.DeleteApiKey)
			settingsGroup.GET("/webhooks", auth.RequireRoles(models.RoleAdmin, models.RoleOwner), settingsHandler.ListWebhooks)
			settingsGroup.POST("/webhooks", auth.RequireRoles(models.RoleAdmin, models.RoleOwner), settingsHandler.CreateWebhook)
			settingsGroup.DELETE("/webhooks/:id", auth.RequireRoles(models.RoleAdmin, models.RoleOwner), settingsHandler.DeleteWebhook)
		}

		// Example role-restricted endpoints for RBAC verification
		adminGroup := v1.Group("/admin")
		adminGroup.Use(auth.RequireAuth(), auth.RequireRoles(models.RoleAdmin, models.RoleOwner))
		{
			adminGroup.GET("/dashboard", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "Welcome admin"})
			})
		}
	}

	return r
}

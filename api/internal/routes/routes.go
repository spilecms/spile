package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/spilecms/spile/api/internal/auth"
	"github.com/spilecms/spile/api/internal/handlers"
	"github.com/spilecms/spile/api/internal/models"
	"gorm.io/gorm"
)

// SetupRouter initializes Gin engine with all routes and middlewares
func SetupRouter(db *gorm.DB) *gin.Engine {
	r := gin.New()
	r.Use(gin.Recovery())

	// Attach authentication context to every request
	r.Use(auth.AuthenticateMiddleware(db))

	v1 := r.Group("/api/v1")
	{
		// Health check
		v1.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"status": "ok"})
		})

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
		postHandler := handlers.NewPostHandler(db)
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

package main

import (
	"log"

	"github.com/spilecms/spile/api/internal/config"
	"github.com/spilecms/spile/api/internal/database"
	"github.com/spilecms/spile/api/internal/routes"
)

func main() {
	cfg := config.Load()

	db, err := database.InitDB(cfg.DatabasePath, cfg.Env == "production")
	if err != nil {
		log.Fatalf("Database initialization failed: %v", err)
	}

	router := routes.SetupRouter(db)

	log.Printf("Spile CMS backend running on :%s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}

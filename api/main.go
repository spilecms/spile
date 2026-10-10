package main

import (
	"log"

	"github.com/spilecms/spile/api/internal/config"
	"github.com/spilecms/spile/api/internal/database"
	"github.com/spilecms/spile/api/internal/routes"
	"github.com/spilecms/spile/api/internal/storage"
	"github.com/spilecms/spile/web"
)

func main() {
	cfg := config.Load()

	db, err := database.InitDB(cfg.DatabasePath, cfg.Env == "production")
	if err != nil {
		log.Fatalf("Database initialization failed: %v", err)
	}

	storageProv, err := storage.NewLocalStorageProvider("./uploads", "/uploads")
	if err != nil {
		log.Fatalf("Storage initialization failed: %v", err)
	}

	router := routes.SetupRouter(db, storageProv)

	// Mount embedded React + Vite SPA
	if distFS, err := web.DistFS(); err == nil {
		routes.RegisterSPA(router, distFS)
		log.Println("Embedded React frontend mounted successfully")
	} else {
		log.Printf("Warning: failed to load embedded frontend: %v", err)
	}

	log.Printf("Spile CMS backend running on :%s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}

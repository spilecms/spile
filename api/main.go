package main

import (
	"log"
	"time"

	"github.com/spilecms/spile/api/internal/config"
	"github.com/spilecms/spile/api/internal/database"
	"github.com/spilecms/spile/api/internal/email"
	"github.com/spilecms/spile/api/internal/models"
	"github.com/spilecms/spile/api/internal/routes"
	"github.com/spilecms/spile/api/internal/search"
	"github.com/spilecms/spile/api/internal/storage"
	"github.com/spilecms/spile/api/internal/webhook"
	"github.com/spilecms/spile/web"
	"gorm.io/gorm"
)

func startScheduler(db *gorm.DB, searcher search.Searcher) {
	ticker := time.NewTicker(30 * time.Second)
	go func() {
		for range ticker.C {
			now := time.Now()

			// 1. Auto-publish scheduled posts
			var duePosts []models.Post
			db.Preload("Authors").Preload("Tags").
				Where("status = ? AND scheduled_for IS NOT NULL AND scheduled_for <= ?", models.PostStatusScheduled, now).
				Find(&duePosts)
			for _, post := range duePosts {
				post.Status = models.PostStatusPublished
				post.PublishedAt = &now
				post.UpdatedAt = now
				if err := db.Save(&post).Error; err == nil {
					if searcher != nil {
						_ = searcher.IndexPost(&post)
					}
					webhook.Dispatch(db, "post.published", post.ToResponse())
				}
			}

			// 2. Auto-send scheduled newsletters
			var dueNewsletters []models.Newsletter
			db.Where("status = ? AND scheduled_for IS NOT NULL AND scheduled_for <= ?", models.NewsletterStatusScheduled, now).
				Find(&dueNewsletters)
			if len(dueNewsletters) > 0 {
				if configured, reason := email.IsConfigured(db); !configured {
					log.Printf("[Scheduler] Skipping %d scheduled newsletter(s): %s. Configure email in Settings > Email.", len(dueNewsletters), reason)
				} else {
					var members []models.Member
					db.Where("status = ?", models.MemberStatusActive).Find(&members)
					for _, nl := range dueNewsletters {
						htmlBody := email.RenderNewsletterHTML(&nl)
						delivered := 0
						for _, m := range members {
							if m.Email != "" && email.Send(db, m.Email, nl.Subject, htmlBody, nl.SenderName, nl.SenderEmail) == nil {
								delivered++
							}
						}
						nl.Status = models.NewsletterStatusSent
						nl.SentAt = &now
						nl.RecipientsCount = len(members)
						nl.DeliveredCount = delivered
						nl.UpdatedAt = now
						if err := db.Save(&nl).Error; err == nil {
							webhook.Dispatch(db, "newsletter.sent", nl.ToResponse())
						}
					}
				}
			}

			// 3. Auto-purge trashed posts older than 30 days
			thirtyDaysAgo := now.AddDate(0, 0, -30)
			var expiredPosts []models.Post
			if err := db.Where("status = ? AND updated_at <= ?", models.PostStatusTrashed, thirtyDaysAgo).Find(&expiredPosts).Error; err == nil && len(expiredPosts) > 0 {
				for _, p := range expiredPosts {
					if searcher != nil {
						_ = searcher.DeleteEntity("post", p.ID)
					}
					_ = db.Exec("DELETE FROM post_tags WHERE post_id = ?", p.ID).Error
					_ = db.Exec("DELETE FROM post_authors WHERE post_id = ?", p.ID).Error
					db.Delete(&p)
				}
				log.Printf("[Scheduler] Auto-purged %d trashed posts older than 30 days", len(expiredPosts))
			}
		}
	}()
}

func main() {
	cfg := config.Load()
	if err := cfg.Validate(); err != nil {
		log.Fatalf("Configuration error: %v", err)
	}

	db, err := database.InitDB(cfg.DatabasePath, cfg.Env == "production")
	if err != nil {
		log.Fatalf("Database initialization failed: %v", err)
	}

	searcher, err := search.NewSQLiteSearcher(db)
	if err != nil {
		log.Printf("Warning: search index initialization failed: %v", err)
	} else if err := searcher.SyncAllPublished(); err != nil {
		log.Printf("Warning: initial search index sync failed: %v", err)
	}

	startScheduler(db, searcher)

	storageProv, err := storage.NewLocalStorageProvider("./uploads", "/uploads")
	if err != nil {
		log.Fatalf("Storage initialization failed: %v", err)
	}

	router := routes.SetupRouter(db, storageProv, cfg)

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

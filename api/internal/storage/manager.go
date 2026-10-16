package storage

import (
	"encoding/json"

	"github.com/spilecms/spile/api/internal/models"
	"gorm.io/gorm"
)

// ResolveProvider returns the active storage provider according to system settings in SQLite.
// Defaults to LocalStorageProvider ("./uploads", "/uploads").
func ResolveProvider(db *gorm.DB) Provider {
	if db == nil {
		p, _ := NewLocalStorageProvider("./uploads", "/uploads")
		return p
	}

	var s models.SystemSetting
	if err := db.First(&s, "key = ?", "storage").Error; err == nil {
		var cfg struct {
			Provider  string `json:"provider"`
			LocalPath string `json:"localPath"`
			Bucket    string `json:"bucket"`
			Endpoint  string `json:"endpoint"`
			Region    string `json:"region"`
			AccessKey string `json:"accessKey"`
			SecretKey string `json:"secretKey"`
			PublicURL string `json:"publicUrl"`
		}
		if err := json.Unmarshal([]byte(s.ValueJSON), &cfg); err == nil {
			switch cfg.Provider {
			case "s3", "r2", "minio":
				if cfg.Bucket != "" && cfg.AccessKey != "" && cfg.SecretKey != "" {
					s3Prov, err := NewS3StorageProvider(S3Config{
						Provider:  cfg.Provider,
						Bucket:    cfg.Bucket,
						Endpoint:  cfg.Endpoint,
						Region:    cfg.Region,
						AccessKey: cfg.AccessKey,
						SecretKey: cfg.SecretKey,
						PublicURL: cfg.PublicURL,
					})
					if err == nil {
						return s3Prov
					}
				}
			case "local":
				p, err := NewLocalStorageProvider(cfg.LocalPath, cfg.PublicURL)
				if err == nil {
					return p
				}
			}
		}
	}

	p, _ := NewLocalStorageProvider("./uploads", "/uploads")
	return p
}

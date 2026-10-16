package config

import (
	"errors"
	"os"
	"strconv"
	"strings"
)

const DefaultDevSessionSecret = "spile-default-dev-secret-key-change-me"

type Config struct {
	Port            string
	DatabasePath    string
	SessionSecret   string
	Env             string
	AllowedOrigins  []string
	MaxUploadSizeMB int64
}

// Validate ensures critical security invariants are satisfied before starting the server.
func (c *Config) Validate() error {
	if c.Env == "production" && (c.SessionSecret == DefaultDevSessionSecret || c.SessionSecret == "") {
		return errors.New("security error: SESSION_SECRET must not use the default fallback value in production mode. Set a secure secret in environment variables")
	}
	return nil
}

// IsOriginAllowed checks whether a given HTTP Origin matches the configured allowlist.
func (c *Config) IsOriginAllowed(origin string) bool {
	if origin == "" {
		return false
	}
	for _, allowed := range c.AllowedOrigins {
		if allowed == "*" || strings.EqualFold(allowed, origin) {
			return true
		}
	}
	return false
}

func Load() *Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dbPath := os.Getenv("DATABASE_PATH")
	if dbPath == "" {
		dbPath = "spile.db"
	}

	secret := os.Getenv("SESSION_SECRET")
	if secret == "" {
		secret = os.Getenv("LIMEN_SECRET")
		if secret == "" {
			secret = DefaultDevSessionSecret
		}
	}

	env := os.Getenv("APP_ENV")
	if env == "" {
		env = "development"
	}

	originsRaw := os.Getenv("ALLOWED_ORIGINS")
	var allowedOrigins []string
	if originsRaw == "" {
		// Default origins for standard local development
		allowedOrigins = []string{"http://localhost:5173", "http://localhost:8080", "http://127.0.0.1:5173", "http://127.0.0.1:8080"}
	} else {
		for _, part := range strings.Split(originsRaw, ",") {
			trimmed := strings.TrimSpace(part)
			if trimmed != "" {
				allowedOrigins = append(allowedOrigins, trimmed)
			}
		}
	}

	maxUploadMB := int64(50)
	if uploadRaw := os.Getenv("MAX_UPLOAD_SIZE_MB"); uploadRaw != "" {
		if parsed, err := strconv.ParseInt(uploadRaw, 10, 64); err == nil && parsed > 0 {
			maxUploadMB = parsed
		}
	}

	return &Config{
		Port:            port,
		DatabasePath:    dbPath,
		SessionSecret:   secret,
		Env:             env,
		AllowedOrigins:  allowedOrigins,
		MaxUploadSizeMB: maxUploadMB,
	}
}

package config

import (
	"os"
)

type Config struct {
	Port         string
	DatabasePath string
	SessionSecret string
	Env          string
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
			secret = "spile-default-dev-secret-key-change-me"
		}
	}

	env := os.Getenv("APP_ENV")
	if env == "" {
		env = "development"
	}

	return &Config{
		Port:          port,
		DatabasePath:  dbPath,
		SessionSecret: secret,
		Env:           env,
	}
}

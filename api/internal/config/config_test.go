package config_test

import (
	"os"
	"testing"

	"github.com/spilecms/spile/api/internal/config"
	"github.com/stretchr/testify/assert"
)

func TestConfigValidation(t *testing.T) {
	// 1. Development mode with default secret should pass validation
	devCfg := &config.Config{
		Env:           "development",
		SessionSecret: config.DefaultDevSessionSecret,
	}
	assert.NoError(t, devCfg.Validate())

	// 2. Production mode with default secret MUST fail validation
	prodDefaultCfg := &config.Config{
		Env:           "production",
		SessionSecret: config.DefaultDevSessionSecret,
	}
	assert.Error(t, prodDefaultCfg.Validate())
	assert.Contains(t, prodDefaultCfg.Validate().Error(), "SESSION_SECRET must not use the default fallback")

	// 3. Production mode with custom strong secret should pass validation
	prodCustomCfg := &config.Config{
		Env:           "production",
		SessionSecret: "a-very-strong-production-session-secret-key-1234567890",
	}
	assert.NoError(t, prodCustomCfg.Validate())
}

func TestConfigOrigins(t *testing.T) {
	cfg := &config.Config{
		AllowedOrigins: []string{"http://localhost:5173", "https://mysite.com"},
	}

	assert.True(t, cfg.IsOriginAllowed("http://localhost:5173"))
	assert.True(t, cfg.IsOriginAllowed("https://mysite.com"))
	assert.False(t, cfg.IsOriginAllowed("https://malicious.org"))
	assert.False(t, cfg.IsOriginAllowed(""))

	wildcardCfg := &config.Config{
		AllowedOrigins: []string{"*"},
	}
	assert.True(t, wildcardCfg.IsOriginAllowed("https://anything.com"))
}

func TestConfigLoadDefaults(t *testing.T) {
	os.Unsetenv("PORT")
	os.Unsetenv("DATABASE_PATH")
	os.Unsetenv("APP_ENV")
	os.Unsetenv("SESSION_SECRET")
	os.Unsetenv("ALLOWED_ORIGINS")

	loaded := config.Load()
	assert.Equal(t, "8080", loaded.Port)
	assert.Equal(t, "spile.db", loaded.DatabasePath)
	assert.Equal(t, "./uploads", loaded.UploadsPath)
	assert.Equal(t, "development", loaded.Env)
	assert.Equal(t, config.DefaultDevSessionSecret, loaded.SessionSecret)
	assert.True(t, loaded.IsOriginAllowed("http://localhost:5173"))
}

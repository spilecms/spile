package database

import (
	"fmt"

	"github.com/glebarez/sqlite"
	"github.com/spilecms/spile/api/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// InitDB initializes a SQLite database connection with GORM
func InitDB(dsn string, silentLogger bool) (*gorm.DB, error) {
	logLevel := logger.Info
	if silentLogger {
		logLevel = logger.Silent
	}

	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Auto-migrate registered models
	if err := AutoMigrate(db); err != nil {
		return nil, fmt.Errorf("failed to auto migrate models: %w", err)
	}

	return db, nil
}

// AutoMigrate migrates all schema tables
func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&models.User{},
		&models.Session{},
		&models.Tag{},
		&models.WorkspaceLocale{},
		&models.Post{},
	)
}

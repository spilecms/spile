package testutils

import (
	"fmt"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/spilecms/spile/api/internal/auth"
	"github.com/spilecms/spile/api/internal/database"
	"github.com/spilecms/spile/api/internal/models"
	"github.com/spilecms/spile/api/internal/routes"
	"gorm.io/gorm"
)

func init() {
	gin.SetMode(gin.TestMode)
}

// TestApp provides an isolated in-memory test environment
type TestApp struct {
	T      *testing.T
	DB     *gorm.DB
	Router *gin.Engine
}

// NewTestApp bootstraps a clean in-memory database and router for testing
func NewTestApp(t *testing.T) *TestApp {
	dbName := fmt.Sprintf("file:%s?mode=memory&cache=shared", uuid.NewString())
	db, err := database.InitDB(dbName, true)
	if err != nil {
		t.Fatalf("failed to initialize test in-memory database: %v", err)
	}

	router := routes.SetupRouter(db)

	return &TestApp{
		T:      t,
		DB:     db,
		Router: router,
	}
}

// CreateUser creates a user in the test database with a hashed password
func (app *TestApp) CreateUser(name, email, password string, role models.UserRole) *models.User {
	hash, err := auth.HashPassword(password)
	if err != nil {
		app.T.Fatalf("failed to hash password for test user: %v", err)
	}

	user := &models.User{
		Name:         name,
		Email:        email,
		PasswordHash: hash,
		Role:         role,
	}

	if err := app.DB.Create(user).Error; err != nil {
		app.T.Fatalf("failed to create test user: %v", err)
	}

	return user
}

// CreateSession creates a valid session for a test user and returns the token
func (app *TestApp) CreateSession(userID string) string {
	session, err := auth.CreateSession(app.DB, userID, "127.0.0.1", "test-agent", 24*time.Hour)
	if err != nil {
		app.T.Fatalf("failed to create test session: %v", err)
	}
	return session.Token
}

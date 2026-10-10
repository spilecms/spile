package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type UserRole string

const (
	RoleOwner       UserRole = "owner"
	RoleAdmin       UserRole = "admin"
	RoleEditor      UserRole = "editor"
	RoleAuthor      UserRole = "author"
	RoleContributor UserRole = "contributor"
)

func (r UserRole) IsValid() bool {
	switch r {
	case RoleOwner, RoleAdmin, RoleEditor, RoleAuthor, RoleContributor:
		return true
	default:
		return false
	}
}

// User represents a Spile system user
type User struct {
	ID           string    `gorm:"primaryKey;size:36" json:"id"`
	Name         string    `gorm:"size:255;not null" json:"name"`
	Email        string    `gorm:"size:255;not null;uniqueIndex" json:"email"`
	PasswordHash string    `gorm:"size:255;not null" json:"-"`
	Avatar       string    `gorm:"size:500" json:"avatar"`
	Role         UserRole  `gorm:"size:30;not null;default:'author'" json:"role"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == "" {
		u.ID = uuid.NewString()
	}
	if u.Role == "" {
		u.Role = RoleAuthor
	}
	return nil
}

// UserResponse is the public user representation matching frontend
type UserResponse struct {
	ID     string   `json:"id"`
	Name   string   `json:"name"`
	Email  string   `json:"email"`
	Avatar string   `json:"avatar"`
	Role   UserRole `json:"role"`
}

func (u *User) ToResponse() UserResponse {
	return UserResponse{
		ID:     u.ID,
		Name:   u.Name,
		Email:  u.Email,
		Avatar: u.Avatar,
		Role:   u.Role,
	}
}

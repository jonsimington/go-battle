package main

import (
	"sync"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type UserRole string

const (
	RoleAdmin UserRole = "admin"
	RoleUser  UserRole = "user"
)

type User struct {
	gorm.Model
	Username     string   `json:"username" gorm:"uniqueIndex;not null"`
	PasswordHash string   `json:"-" gorm:"not null"`
	Role         UserRole `json:"role" gorm:"default:user;not null"`
}

var userLock = &sync.Mutex{}

func insertUser(db *gorm.DB, user *User) error {
	userLock.Lock()
	defer userLock.Unlock()
	return db.Create(user).Error
}

func getUserByUsername(db *gorm.DB, username string) (*User, error) {
	var user User
	result := db.Where("username = ?", username).First(&user)
	if result.Error != nil {
		return nil, result.Error
	}
	return &user, nil
}

func getUserByID(db *gorm.DB, id uint) (*User, error) {
	var user User
	result := db.First(&user, id)
	if result.Error != nil {
		return nil, result.Error
	}
	return &user, nil
}

func userExists(db *gorm.DB, username string) bool {
	var count int64
	db.Model(&User{}).Where("username = ?", username).Count(&count)
	return count > 0
}

func hashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

func checkPassword(hashedPassword, password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
	return err == nil
}

package main

import (
	"github.com/jinzhu/gorm"
	_ "github.com/jinzhu/gorm/dialects/postgres"
)

// SessionID describes an ID for a game session
type SessionID struct {
	gorm.Model

	SessionID int `sql:"AUTO_INCREMENT" gorm:"primary_key"`
}

// MatchID describes an ID for a game session
type MatchID struct {
	gorm.Model

	MatchID int `sql:"AUTO_INCREMENT" gorm:"primary_key"`
}

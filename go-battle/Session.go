package main

import (
	"sync"

	"gorm.io/gorm"
)

// SessionID describes an ID for a game session
type SessionID struct {
	gorm.Model

	SessionID int `sql:"AUTO_INCREMENT" gorm:"primary_key"`
}

var sessionLock = &sync.Mutex{}

func getCurrentSessionID(db *gorm.DB) int {
	sessionLock.Lock()
	defer sessionLock.Unlock()

	var session = new(SessionID)

	db.Create(&session)

	var lastSession SessionID

	db.Last(&lastSession)

	return lastSession.SessionID
}

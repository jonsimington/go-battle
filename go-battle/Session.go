package main

import (
	"sync"

	"gorm.io/gorm"
)

// SessionID describes an ID for a game session
type Session struct {
	gorm.Model

	ID int `json:"id"`
}

var sessionLock = &sync.Mutex{}

func getCurrentSessionID(db *gorm.DB) int {
	sessionLock.Lock()
	defer sessionLock.Unlock()

	var lastSession Session

	db.Last(&lastSession)

	return lastSession.ID + 1
}

package main

import (
	"sync"

	"gorm.io/gorm"
)

// SessionID describes an ID for a game session
type Session struct {
	gorm.Model
}

var sessionLock = &sync.Mutex{}

func insertSession(db *gorm.DB, session *Session) {
	sessionLock.Lock()
	defer sessionLock.Unlock()

	db.Create(&session)
}

func getCurrentSessionID(db *gorm.DB) int {
	sessionLock.Lock()
	defer sessionLock.Unlock()

	var lastSession Session

	db.Last(&lastSession)

	return int(lastSession.ID) + 1
}

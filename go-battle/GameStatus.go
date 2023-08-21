package main

import (
	"sync"

	"gorm.io/gorm"
)

// GameStatus represents the status of a played game
type GameStatus struct {
	gorm.Model

	GameName        string       `json:"gameName"`
	GameSession     string       `json:"gameSession"`
	NumberOfPlayers int          `json:"requiredNumberOfPlayers"`
	Clients         []GameClient `json:"clients" gorm:"many2many:game_status_clients;"`
	Status          string       `json:"status"`
	GamelogFilename string       `json:"gamelogFilename"`
}

var gameStatusLock = &sync.Mutex{}

func insertGameStatus(db *gorm.DB, status *GameStatus) {
	gameStatusLock.Lock()
	defer gameStatusLock.Unlock()

	db.Create(status)
}

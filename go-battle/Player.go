package main

import (
	"sync"

	"github.com/lib/pq"
	"gorm.io/gorm"
)

// Player represents a participant in a Game
type Player struct {
	gorm.Model

	ID       int    `json:"id"`
	Name     string `json:"name"`
	ClientID int
	Client   Client `json:"client" gorm:"foreignKey:ClientID"`
}

func getPlayers(ids []int) []Player {
	var players []Player

	if len(ids) > 0 {
		db.Where("id = ANY(?)", pq.Array(ids)).Find(&players)
	} else {
		db.Find(&players)
	}

	return players
}

var playerLock = &sync.Mutex{}

func insertPlayer(db *gorm.DB, player *Player) {
	playerLock.Lock()
	defer playerLock.Unlock()

	db.Create(&player)
}

func playerExists(db *gorm.DB, name string) bool {
	var players []Player

	db.Where("name=?", name).Find(&players)

	return len(players) > 0
}

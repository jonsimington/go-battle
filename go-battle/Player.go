package main

import (
	"sync"

	"github.com/lib/pq"
	"gorm.io/gorm"
)

// Player represents a participant in a Game
type Player struct {
	gorm.Model

	Name     string `json:"name"`
	ClientID int    `json:"client_id"`
	Client   Client `json:"client" gorm:"foreignKey:ClientID"`
	Elo      int    `json:"elo" gorm:"default:1500"`
}

func getPlayers(ids []int) []Player {
	var players []Player

	if len(ids) > 0 {
		db.Preload("Client").
			Where("id = ANY(?)", pq.Array(ids)).
			Find(&players)
	} else {
		db.Preload("Client").
			Find(&players)
	}

	return players
}

func getPlayerByName(name string) Player {
	var player Player

	db.Preload("Client").
		Where("name = ?", name).
		Find(&player)

	return player
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

func updatePlayerElo(db *gorm.DB, player Player, elo int) {
	var p Player

	db.Where("id = ?", player.ID).First(&p)

	p.Elo = elo

	db.Save(&p)
}

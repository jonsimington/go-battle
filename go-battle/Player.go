package main

import (
	"fmt"
	"sync"

	"github.com/lib/pq"
	"gorm.io/gorm"
)

// Player represents a participant in a Game
type Player struct {
	gorm.Model

	ID       int    `json:"id"`
	Name     string `json:"name"`
	ClientID int    `json:"client_id"`
	Client   Client `json:"client" gorm:"foreignKey:ClientID"`
}

func getPlayers(ids []int) []Player {
	var players []Player

	if len(ids) > 0 {
		db.Preload("Client").Where("id = ANY(?)", pq.Array(ids)).Find(&players)
	} else {
		db.Preload("Client").Find(&players)
	}

	for _, p := range players {
		log.Debugln(fmt.Sprintf("Player %s has client repo %s", p.Name, p.Client.Repo))
	}

	return players
}

var playerLock = &sync.Mutex{}

func insertPlayer(db *gorm.DB, player *Player) {
	playerLock.Lock()
	defer playerLock.Unlock()

	log.Debugln(fmt.Sprintf("Inserting: Player %s has client repo %s", player.Name, player.Client.Repo))

	db.Create(&player)
}

func playerExists(db *gorm.DB, name string) bool {
	var players []Player

	db.Where("name=?", name).Find(&players)

	return len(players) > 0
}

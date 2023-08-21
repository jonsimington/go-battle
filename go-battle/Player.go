package main

import "gorm.io/gorm"

// Player represents a participant in a Game
type Player struct {
	gorm.Model

	Name     string `json:"name"`
	ClientID int
	Client   Client `json:"client" gorm:"foreignKey:ClientID"`
}

func getPlayers() []Player {
	var players []Player

	db.Find(&players)

	return players
}

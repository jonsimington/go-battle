package main

import "gorm.io/gorm"

// GameClient represents a client in a game
type GameClient struct {
	gorm.Model

	ID           int    `json:"id"`
	Name         string `json:"name"`
	Index        int    `json:"index"`
	Spectating   bool   `json:"spectating"`
	Won          bool   `json:"won"`
	Lost         bool   `json:"lost"`
	Reason       string `json:"reason"`
	Disconnected bool   `json:"disconnected"`
	TimedOut     bool   `json:"timedOut"`
}

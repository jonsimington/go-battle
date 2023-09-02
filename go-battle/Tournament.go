package main

import "gorm.io/gorm"

type Tournament struct {
	gorm.Model

	Name    string   `json:"name"`
	Players []Player `json:"players" gorm:"many2many:tournament_players"`
	Games   []Game   `json:"games" gorm:"many2many:tournament_games"`
	Matches []Match  `json:"matches" gorm:"many2many:tournament_matches"`

	Winner   *Player `json:"winner" gorm:"foreignKey:WinnerID"`
	WinnerID *int    `json:"winner_id" gorm:"default:null"`
	Type     string  `json:"type" gorm:"default:swiss"`
}

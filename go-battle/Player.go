package main

import (
	"sync"
	"time"

	"github.com/lib/pq"
	"gorm.io/gorm"
)

// Player represents a participant in a Game
type Player struct {
	gorm.Model

	Name       string          `json:"name"`
	ClientID   int             `json:"client_id"`
	Client     Client          `json:"client" gorm:"foreignKey:ClientID"`
	Elo        int             `json:"elo" gorm:"default:1500"`
	EloHistory []HistoricalElo `json:"elo_history" gorm:"many2many:player_historical_elos"`
	Games      []Game          `json:"games" gorm:"many2many:player_games"`
}

func getPlayers(ids []int) []Player {
	var players []Player

	if len(ids) > 0 {
		db.Preload("Client").
			Preload("EloHistory").
			Preload("Games").
			Preload("Games.Winner").
			Preload("Games.Loser").
			Where("id = ANY(?)", pq.Array(ids)).
			Find(&players)
	} else {
		db.Preload("Client").
			Preload("EloHistory").
			Preload("Games").
			Preload("Games.Winner").
			Preload("Games.Loser").
			Find(&players)
	}

	return players
}

func getPlayer(id int) Player {
	var player Player

	db.Preload("Client").
		Preload("EloHistory").
		Preload("Games").
		Preload("Games.Winner").
		Preload("Games.Loser").
		Where("id = ?", id).
		First(&player)

	return player
}

func getPlayerByName(name string) Player {
	var player Player

	db.Preload("Client").
		Preload("EloHistory").
		Preload("Games").
		Preload("Games.Winner").
		Preload("Games.Loser").
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
	playerLock.Lock()
	defer playerLock.Unlock()

	var p Player

	// Use First instead of Find, and check for errors
	result := db.Where("id = ?", player.ID).First(&p)
	if result.Error != nil {
		log.Errorf("Error retrieving player %s (ID: %d) from database: %v", player.Name, player.ID, result.Error)
		return
	}

	// Make sure we actually got a valid player
	if p.ID == 0 {
		log.Errorf("Player with ID %d (%s) not found in database when trying to update ELO", player.ID, player.Name)
		return
	}

	// Check if we're actually changing the ELO - log either way for debugging
	if p.Elo == elo {
		log.Infof("Player %s (ID: %d) ELO remains unchanged at %d", p.Name, p.ID, elo)
	} else {
		log.Infof("Updating player %s (ID: %d) ELO from %d to %d (delta: %d)",
			p.Name, p.ID, p.Elo, elo, elo-p.Elo)
	}

	// Update the ELO
	p.Elo = elo

	// Create a new historical ELO entry
	newEloHistory := HistoricalElo{
		Elo:       elo,
		Timestamp: time.Now(),
	}

	// Append the new ELO history entry
	p.EloHistory = append(p.EloHistory, newEloHistory)

	// Save with error checking
	if err := db.Save(&p).Error; err != nil {
		log.Errorf("Failed to update ELO for player %s (ID: %d): %v", p.Name, p.ID, err)
	}
}

func addGameToPlayer(db *gorm.DB, player Player, game Game) {
	playerLock.Lock()
	defer playerLock.Unlock()

	var p Player

	db.Where("id = ?", player.ID).First(&p)

	p.Games = append(p.Games, game)

	db.Save(&p)
}

func RemoveIndex(s []Player, index int) []Player {
	return append(s[:index], s[index+1:]...)
}

package main

import (
	"sync"

	"github.com/jinzhu/gorm"
	_ "github.com/jinzhu/gorm/dialects/postgres"
)

// SessionID describes an ID for a game session
type SessionID struct {
	gorm.Model

	SessionID int `sql:"AUTO_INCREMENT" gorm:"primary_key"`
}

// MatchID describes an ID for a game session
type MatchID struct {
	gorm.Model

	MatchID int `sql:"AUTO_INCREMENT" gorm:"primary_key"`
}

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

// GameClient represents a client in a game
type GameClient struct {
	gorm.Model

	Name         string `json:"name"`
	Index        int    `json:"index"`
	Spectating   bool   `json:"spectating"`
	Won          bool   `json:"won"`
	Lost         bool   `json:"lost"`
	Reason       string `json:"reason"`
	Disconnected bool   `json:"disconnected"`
	TimedOut     bool   `json:"timedOut"`
}

// Gamelog represents a mmai Gamelog
type Gamelog struct {
	GameName    string            `json:"gameName"`
	GameSession string            `json:"gameSession"`
	Deltas      []GamelogDelta    `json:"deltas"`
	Constants   map[string]string `json:"constants"`
	Epoch       int               `json:"epoch"`
	RandomSeed  string            `json:"randomSeed"`
	Winners     []GameResult      `json:"winners"`
	Losers      []GameResult      `json:"losers"`
}

// GameResult represents the result of an mmai game
type GameResult struct {
	Index        int    `json:"index"`
	ID           string `json:"id"`
	Name         string `json:"name"`
	Reason       string `json:"reason"`
	Disconnected bool   `json:"disconnected"`
	TimedOut     bool   `json:"timedOut"`
}

// GamelogDelta represents the delta of an mmai Gamelog
type GamelogDelta struct {
	DeltaType string `json:"type"`
	Game      string `json:"gamez"`
}

// Match represents a series of games in a Tournament
type Match struct {
	id       int
	numGames int
	games    []Game
	players  []Player
}

// Game represents a game between two Players in a Tournament
type Game struct {
	players []Player
	winner  int
	loser   int
	match   int
}

var sessionLock = &sync.Mutex{}

func getCurrentSessionID(db *gorm.DB) int {
	sessionLock.Lock()
	defer sessionLock.Unlock()

	var session = new(SessionID)

	db.Create(&session)

	var lastSession SessionID

	db.Last(&lastSession)

	return lastSession.SessionID
}

var matchLock = &sync.Mutex{}

func getCurrentMatchID(db *gorm.DB) int {
	matchLock.Lock()
	defer matchLock.Unlock()

	var match = new(MatchID)

	db.Create(&match)

	var lastMatch MatchID

	db.Last(&lastMatch)

	return lastMatch.MatchID
}

var gameStatusLock = &sync.Mutex{}

func insertGameStatus(db *gorm.DB, status *GameStatus) {
	gameStatusLock.Lock()
	defer gameStatusLock.Unlock()

	db.Create(status)
}

package main

import (
	"fmt"
	"path/filepath"
	"strconv"

	"github.com/fatih/color"
	"github.com/jinzhu/gorm"
	_ "github.com/jinzhu/gorm/dialects/sqlite"
)

// Match represents a series of games in a Tournament
type Match struct {
	id       int
	numGames int
	games    []Game
	players  []Player
}

var currentSession = 1

// StartMatch begins a match between two players for n games
func (m Match) StartMatch() {

	player1 := m.players[0]
	player2 := m.players[1]

	log.Printf("Starting match %d (%d games) between %s and %s", m.id, m.numGames, player1.name, player2.name)

	// init players slice
	players := []Player{
		player1,
		player2,
	}

	var matchDir = filepath.FromSlash("tmp/" + strconv.Itoa(m.id))

	// clone each player's repo, store in tmp loc
	log.Printf("Cloning %s's repo: %s to %s", player1.name, player1.client.repo, matchDir)
	player1.client.CloneRepo(matchDir + "/" + player1.name)

	log.Printf("Cloning %s's repo: %s to %s", player2.name, player2.client.repo, matchDir)
	player2.client.CloneRepo(matchDir + "/" + player2.name)

	// play numGames games between each player
	for i := 0; i < m.numGames; i++ {
		g := Game{
			players,
			1,
			2,
			m.id,
		}
		getCurrentSession()
		currentSession = currentSession + 1
		fmt.Println("playing game -- session: " + strconv.Itoa(currentSession))
		g.PlayGame(strconv.Itoa(currentSession))
	}
}

func getCurrentSession() {
	var dbType = conf.Get("dbType")
	var dbName = conf.Get("sessionDBName")
	db, _ := gorm.Open(dbType, dbName)

	var session = new(Session)

	s := db.Create(&session)

	_s := db.Last(&s)

	b := color.New(color.FgRed, color.Bold)

	b.Println(_s)

	defer db.Close()
}

package main

import (
	"fmt"
	"path/filepath"
	"strconv"
	"sync"

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

	var matchWG sync.WaitGroup
	matchWG.Add(m.numGames)

	// play numGames games between each player
	for i := 0; i < m.numGames; i++ {
		go func() {
			g := Game{
				players,
				1,
				2,
				m.id,
			}

			currentSession := strconv.Itoa(getCurrentSessionID())

			fmt.Println("playing game -- match: ", strconv.Itoa(m.id), " session: ", currentSession)
			g.PlayGame(currentSession)

			fmt.Println("gamelog: ", getGamelogFilename(g.players[0].client.game, currentSession))

			matchWG.Done()
			return
		}()
	}

	defer matchWG.Wait()
	return
}

func getCurrentSessionID() int {
	// open DB
	var dbType = conf.Get("dbType")
	var dbName = conf.Get("sessionDBName")
	db, _ := gorm.Open(dbType, dbName)

	// Insert new Session into DB
	var session = new(Session)
	db.Create(&session)

	// get last inserted Session object
	var _session Session
	db.Last(&_session)

	defer db.Close()

	// return the new Session
	return _session.ID
}

func getCurrentMatchID() int {
	// open DB
	var dbType = conf.Get("dbType")
	var dbName = conf.Get("matchDBName")
	db, _ := gorm.Open(dbType, dbName)

	// Insert new Session into DB
	var matchID = new(MatchID)
	db.Create(&matchID)

	// get last inserted Session object
	var _matchID MatchID
	db.Last(&_matchID)

	defer db.Close()

	// return the new Session
	return _matchID.ID
}

package main

import (
	"fmt"
	"path/filepath"
	"strconv"
	"sync"

	"github.com/jinzhu/gorm"
	_ "github.com/jinzhu/gorm/dialects/postgres"
)

// Match represents a series of games in a Tournament
type Match struct {
	id       int
	numGames int
	games    []Game
	players  []Player
}

// StartMatch begins a match between two players for n games
func (m Match) StartMatch(db *gorm.DB) {

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

	var matchSessions []string

	// play numGames games between each player
	for i := 0; i < m.numGames; i++ {
		go func() {
			g := Game{
				players,
				1,
				2,
				m.id,
			}

			currentSession := strconv.Itoa(getCurrentSessionID(db))
			matchSessions = append(matchSessions, currentSession)

			fmt.Println("playing game -- match: ", strconv.Itoa(m.id), " session: ", currentSession)
			g.PlayGame(currentSession)

			matchWG.Done()
			return
		}()
	}
	matchWG.Wait()

	// query cerveau API to get gamelogs for each game in match
	for _, matchSession := range matchSessions {
		gamelogFilename := getGamelogFilename(players[0].client.game, matchSession)

		fmt.Println("Glog: " + gamelogFilename)

		glog := getGamelog(gamelogFilename)
		winner := glog.Winners[0]
		loser := glog.Losers[0]
		fmt.Println("Session ", matchSession, " Summary")
		fmt.Println("\twinner: ", winner.Name, " reason: ", winner.Reason)
		fmt.Println("\tloser: ", loser.Name, " reason: ", loser.Reason)
	}
	return
}

var sessionLock = &sync.Mutex{}
var matchLock = &sync.Mutex{}

func getCurrentSessionID(db *gorm.DB) int {
	sessionLock.Lock()
	defer sessionLock.Unlock()

	var session = new(SessionID)

	db.Create(&session)

	var lastSession SessionID

	db.Last(&lastSession)

	return lastSession.SessionID
}

func getCurrentMatchID(db *gorm.DB) int {
	matchLock.Lock()
	defer matchLock.Unlock()

	var match = new(MatchID)

	db.Create(&match)

	var lastMatch MatchID

	db.Last(&lastMatch)

	return lastMatch.MatchID
}

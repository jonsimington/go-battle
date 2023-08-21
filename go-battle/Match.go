package main

import (
	"fmt"
	"path/filepath"
	"strconv"
	"sync"

	"github.com/lib/pq"
	"gorm.io/gorm"
)

// MatchID describes an ID for a game session
type MatchID struct {
	gorm.Model

	MatchID int `sql:"AUTO_INCREMENT" gorm:"primary_key"`
}

// Match represents a series of games in a Tournament
type Match struct {
	gorm.Model

	Id       int      `json:"id"`
	NumGames int      `json:"numGames"`
	Games    []Game   `json:"games" gorm:"many2many:match_games"`
	Players  []Player `json:"players" gorm:"many2many:match_players"`
}

var matchIDLock = &sync.Mutex{}

func getCurrentMatchID(db *gorm.DB) int {
	matchIDLock.Lock()
	defer matchIDLock.Unlock()

	var match = new(MatchID)

	db.Create(&match)

	var lastMatch MatchID

	db.Last(&lastMatch)

	return lastMatch.MatchID
}

var matchLock = &sync.Mutex{}

func insertMatch(db *gorm.DB, match *Match) {
	matchLock.Lock()
	defer matchLock.Unlock()

	db.Create(&match)
}

func getMatches(ids []int) []Match {
	var matches []Match

	if len(ids) > 0 {
		db.Where("id = ANY(?)", pq.Array(ids)).Find(&matches)
	} else {
		db.Find(&matches)
	}

	return matches
}

// StartMatch begins a match between two players for n games
func (m Match) StartMatch(db *gorm.DB) {

	player1 := m.Players[0]
	player2 := m.Players[1]

	log.Printf("Starting match %d (%d games) between %s and %s", m.Id, m.NumGames, player1.Name, player2.Name)

	// init players slice
	players := []Player{
		player1,
		player2,
	}

	var matchDir = filepath.FromSlash("tmp/" + strconv.Itoa(m.Id))

	// clone each player's repo, store in tmp loc
	log.Printf("Cloning %s's repo: %s to %s", player1.Name, player1.Client.Repo, matchDir)
	player1.Client.CloneRepo(matchDir + "/" + player1.Name)

	log.Printf("Cloning %s's repo: %s to %s", player2.Name, player2.Client.Repo, matchDir)
	player2.Client.CloneRepo(matchDir + "/" + player2.Name)

	var matchWG sync.WaitGroup
	matchWG.Add(m.NumGames)

	var matchSessions []string

	// play numGames games between each player
	for i := 0; i < m.NumGames; i++ {
		go func() {
			g := Game{
				Players: players,
				Winner:  1,
				Loser:   2,
				Match:   m.Id,
			}

			currentSession := strconv.Itoa(getCurrentSessionID(db))
			matchSessions = append(matchSessions, currentSession)

			fmt.Println("playing game -- match: ", strconv.Itoa(m.Id), " session: ", currentSession)
			g.PlayGame(currentSession)

			matchWG.Done()
			return
		}()
	}
	matchWG.Wait()

	// query cerveau API to get gamelogs for each game in match
	for _, matchSession := range matchSessions {
		gamelogFilename := getGamelogFilename(players[0].Client.Game, matchSession)

		glog := getGamelog(gamelogFilename)

		// once the game is finished, get the status and insert into DB
		gameStatus := getGameStatus(players[0].Client.Game, matchSession)
		insertGameStatus(db, gameStatus)

		winner := glog.Winners[0]
		loser := glog.Losers[0]
		fmt.Println("Session ", matchSession, " Summary")
		fmt.Println("\twinner: ", winner.Name)
		fmt.Println("\tloser: ", loser.Name)
	}
	return
}

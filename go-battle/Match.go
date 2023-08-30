package main

import (
	"fmt"
	"path/filepath"
	"strconv"
	"sync"

	"github.com/lib/pq"
	"gorm.io/gorm"
)

// Match represents a series of games in a Tournament
type Match struct {
	gorm.Model

	NumGames int      `json:"numGames"`
	Games    []Game   `json:"games" gorm:"many2many:match_games"`
	Players  []Player `json:"players" gorm:"many2many:match_players"`
	Status   string   `json:"status"`
}

var matchLock = &sync.Mutex{}

func getCurrentMatchID(db *gorm.DB) int {
	var lastMatch Match

	db.Last(&lastMatch)

	return int(lastMatch.ID) + 1
}

func insertMatch(db *gorm.DB, match *Match) {
	matchLock.Lock()
	defer matchLock.Unlock()

	db.Create(&match)
}

func deleteMatch(db *gorm.DB, matchId int) {
	matchLock.Lock()
	defer matchLock.Unlock()

	db.Delete(&Match{}, matchId)
}

func addGameToMatch(db *gorm.DB, match Match, game Game) {
	var m Match

	db.Where("id = ?", match.ID).First(&m)

	m.Games = append(m.Games, game)

	db.Save(&m)
}

func updateMatchStatus(db *gorm.DB, match Match, status string) {
	var m Match

	db.Where("id = ?", match.ID).First(&m)

	m.Status = status

	db.Save(&m)
}

func getMatches(ids []int) []Match {
	var matches []Match

	if len(ids) > 0 {
		db.Preload("Games").
			Preload("Players").
			Preload("Players.Client").
			Where("id = ANY(?)", pq.Array(ids)).
			Find(&matches)
	} else {
		db.Preload("Games").
			Preload("Players").
			Preload("Players.Client").
			Find(&matches)
	}

	return matches
}

func getMatch(id int) Match {
	var match Match

	result := db.Preload("Games").
		Preload("Players").
		Preload("Players.Client").
		Find(&match, id)

	if result.Error != nil {
		log.Warningln(fmt.Sprintf("Error finding match %d: %s", id, result.Error))
	}

	return match
}

// StartMatch begins a match between two players for n games
func (m Match) StartMatch(db *gorm.DB) {
	updateMatchStatus(db, m, "In Progress")

	player1 := m.Players[0]
	player2 := m.Players[1]

	log.Printf("Starting match %d (%d games) between %s and %s", m.ID, m.NumGames, player1.Name, player2.Name)

	// init players slice
	players := []Player{
		player1,
		player2,
	}

	var matchDir = filepath.FromSlash("tmp/" + strconv.Itoa(int(m.ID)))

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
			insertSession(db, &Session{})
			currentSession := strconv.Itoa(getCurrentSessionID(db))
			matchSessions = append(matchSessions, currentSession)

			g := Game{
				Players: players,
				Match:   m,
			}

			insertGame(db, &g)
			addGameToMatch(db, m, g)

			fmt.Println("playing game -- match: ", strconv.Itoa(int(m.ID)), " session: ", currentSession)
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

func compareMatches(matchOne Match, matchTwo Match) bool {
	return matchOne.ID == matchTwo.ID &&
		matchOne.ID == matchTwo.ID &&
		matchOne.CreatedAt == matchTwo.CreatedAt &&
		matchOne.UpdatedAt == matchTwo.UpdatedAt &&
		matchOne.DeletedAt == matchTwo.DeletedAt
}

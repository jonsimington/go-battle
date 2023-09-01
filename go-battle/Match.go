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
	Draw     bool     `json:"draw"`
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

func updateMatchDraw(db *gorm.DB, match Match, draw bool) {
	var m Match

	db.Where("id = ?", match.ID).First(&m)

	m.Draw = draw

	db.Save(&m)
}

func getMatches(ids []int) []Match {
	var matches []Match

	if len(ids) > 0 {
		db.Preload("Games").
			Preload("Games.Winner").
			Preload("Games.Loser").
			Preload("Players").
			Preload("Players.Client").
			Where("id = ANY(?)", pq.Array(ids)).
			Find(&matches)
	} else {
		db.Preload("Games").
			Preload("Games.Winner").
			Preload("Games.Loser").
			Preload("Players").
			Preload("Players.Client").
			Find(&matches)
	}

	return matches
}

func getMatch(id int) Match {
	var match Match

	result := db.Preload("Games").
		Preload("Games.Winner").
		Preload("Games.Loser").
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

	log.Infof("Starting match %d (%d games) between %s and %s", m.ID, m.NumGames, player1.Name, player2.Name)

	// init players slice
	players := []Player{
		player1,
		player2,
	}

	var matchDir = filepath.FromSlash("tmp/" + strconv.Itoa(int(m.ID)))

	// clone each player's repo, store in tmp loc
	log.Debugf("Cloning %s's repo: %s to %s", player1.Name, player1.Client.Repo, matchDir)
	player1.Client.CloneRepo(matchDir + "/" + player1.Name)

	log.Debugf("Cloning %s's repo: %s to %s", player2.Name, player2.Client.Repo, matchDir)
	player2.Client.CloneRepo(matchDir + "/" + player2.Name)

	var matchWG sync.WaitGroup
	matchWG.Add(m.NumGames)

	var matchSessions []int

	// Create a session for each game in the match
	for i := 0; i < m.NumGames; i++ {
		insertSession(db, &Session{})
		currentSession := getCurrentSessionID(db)
		matchSessions = append(matchSessions, currentSession)
	}

	// play a game concurrently for each session we created
	for _, session := range matchSessions {
		go func(currentSession int) {

			g := Game{
				Players:   players,
				Match:     m,
				SessionID: currentSession,
			}

			insertGame(db, &g)
			addGameToMatch(db, m, g)

			// add Game to the match in memory
			m.Games = append(m.Games, g)

			g.PlayGame(currentSession)

			matchWG.Done()
			return
		}(session)
	}

	matchWG.Wait()

	player1Wins := 0
	player2Wins := 0

	// for each game played, set the game result
	for _, game := range m.Games {
		gamelogFilename := getGamelogFilename(players[0].Client.Game, game.SessionID)
		gamelogUrl := getGamelogUrl(gamelogFilename)

		setGamelogUrl(db, game, gamelogUrl)

		glog := getGamelog(gamelogFilename)

		// once the game is finished, get the status and insert into DB
		gameStatus := getGameStatus(players[0].Client.Game, game.SessionID)
		insertGameStatus(db, gameStatus)

		// no winners or losers means draw
		if len(glog.Winners) == 0 {
			log.Debugln("Draw!")
			updateGameDraw(db, game, true)
		} else {
			winner := glog.Winners[0]
			loser := glog.Losers[0]

			if winner.Name == player1.Name {
				player1Wins += 1
			} else {
				player2Wins += 1
			}

			setWinner(db, game, winner.Name)
			setLoser(db, game, loser.Name)

			log.Debugf("Session ", game.SessionID, " Summary")
			log.Debugf("\twinner: ", winner.Name)
			log.Debugf("\tloser: ", loser.Name)
		}
	}

	if player1Wins == player2Wins {
		log.Debugf("It's a match draw!")
		updateMatchDraw(db, m, true)
	}

	updateMatchStatus(db, m, "Complete")
	return
}

func compareMatches(matchOne Match, matchTwo Match) bool {
	return matchOne.ID == matchTwo.ID &&
		matchOne.ID == matchTwo.ID &&
		matchOne.CreatedAt == matchTwo.CreatedAt &&
		matchOne.UpdatedAt == matchTwo.UpdatedAt &&
		matchOne.DeletedAt == matchTwo.DeletedAt
}

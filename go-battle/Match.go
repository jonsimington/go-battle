package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"sync"
	"time"

	"github.com/lib/pq"
	"gorm.io/gorm"
)

// Match represents a series of games in a Tournament
type Match struct {
	gorm.Model

	NumGames  int       `json:"numGames"`
	Games     []Game    `json:"games" gorm:"many2many:match_games"`
	Players   []Player  `json:"players" gorm:"many2many:match_players"`
	Status    string    `json:"status"`
	Draw      bool      `json:"draw"`
	StartTime time.Time `json:"start_time"`
	EndTime   time.Time `json:"end_time"`
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

func updateMatchStartTime(db *gorm.DB, match Match, time time.Time) {
	var m Match

	db.Where("id = ?", match.ID).First(&m)

	m.StartTime = time

	db.Save(&m)
}

func updateMatchEndTime(db *gorm.DB, match Match, time time.Time) {
	var m Match

	db.Where("id = ?", match.ID).First(&m)

	m.EndTime = time

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
	updateMatchStartTime(db, m, time.Now())

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
	log.Infof("Cloning %s's repo: %s to %s", player1.Name, player1.Client.Repo, matchDir)
	player1.Client.CloneRepo(matchDir + "/" + player1.Name)

	log.Infof("Cloning %s's repo: %s to %s", player2.Name, player2.Client.Repo, matchDir)
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

		// refresh Player state
		player1 = getPlayerByName(player1.Name)
		player2 = getPlayerByName(player2.Name)

		// no winners or losers means draw
		if len(glog.Winners) == 0 {
			log.Infoln("Draw!")
			updateGameDraw(db, game, true)
			handleEloChanges(player1, player2, nil, true)
		} else {
			winner := getPlayerByName(glog.Winners[0].Name)
			loser := getPlayerByName(glog.Losers[0].Name)

			if winner.Name == player1.Name {
				player1Wins += 1
			} else {
				player2Wins += 1
			}

			setGameWinner(db, game, winner)
			setGameLoser(db, game, loser)

			handleEloChanges(player1, player2, &winner, false)

			log.Infof("Session %d Summary", game.SessionID)
			log.Infof("\twinner: %s", winner.Name)
			log.Infof("\tloser: %s", loser.Name)
		}
	}

	if player1Wins == player2Wins {
		log.Infof("It's a match draw!")
		updateMatchDraw(db, m, true)
	}

	defer cleanUpMatchDirectory(m)
	defer updateMatchStatus(db, m, "Complete")
	defer updateMatchEndTime(db, m, time.Now())

	return
}

func cleanUpMatchDirectory(match Match) {
	matchDir := filepath.FromSlash("tmp/" + strconv.Itoa(int(match.ID)))

	err := os.RemoveAll(matchDir)

	if err != nil {
		log.Warningln(err)
	}
}

func handleEloChanges(player1 Player, player2 Player, winner *Player, draw bool) {
	outcomeA, outcomeB := calculateEloOutcomes(player1, player2, winner, draw)

	updatePlayerElo(db, player1, outcomeA.Rating)
	updatePlayerElo(db, player2, outcomeB.Rating)
}

func compareMatches(matchOne Match, matchTwo Match) bool {
	return matchOne.ID == matchTwo.ID &&
		matchOne.ID == matchTwo.ID &&
		matchOne.CreatedAt == matchTwo.CreatedAt &&
		matchOne.UpdatedAt == matchTwo.UpdatedAt &&
		matchOne.DeletedAt == matchTwo.DeletedAt
}

func getPlayerWithMostWins(match Match) (Player, bool) {
	player1 := match.Players[0]
	player2 := match.Players[1]

	var player1Wins float32 = 0
	var player2Wins float32 = 0

	for _, g := range match.Games {
		if match.Draw {
			player1Wins += 0.5
			player2Wins += 0.5
		} else if g.Winner != nil {
			if g.Winner.ID == player1.ID {
				player1Wins += 1
			} else if g.Winner.ID == player2.ID {
				player2Wins += 1
			}
		}
	}

	if player1Wins > player2Wins {
		return player1, false
	} else if player2Wins > player1Wins {
		return player2, false
	}

	return player2, true
}

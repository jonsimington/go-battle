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

// Add a dedicated mutex for match-game associations
var matchGameLock = &sync.Mutex{}

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
	matchGameLock.Lock()
	defer matchGameLock.Unlock()

	var m Match
	db.Where("id = ?", match.ID).First(&m)

	// Use GORM's Association method to safely add the game
	db.Model(&m).Association("Games").Append(&game)
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
		db.Preload("Games", func(db *gorm.DB) *gorm.DB {
			return db.Order("games.id ASC") // Consistently order games by ID
		}).
			Preload("Games.Winner").
			Preload("Games.Loser").
			Preload("Players").
			Where("id = ANY(?)", pq.Array(ids)).
			Find(&matches)
	} else {
		db.Preload("Games", func(db *gorm.DB) *gorm.DB {
			return db.Order("games.id ASC") // Consistently order games by ID
		}).
			Preload("Games.Winner").
			Preload("Games.Loser").
			Preload("Players").
			Find(&matches)
	}

	return matches
}

func getMatchesWithPlayers(players []int) []Match {
	var matches []Match

	if len(players) > 0 {
		var matchesWithPlayers []int

		db.Table("match_players").Where("player_id = ANY(?)", pq.Array(players)).Select("match_id").Find(&matchesWithPlayers)

		db.Preload("Games", func(db *gorm.DB) *gorm.DB {
			return db.Order("games.id ASC") // Consistently order games by ID
		}).
			Preload("Games.Winner").
			Preload("Games.Loser").
			Preload("Players").
			Where("id = ANY(?)", pq.Array(matchesWithPlayers)).
			Find(&matches)
	} else {
		db.Preload("Games", func(db *gorm.DB) *gorm.DB {
			return db.Order("games.id ASC") // Consistently order games by ID
		}).
			Preload("Games.Winner").
			Preload("Games.Loser").
			Preload("Players").
			Find(&matches)
	}

	return matches
}

func getMatch(id int) Match {
	var match Match

	result := db.Preload("Games", func(db *gorm.DB) *gorm.DB {
		return db.Order("games.id ASC") // Consistently order games by ID
	}).
		Preload("Games.Winner").
		Preload("Games.Loser").
		Preload("Players").
		Preload("Players.Client").
		Preload("Players.EloHistory").
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

	log.Infof("Starting match %d (%d games) between %s (%d) and %s (%d) ", m.ID, m.NumGames, player1.Name, player1.Elo, player2.Name, player2.Elo)

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
			defer matchWG.Done()

			g := Game{
				Players:   players,
				Match:     m,
				SessionID: currentSession,
			}

			insertGame(db, &g)
			addGameToMatch(db, m, g)
			addGameToPlayer(db, player1, g)
			addGameToPlayer(db, player2, g)

			// Pass nil for player since we're just initiating the game, not running a specific player's code
			g.PlayGame(currentSession)
		}(session)
	}

	// Add a timeout to wait for games to complete
	gameCompletionChan := make(chan bool, 1)
	go func() {
		matchWG.Wait()
		gameCompletionChan <- true
	}()

	// Wait for all games to complete or timeout after 60 minutes
	select {
	case <-gameCompletionChan:
		// All goroutines completed, but we need to verify game statuses
		log.Infoln("All game goroutines completed for match", m.ID)
	case <-time.After(60 * time.Minute): // 60 minute timeout
		// Timeout occurred - handle incomplete games
		log.Warningln("Match", m.ID, "timed out waiting for games to complete")
	}

	// Now verify that all games are actually complete in the database
	// We'll wait for up to 5 minutes checking periodically if all games have reached a final state
	maxWaitTime := 5 * time.Minute
	checkInterval := 15 * time.Second
	startCheckTime := time.Now()
	allGamesComplete := false

	for !allGamesComplete && time.Since(startCheckTime) < maxWaitTime {
		// Refresh game data from database to get current statuses
		refreshedMatch := getMatch(int(m.ID))
		games := refreshedMatch.Games

		// Check if we have all expected games
		if len(games) < m.NumGames {
			log.Warningf("Match %d missing games, has %d out of %d expected. Waiting...",
				m.ID, len(games), m.NumGames)
			time.Sleep(checkInterval)
			continue
		}

		// Check if all games have reached a final status
		incompleteGames := 0
		for _, game := range games {
			if game.Status != "Complete" && game.Status != "Canceled" && game.Status != "Error" {
				incompleteGames++
			}
		}

		if incompleteGames > 0 {
			log.Warningf("Match %d has %d games still not in final state. Waiting...",
				m.ID, incompleteGames)
			time.Sleep(checkInterval)
		} else {
			allGamesComplete = true
			log.Infof("All %d games in match %d have reached a final state", len(games), m.ID)
		}
	}

	// If we still have incomplete games after waiting, cancel them
	if !allGamesComplete {
		log.Warningf("Match %d timed out waiting for all games to reach final status", m.ID)
		markIncompleteGamesAsCanceled(db, m)
	}

	// Refresh game data one last time to get final statuses
	games := getMatch(int(m.ID)).Games

	// Count how many games were actually returned
	log.Infof("Match %d has %d games out of %d expected", m.ID, len(games), m.NumGames)

	player1Wins := 0
	player2Wins := 0

	// for each game played, calculate the winner/loser tally
	for _, game := range games {
		if game.Status == "Complete" || game.Status == "Error" {
			// Get the gamelog URL to display in logs
			gamelogUrl := game.GamelogUrl
			log.Infof("Game %d complete with gamelog: %s", game.SessionID, gamelogUrl)

			// Count wins for overall match result
			if game.Draw {
				log.Infoln("Game was a draw!")
			} else if game.Winner != nil && game.Loser != nil {
				if game.Winner.ID == player1.ID {
					player1Wins++
					log.Infof("Winner: %s, Loser: %s", player1.Name, player2.Name)
				} else if game.Winner.ID == player2.ID {
					player2Wins++
					log.Infof("Winner: %s, Loser: %s", player2.Name, player1.Name)
				}
			}
		} else {
			log.Warningf("Game %d has status %s, not counting in win totals", game.ID, game.Status)
		}
	}

	if player1Wins == player2Wins {
		log.Infof("It's a match draw!")
		updateMatchDraw(db, m, true)
	}

	// Clean up and ensure match is marked as complete
	cleanUpMatchDirectory(m)
	updateMatchStatus(db, m, "Complete")
	updateMatchEndTime(db, m, time.Now())
}

func cleanUpMatchDirectory(match Match) {
	matchDir := filepath.FromSlash("tmp/" + strconv.Itoa(int(match.ID)))

	err := os.RemoveAll(matchDir)

	if err != nil {
		log.Warningln(err)
	}
}

// markIncompleteGamesAsCanceled marks any games that aren't Complete as Canceled
func markIncompleteGamesAsCanceled(db *gorm.DB, match Match) {
	games := getMatch(int(match.ID)).Games
	for _, game := range games {
		if game.Status != "Complete" && game.Status != "Canceled" {
			log.Warningf("Game %d in match %d has status %s, marking as Canceled", game.ID, match.ID, game.Status)
			updateGameStatus(db, game, "Canceled")
		}
	}
}

func compareMatches(matchOne Match, matchTwo Match) bool {
	return matchOne.ID == matchTwo.ID &&
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

// CheckAndUpdateMatchStatus checks if all games in a match are in a final state (Complete, Error, Canceled)
// and updates the match status to Complete if necessary
func CheckAndUpdateMatchStatus(db *gorm.DB, matchID int) {
	match := getMatch(matchID)

	// If match is already complete, no need to check
	if match.Status == "Complete" {
		return
	}

	// Ensure we have the expected number of games
	if len(match.Games) < match.NumGames {
		log.Debugf("Match %d has fewer games than expected (%d vs %d), not marking as complete",
			matchID, len(match.Games), match.NumGames)
		return
	}

	// Check if all games have reached a final status
	allGamesComplete := true
	for _, game := range match.Games {
		if game.Status != "Complete" && game.Status != "Canceled" && game.Status != "Error" {
			allGamesComplete = false
			break
		}
	}

	// If all games are complete, update the match status
	if allGamesComplete {
		log.Infof("All games in match %d are in a final state, updating match status to Complete", matchID)

		// Count wins to determine if it's a draw
		player1 := match.Players[0]
		player2 := match.Players[1]
		player1Wins := 0
		player2Wins := 0

		for _, game := range match.Games {
			if game.Status == "Complete" || game.Status == "Error" {
				if game.Draw {
					// Draw counts as half a win for each player
				} else if game.Winner != nil && game.Loser != nil {
					if game.Winner.ID == player1.ID {
						player1Wins++
					} else if game.Winner.ID == player2.ID {
						player2Wins++
					}
				}
			}
		}

		if player1Wins == player2Wins {
			updateMatchDraw(db, match, true)
		}

		updateMatchStatus(db, match, "Complete")

		// Only set EndTime if it's not already set
		if match.EndTime.IsZero() {
			updateMatchEndTime(db, match, time.Now())
		}
	}
}

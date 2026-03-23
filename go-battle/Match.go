package main

import (
	"context"
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
	Round     int       `json:"round"`
}

var matchLock = &sync.Mutex{}

// Add a dedicated mutex for match-game associations
var matchGameLock = &sync.Mutex{}

// matchCancelFuncs stores context.CancelFunc for each running match,
// keyed by match ID. Used to stop running matches from the web UI.
var matchCancelFuncs sync.Map

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
	matchLock.Lock()
	defer matchLock.Unlock()

	var m Match

	db.Where("id = ?", match.ID).First(&m)

	m.Status = status

	db.Save(&m)
}

func updateMatchDraw(db *gorm.DB, match Match, draw bool) {
	matchLock.Lock()
	defer matchLock.Unlock()

	var m Match

	db.Where("id = ?", match.ID).First(&m)

	m.Draw = draw

	db.Save(&m)
}

func updateMatchStartTime(db *gorm.DB, match Match, time time.Time) {
	matchLock.Lock()
	defer matchLock.Unlock()

	var m Match

	db.Where("id = ?", match.ID).First(&m)

	m.StartTime = time

	db.Save(&m)
}

func updateMatchEndTime(db *gorm.DB, match Match, time time.Time) {
	matchLock.Lock()
	defer matchLock.Unlock()

	var m Match

	db.Where("id = ?", match.ID).First(&m)

	m.EndTime = time

	db.Save(&m)
}

func getMatches(ids []int) []Match {
	var matches []Match

	if len(ids) > 0 {
		db.Preload("Games", func(db *gorm.DB) *gorm.DB {
			return db.Select("id, created_at, updated_at, deleted_at, winner_id, loser_id, draw, status, match_id").Order("games.id ASC")
		}).
			Preload("Players", func(db *gorm.DB) *gorm.DB {
				return db.Select("id, name, elo, client_id")
			}).
			Preload("Players.EloHistory", func(db *gorm.DB) *gorm.DB {
				return db.Order("created_at DESC").Limit(100)
			}).
			Where("id = ANY(?)", pq.Array(ids)).
			Find(&matches)
	} else {
		db.Preload("Games", func(db *gorm.DB) *gorm.DB {
			return db.Select("id, created_at, updated_at, deleted_at, winner_id, loser_id, draw, status, match_id").Order("games.id ASC")
		}).
			Preload("Players", func(db *gorm.DB) *gorm.DB {
				return db.Select("id, name, elo, client_id")
			}).
			Preload("Players.EloHistory", func(db *gorm.DB) *gorm.DB {
				return db.Order("created_at DESC").Limit(100)
			}).
			Find(&matches)
	}

	return matches
}

func getMatchesPaginated(ids []int, page int, pageSize int, status string, sortField string, sortDir string) ([]Match, int64) {
	var matches []Match
	var totalCount int64
	offset := (page - 1) * pageSize

	query := db.Model(&Match{})
	if len(ids) > 0 {
		query = query.Where("id = ANY(?)", pq.Array(ids))
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}
	query.Count(&totalCount)

	preloaded := db.Preload("Games", func(db *gorm.DB) *gorm.DB {
		return db.Select("id, created_at, updated_at, deleted_at, winner_id, loser_id, draw, status, match_id").Order("games.id ASC")
	}).
		Preload("Players", func(db *gorm.DB) *gorm.DB {
			return db.Select("id, name, elo, client_id")
		}).
		Preload("Players.EloHistory", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at DESC").Limit(100)
		})

	if len(ids) > 0 {
		preloaded = preloaded.Where("id = ANY(?)", pq.Array(ids))
	}
	if status != "" {
		preloaded = preloaded.Where("status = ?", status)
	}

	preloaded.Order(fmt.Sprintf("%s %s", sortField, sortDir)).Offset(offset).Limit(pageSize).Find(&matches)

	return matches, totalCount
}

func getMatchesWithPlayersPaginated(players []int, page int, pageSize int, status string, sortField string, sortDir string) ([]Match, int64) {
	var matches []Match
	var totalCount int64
	offset := (page - 1) * pageSize

	if len(players) > 0 {
		var matchIDs []int
		db.Table("match_players").Where("player_id = ANY(?)", pq.Array(players)).Select("match_id").Find(&matchIDs)

		countQuery := db.Model(&Match{}).Where("id = ANY(?)", pq.Array(matchIDs))
		if status != "" {
			countQuery = countQuery.Where("status = ?", status)
		}
		countQuery.Count(&totalCount)

		dataQuery := db.Preload("Games", func(db *gorm.DB) *gorm.DB {
			return db.Select("id, created_at, updated_at, deleted_at, winner_id, loser_id, draw, status, match_id").Order("games.id ASC")
		}).
			Preload("Players", func(db *gorm.DB) *gorm.DB {
				return db.Select("id, name, elo, client_id")
			}).
			Preload("Players.EloHistory", func(db *gorm.DB) *gorm.DB {
				return db.Order("created_at DESC").Limit(100)
			}).
			Where("id = ANY(?)", pq.Array(matchIDs))

		if status != "" {
			dataQuery = dataQuery.Where("status = ?", status)
		}

		dataQuery.Order(fmt.Sprintf("%s %s", sortField, sortDir)).Offset(offset).Limit(pageSize).
			Find(&matches)
	} else {
		countQuery := db.Model(&Match{})
		if status != "" {
			countQuery = countQuery.Where("status = ?", status)
		}
		countQuery.Count(&totalCount)

		dataQuery := db.Preload("Games", func(db *gorm.DB) *gorm.DB {
			return db.Select("id, created_at, updated_at, deleted_at, winner_id, loser_id, draw, status, match_id").Order("games.id ASC")
		}).
			Preload("Players", func(db *gorm.DB) *gorm.DB {
				return db.Select("id, name, elo, client_id")
			}).
			Preload("Players.EloHistory", func(db *gorm.DB) *gorm.DB {
				return db.Order("created_at DESC").Limit(100)
			})

		if status != "" {
			dataQuery = dataQuery.Where("status = ?", status)
		}

		dataQuery.Order(fmt.Sprintf("%s %s", sortField, sortDir)).Offset(offset).Limit(pageSize).
			Find(&matches)
	}

	return matches, totalCount
}

func getMatchesWithPlayers(players []int) []Match {
	var matches []Match

	if len(players) > 0 {
		var matchesWithPlayers []int

		db.Table("match_players").Where("player_id = ANY(?)", pq.Array(players)).Select("match_id").Find(&matchesWithPlayers)

		db.Preload("Games", func(db *gorm.DB) *gorm.DB {
			return db.Select("id, created_at, updated_at, deleted_at, winner_id, loser_id, draw, status, match_id").Order("games.id ASC")
		}).
			Preload("Players", func(db *gorm.DB) *gorm.DB {
				return db.Select("id, name, elo, client_id")
			}).
			Preload("Players.EloHistory", func(db *gorm.DB) *gorm.DB {
				return db.Order("created_at DESC").Limit(100)
			}).
			Where("id = ANY(?)", pq.Array(matchesWithPlayers)).
			Find(&matches)
	} else {
		db.Preload("Games", func(db *gorm.DB) *gorm.DB {
			return db.Select("id, created_at, updated_at, deleted_at, winner_id, loser_id, draw, status, match_id").Order("games.id ASC")
		}).
			Preload("Players", func(db *gorm.DB) *gorm.DB {
				return db.Select("id, name, elo, client_id")
			}).
			Preload("Players.EloHistory", func(db *gorm.DB) *gorm.DB {
				return db.Order("created_at DESC").Limit(100)
			}).
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

// StartMatch begins a match between two players for n games.
// It creates a cancellable context so the match can be stopped from the web UI.
func (m Match) StartMatch(db *gorm.DB) {
	ctx, cancel := context.WithCancel(context.Background())
	matchCancelFuncs.Store(m.ID, cancel)
	defer func() {
		matchCancelFuncs.Delete(m.ID)
		cancel()
	}()

	if len(m.Players) < 2 {
		log.Errorf("Cannot start match %d: expected 2 players but found %d", m.ID, len(m.Players))
		updateMatchStatus(db, m, "Error")
		return
	}

	updateMatchStatus(db, m, "In Progress")
	updateMatchStartTime(db, m, time.Now())

	player1 := m.Players[0]
	player2 := m.Players[1]

	log.Infof("Starting match %d (%d games) between %s (%d) and %s (%d) ", m.ID, m.NumGames, player1.Name, player1.Elo, player2.Name, player2.Elo)

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

	// Check if cancelled during cloning
	if ctx.Err() != nil {
		log.Infof("Match %d was stopped during repo cloning", m.ID)
		cleanUpMatchDirectory(m)
		return
	}

	var matchWG sync.WaitGroup
	matchWG.Add(m.NumGames)

	var matchSessions []int

	// Create a session for each game in the match
	for range m.NumGames {
		insertSession(db, &Session{})
		currentSession := getCurrentSessionID(db)
		matchSessions = append(matchSessions, currentSession)
	}

	// play a game concurrently for each session we created
	for _, session := range matchSessions {
		go func(currentSession int) {
			defer matchWG.Done()

			// Skip starting new games if match was cancelled
			if ctx.Err() != nil {
				return
			}

			g := Game{
				Players:   players,
				Match:     m,
				SessionID: currentSession,
			}

			insertGame(db, &g)
			addGameToMatch(db, m, g)
			addGameToPlayer(db, player1, g)
			addGameToPlayer(db, player2, g)

			g.PlayGame(ctx, currentSession)
		}(session)
	}

	// Add a timeout to wait for games to complete
	gameCompletionChan := make(chan bool, 1)
	go func() {
		matchWG.Wait()
		gameCompletionChan <- true
	}()

	// Games should either complete with a winner/loser/draw or fail with an error
	log.Infof("Waiting for all %d games in match %d to complete naturally", m.NumGames, m.ID)
	<-gameCompletionChan

	// If the match was stopped, don't mark it complete
	if ctx.Err() != nil {
		log.Infof("Match %d was stopped, skipping completion logic", m.ID)
		cleanUpMatchDirectory(m)
		playerDirs := []string{
			matchDir + "/" + player1.Name + "/",
			matchDir + "/" + player2.Name + "/",
		}
		cleanupGameSyncMaps(m.ID, matchSessions, playerDirs)
		return
	}

	// Refresh game data from database to get final statuses
	refreshedMatch := getMatch(int(m.ID))
	games := refreshedMatch.Games

	// Verify all games are accounted for
	if len(games) < m.NumGames {
		log.Warningf("Match %d unexpectedly has fewer games than expected (%d vs %d)",
			m.ID, len(games), m.NumGames)
	}

	// Check if any games are still not in a final state (this shouldn't happen since we waited)
	for _, game := range games {
		if game.Status != "Complete" && game.Status != "Error" {
			log.Warningf("Game %d in match %d has unexpected status %s after wait completed",
				game.ID, m.ID, game.Status)
		}
	}

	player1Wins := 0
	player2Wins := 0

	// for each game played, calculate the winner/loser tally
	for _, game := range games {
		if game.Status == "Complete" || game.Status == "Error" {
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
		updateMatchDraw(db, m, true)
	}

	cleanUpMatchDirectory(m)
	// Free sync.Map entries for this match to prevent memory leaks
	playerDirs := []string{
		matchDir + "/" + player1.Name + "/",
		matchDir + "/" + player2.Name + "/",
	}
	cleanupGameSyncMaps(m.ID, matchSessions, playerDirs)
	updateMatchStatus(db, m, "Complete")
	updateMatchEndTime(db, m, time.Now())
}

// StopMatch cancels a running match by invoking its cancel function.
// This kills all running game processes and marks remaining games as Canceled.
func StopMatch(db *gorm.DB, matchID int) error {
	cancelVal, ok := matchCancelFuncs.Load(uint(matchID))
	if !ok {
		return fmt.Errorf("match %d is not currently running", matchID)
	}

	cancel := cancelVal.(context.CancelFunc)
	cancel()

	// Mark any in-progress games as canceled
	match := getMatch(matchID)
	for _, game := range match.Games {
		if game.Status == "In Progress" || game.Status == "" {
			updateGameStatus(db, game, "Canceled")
			updateGameErrorMessage(db, game, "Match was stopped by user")
		}
	}

	updateMatchStatus(db, match, "Stopped")
	updateMatchEndTime(db, match, time.Now())

	log.Infof("Match %d stopped by user", matchID)
	return nil
}

// RestartMatch resets a match and starts it again.
// Clears existing games, resets status, and re-runs the match.
func RestartMatch(db *gorm.DB, matchID int) error {
	// If still running, stop it first
	if cancelVal, ok := matchCancelFuncs.Load(uint(matchID)); ok {
		cancel := cancelVal.(context.CancelFunc)
		cancel()
		// Give goroutines a moment to clean up
		time.Sleep(500 * time.Millisecond)
	}

	match := getMatch(matchID)
	if match.ID == 0 {
		return fmt.Errorf("match %d not found", matchID)
	}

	// Only allow restart from Complete, Error, or Stopped states
	if match.Status != "Complete" && match.Status != "Error" && match.Status != "Stopped" {
		return fmt.Errorf("match %d has status '%s' and cannot be restarted", matchID, match.Status)
	}

	// Remove existing game associations and soft-delete games
	for _, game := range match.Games {
		db.Delete(&Game{}, game.ID)
	}
	db.Model(&match).Association("Games").Clear()

	// Reset match fields
	updateMatchStatus(db, match, "Pending")
	updateMatchDraw(db, match, false)

	matchLock.Lock()
	var m Match
	db.Where("id = ?", match.ID).First(&m)
	m.StartTime = time.Time{}
	m.EndTime = time.Time{}
	db.Save(&m)
	matchLock.Unlock()

	// Start the match in a goroutine
	freshMatch := getMatch(matchID)
	go func() {
		defer func() {
			if r := recover(); r != nil {
				log.Errorf("Panic recovered in RestartMatch goroutine for match %d: %v", matchID, r)
				updateMatchStatus(db, freshMatch, "Error")
			}
		}()
		freshMatch.StartMatch(db)
	}()

	log.Infof("Match %d restarted by user", matchID)
	return nil
}

func cleanUpMatchDirectory(match Match) {
	matchDir := filepath.FromSlash("tmp/" + strconv.Itoa(int(match.ID)))

	err := os.RemoveAll(matchDir)

	if err != nil {
		log.Warningln(err)
	}
}

func compareMatches(matchOne Match, matchTwo Match) bool {
	return matchOne.ID == matchTwo.ID &&
		matchOne.CreatedAt == matchTwo.CreatedAt &&
		matchOne.UpdatedAt == matchTwo.UpdatedAt &&
		matchOne.DeletedAt == matchTwo.DeletedAt
}

func getPlayerWithMostWins(match Match) (Player, bool) {
	if len(match.Players) < 2 {
		log.Errorf("Cannot determine winner for match %d: expected 2 players but found %d", match.ID, len(match.Players))
		if len(match.Players) == 1 {
			return match.Players[0], false
		}
		return Player{}, true
	}

	player1 := match.Players[0]
	player2 := match.Players[1]

	var player1Wins float32 = 0
	var player2Wins float32 = 0

	for _, g := range match.Games {
		if g.Draw {
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
	// Get a fresh copy of the match with all games loaded
	match := getMatch(matchID)
	if match.ID == 0 {
		log.Warningf("Match ID %d not found in CheckAndUpdateMatchStatus", matchID)
		return
	}

	if match.Status == "Complete" {
		return
	}

	// If the match isn't in progress yet, there's nothing to check
	if match.Status != "In Progress" {
		return
	}

	allGamesComplete := true

	if len(match.Games) < match.NumGames {
		// Not all games have been created yet
		log.Debugf("Match %d has only %d/%d games, not all created yet",
			matchID, len(match.Games), match.NumGames)
		return
	}

	for _, game := range match.Games {
		if game.Status != "Complete" && game.Status != "Error" && game.Status != "Canceled" {
			allGamesComplete = false
			log.Debugf("Match %d has game %d with status %s, waiting for completion",
				matchID, game.ID, game.Status)
			break
		}
	}

	if allGamesComplete {
		log.Infof("Match %d has all games complete. Updating match status to Complete.", matchID)

		// Calculate if it's a draw
		player1Wins := 0
		player2Wins := 0

		if len(match.Players) >= 2 && len(match.Games) > 0 {
			for _, game := range match.Games {
				// Include both Complete and Canceled games in win counting
				if (game.Status == "Complete" || game.Status == "Canceled") && !game.Draw {
					if game.Winner != nil && game.Winner.ID == match.Players[0].ID {
						player1Wins++
					} else if game.Winner != nil && game.Winner.ID == match.Players[1].ID {
						player2Wins++
					}
				}
			}

			// Update draw status
			if player1Wins == player2Wins {
				updateMatchDraw(db, match, true)
			}
		}

		updateMatchStatus(db, match, "Complete")
		if match.EndTime.IsZero() {
			updateMatchEndTime(db, match, time.Now())
		}

		// Important: Notify any tournament this match belongs to that it might need to progress
		var tournamentMatches []struct {
			TournamentID uint
		}

		db.Table("tournament_matches").
			Where("match_id = ?", match.ID).
			Select("tournament_id").
			Find(&tournamentMatches)

		for _, tm := range tournamentMatches {
			log.Infof("Match %d completed, notifying tournament %d to check for progression",
				match.ID, tm.TournamentID)
		}
	}
}

// updateMatchStatusOnly updates match status without trying to notify tournaments
// Used to avoid deadlocks during tournament progression
func updateMatchStatusOnly(db *gorm.DB, matchID int) {
	match := getMatch(matchID)
	if match.ID == 0 {
		log.Warningf("Match ID %d not found in updateMatchStatusOnly", matchID)
		return
	}

	if match.Status == "Complete" {
		return
	}

	if match.Status != "In Progress" {
		return
	}

	allGamesComplete := true

	if len(match.Games) < match.NumGames {
		// Not all games have been created yet
		log.Debugf("Match %d has only %d/%d games, not all created yet",
			matchID, len(match.Games), match.NumGames)
		return
	}

	// Then check each game's status
	for _, game := range match.Games {
		if game.Status != "Complete" && game.Status != "Error" && game.Status != "Canceled" {
			allGamesComplete = false
			log.Debugf("Match %d has game %d with status %s, waiting for completion",
				matchID, game.ID, game.Status)
			break
		}
	}

	if allGamesComplete {
		log.Infof("Match %d has all games complete. Updating match status to Complete (no tournament notification).", matchID)

		// Calculate if it's a draw
		player1Wins := 0
		player2Wins := 0

		if len(match.Players) >= 2 && len(match.Games) > 0 {
			for _, game := range match.Games {
				// Include both Complete and Canceled games in win counting
				if (game.Status == "Complete" || game.Status == "Canceled") && !game.Draw {
					if game.Winner != nil && game.Winner.ID == match.Players[0].ID {
						player1Wins++
					} else if game.Winner != nil && game.Winner.ID == match.Players[1].ID {
						player2Wins++
					}
				}
			}

			// Update draw status
			if player1Wins == player2Wins {
				updateMatchDraw(db, match, true)
			}
		}

		// Mark the match complete and set end time if not already set
		updateMatchStatus(db, match, "Complete")
		if match.EndTime.IsZero() {
			updateMatchEndTime(db, match, time.Now())
		}

		// Important: We DO NOT notify tournaments here, as this function is used
		// specifically to avoid circular dependencies during tournament progression
	}
}

// CreateGamesForMatch creates the required number of games for a match and starts them
// This operates similarly to StartMatch but avoids blocking the calling thread
func CreateGamesForMatch(db *gorm.DB, matchID uint) {
	// Use the default options (with tournament notifications)
	createGamesForMatchWithOptions(db, matchID, false)
}

// createGamesForMatchWithOptions creates games for a match with additional options
// isPartOfProgression=true will use the non-tournament notifying version of status updates
// to prevent circular lock dependencies during tournament progression
func createGamesForMatchWithOptions(db *gorm.DB, matchID uint, isPartOfProgression bool) {
	match := getMatch(int(matchID))
	if match.ID == 0 {
		log.Errorf("Failed to find match %d for creating games", matchID)
		return
	}

	// If the match doesn't have enough players, we can't create games
	if len(match.Players) < 2 {
		log.Errorf("Match %d doesn't have enough players to create games", matchID)
		return
	}

	player1 := match.Players[0]
	player2 := match.Players[1]

	log.Infof("Creating %d games for match %d between %s and %s", match.NumGames, match.ID, player1.Name, player2.Name)

	// Init players slice
	players := []Player{
		player1,
		player2,
	}

	var matchDir = filepath.FromSlash("tmp/" + strconv.Itoa(int(match.ID)))

	// Clone repositories up front (not in the goroutines)
	log.Infof("Cloning %s's repo: %s to %s", player1.Name, player1.Client.Repo, matchDir)
	player1.Client.CloneRepo(matchDir + "/" + player1.Name)

	log.Infof("Cloning %s's repo: %s to %s", player2.Name, player2.Client.Repo, matchDir)
	player2.Client.CloneRepo(matchDir + "/" + player2.Name)

	// Create a wait group to track game completion
	var matchWG sync.WaitGroup
	matchWG.Add(match.NumGames)

	var matchSessions []int

	// Create a session for each game in the match
	for i := 0; i < match.NumGames; i++ {
		insertSession(db, &Session{})
		currentSession := getCurrentSessionID(db)
		matchSessions = append(matchSessions, currentSession)
	}

	// Launch all the game goroutines
	for _, session := range matchSessions {
		go func(currentSession int) {
			defer matchWG.Done()

			// Recover from panics to avoid crashing the server
			defer func() {
				if r := recover(); r != nil {
					log.Errorf("Panic in game execution for match %d, session %d: %v", match.ID, currentSession, r)
				}
			}()

			g := Game{
				Players:   players,
				Match:     match,
				SessionID: currentSession,
				Status:    "Pending", // Start as Pending
			}

			insertGame(db, &g)
			addGameToMatch(db, match, g)
			addGameToPlayer(db, player1, g)
			addGameToPlayer(db, player2, g)

			log.Infof("Created game %d for match %d, session %d", g.ID, match.ID, currentSession)

			// Launch the game
			g.PlayGame(context.Background(), currentSession)

			log.Infof("Game %d for match %d session %d has completed", g.ID, match.ID, currentSession)
		}(session)
	}

	// Launch a monitoring goroutine to track overall match completion
	go func() {
		// Monitor game completion and update match status
		gameCompletionChan := make(chan bool, 1)
		go func() {
			matchWG.Wait()
			gameCompletionChan <- true
		}()

		// Wait for all games to complete - no timeout
		// This ensures no games are ever marked as canceled
		<-gameCompletionChan
		log.Infof("All games for match %d have completed naturally", match.ID)

		// Refresh match data and update status
		refreshedMatch := getMatch(int(match.ID))

		// Use appropriate status update function based on context
		if isPartOfProgression {
			// Use the version that doesn't notify tournaments to prevent deadlock
			log.Infof("Match %d was part of tournament progression, using non-notifying status update", match.ID)
			updateMatchStatusOnly(db, int(refreshedMatch.ID))
		} else {
			// Regular path for matches outside of tournament progression
			CheckAndUpdateMatchStatus(db, int(refreshedMatch.ID))
		}

		// Clean up match directory and free sync.Map entries to prevent memory leaks
		cleanUpMatchDirectory(match)
		playerDirs := []string{
			matchDir + "/" + player1.Name + "/",
			matchDir + "/" + player2.Name + "/",
		}
		cleanupGameSyncMaps(match.ID, matchSessions, playerDirs)
	}()
}

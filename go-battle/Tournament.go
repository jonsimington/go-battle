package main

import (
	"sort"
	"sync"
	"time"

	"github.com/lib/pq"
	"gorm.io/gorm"
)

type Tournament struct {
	gorm.Model

	Name    string   `json:"name"`
	Players []Player `json:"players" gorm:"many2many:tournament_players"`
	Games   []Game   `json:"games" gorm:"many2many:tournament_games"`
	Matches []Match  `json:"matches" gorm:"many2many:tournament_matches"`

	Winner    *Player   `json:"winner" gorm:"foreignKey:WinnerID"`
	WinnerID  *int      `json:"winner_id" gorm:"default:null"`
	Type      string    `json:"type" gorm:"default:swiss"`
	Status    string    `json:"status"`
	StartTime time.Time `json:"start_time"`
	EndTime   time.Time `json:"end_time"`
}

const (
	WhiteColor int = 0
	BlackColor int = 1
)

const (
	GameResultLoss int = 0
	GameResultWin  int = 1
)

// Maximum number of rounds before forcing tournament completion
const MaxRounds = 20

type TournamentPlayer struct {
	Player          *Player   `json:"player"`
	Score           float32   `json:"score"`
	PastOpponents   []*Player `json:"past_opponents"`
	NumGamesWhite   int       `json:"num_games_white"`
	NumGamesBlack   int       `json:"num_games_black"`
	ColorPreference int       `json:"color_preference"`
	ByeGames        []int     `json:"bye_games"`
	LastGameResult  int       `json:"last_game_result"`
}

var tournamentLock = &sync.Mutex{}

func insertTournament(db *gorm.DB, tournament *Tournament) {
	tournamentLock.Lock()
	defer tournamentLock.Unlock()

	players := tournament.Players

	// Clear the players to avoid the large parameter insert
	tournament.Players = nil

	// Create the tournament without the many-to-many associations
	result := db.Create(&tournament)
	if result.Error != nil {
		log.Errorf("Failed to create tournament: %v", result.Error)
		return
	}

	// Now add the players one by one using direct SQL to avoid parameter limit
	for _, player := range players {
		err := db.Exec(
			"INSERT INTO tournament_players (tournament_id, player_id) VALUES (?, ?)",
			tournament.ID, player.ID,
		).Error

		if err != nil {
			log.Errorf("Failed to associate player %d with tournament: %v", player.ID, err)
		}
	}
}

func getTournaments(ids []int) []Tournament {
	var tournaments []Tournament

	if len(ids) > 0 {
		db.Preload("Games").
			Preload("Games.Winner").
			Preload("Games.Loser").
			Preload("Players").
			Preload("Players.Client").
			Preload("Players.Games").
			Preload("Matches").
			Preload("Matches.Games").
			Preload("Matches.Players").
			Preload("Matches.Players.Games").
			Preload("Matches.Players.EloHistory", func(db *gorm.DB) *gorm.DB {
				return db.Order("created_at DESC").Limit(100)
			}).
			Where("id = ANY(?)", pq.Array(ids)).
			Find(&tournaments)
	} else {
		db.Preload("Games").
			Preload("Games.Winner").
			Preload("Games.Loser").
			Preload("Players").
			Preload("Players.Client").
			Preload("Players.Games").
			Preload("Matches").
			Preload("Matches.Games").
			Preload("Matches.Players").
			Preload("Matches.Players.Games").
			Preload("Matches.Players.EloHistory", func(db *gorm.DB) *gorm.DB {
				return db.Order("created_at DESC").Limit(100)
			}).
			Find(&tournaments)
	}

	return tournaments
}

func getTournament(db *gorm.DB, id int) Tournament {
	var t Tournament

	db.Preload("Games").
		Preload("Games.Winner").
		Preload("Games.Loser").
		Preload("Players").
		Preload("Players.Client").
		Preload("Players.Games").
		Preload("Matches").
		Preload("Matches.Games").
		Preload("Matches.Players").
		Preload("Matches.Players.Games").
		Preload("Matches.Players.EloHistory", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at DESC").Limit(100)
		}).
		Where("id = ?", id).First(&t)

	return t
}

func addMatchToTournament(db *gorm.DB, match Match, tournament Tournament) {
	tournamentLock.Lock()
	defer tournamentLock.Unlock()

	var t Tournament
	db.Where("id = ?", tournament.ID).First(&t)

	// Use direct SQL to add the association instead of appending to the slice
	// This avoids the large parameter insert that exceeds PostgreSQL's 65535 parameter limit
	err := db.Exec(
		"INSERT INTO tournament_matches (tournament_id, match_id) VALUES (?, ?)",
		t.ID, match.ID,
	).Error

	if err != nil {
		log.Errorf("Failed to add match to tournament: %v", err)
	}
}

func addGameToTournament(db *gorm.DB, game Game, tournament Tournament) {
	tournamentLock.Lock()
	defer tournamentLock.Unlock()

	var t Tournament
	db.Where("id = ?", tournament.ID).First(&t)

	// Use direct SQL to add the association instead of appending to the slice
	// This avoids the large parameter insert that exceeds PostgreSQL's 65535 parameter limit
	err := db.Exec(
		"INSERT INTO tournament_games (tournament_id, game_id) VALUES (?, ?)",
		t.ID, game.ID,
	).Error

	if err != nil {
		log.Errorf("Failed to add game to tournament: %v", err)
	}
}

func updateTournamentStatus(db *gorm.DB, tournament Tournament, status string) {
	tournamentLock.Lock()
	defer tournamentLock.Unlock()

	var t Tournament

	db.Where("id = ?", tournament.ID).First(&t)

	t.Status = status

	db.Save(&t)
}

func updateTournamentEndTime(db *gorm.DB, tournament Tournament, date time.Time) {
	tournamentLock.Lock()
	defer tournamentLock.Unlock()

	var t Tournament

	db.Where("id = ?", tournament.ID).First(&t)

	t.EndTime = date

	db.Save(&t)
}

func updateTournamentStartTime(db *gorm.DB, tournament Tournament, date time.Time) {
	tournamentLock.Lock()
	defer tournamentLock.Unlock()

	var t Tournament

	db.Where("id = ?", tournament.ID).First(&t)

	t.StartTime = date

	db.Save(&t)
}

func updateTournamentWinner(db *gorm.DB, tournament Tournament, winner *Player) {
	tournamentLock.Lock()
	defer tournamentLock.Unlock()

	var t Tournament

	db.Where("id = ?", tournament.ID).First(&t)

	winnerID := int(winner.ID)
	t.WinnerID = &winnerID
	t.Winner = winner

	db.Save(&t)
}

func BuildTournamentPlayers(players []Player) []*TournamentPlayer {
	var tournamentPlayers []*TournamentPlayer

	for i := range players {
		t := TournamentPlayer{
			Player:        &players[i],
			Score:         0.0,
			PastOpponents: make([]*Player, 0),
			NumGamesWhite: 0,
			NumGamesBlack: 0,
			ByeGames:      make([]int, 0),
		}

		tournamentPlayers = append(tournamentPlayers, &t)
	}

	return tournamentPlayers
}

// createMatchesFromPairings creates matches from Swiss pairings and adds them to a tournament
func createMatchesFromPairings(db *gorm.DB, tournament Tournament, roundPairings []MatchPairing, roundNumber int) int {
	log.Infof("Creating matches for tournament %d round %d, got %d pairings", tournament.ID, roundNumber, len(roundPairings))
	matchCount := 0

	// Validate tournament has a valid ID
	if tournament.ID == 0 {
		log.Errorf("Invalid tournament ID (0) passed to createMatchesFromPairings")
		return 0
	}

	// Start a database transaction to ensure all match creations are atomic
	tx := db.Begin()
	if tx.Error != nil {
		log.Errorf("Failed to begin transaction: %v", tx.Error)
		return 0
	}

	// Create a list to store match IDs for delayed starting
	var matchIDs []uint

	// Process each pairing
	for i, pairing := range roundPairings {
		// For bye matches, create a special match with just one player
		if pairing.IsBye {
			log.Infof("Creating bye match for player %s (ID:%d) in round %d",
				pairing.Player1.Name, pairing.Player1.ID, roundNumber)

			// Create the match record with a single player
			match := Match{
				NumGames: 0, // Bye matches don't have any games
				Players: []Player{
					pairing.Player1,
				},
				Status: "Complete", // Bye matches are automatically complete
				Draw:   false,      // Bye matches are automatic wins
			}

			// Insert the match in the database within transaction
			if err := tx.Create(&match).Error; err != nil {
				log.Errorf("Failed to create bye match in database: %v", err)
				tx.Rollback()
				return 0
			}
			log.Infof("Bye match %d created successfully in database", match.ID)

			// Add match to tournament within transaction
			if err := tx.Exec(
				"INSERT INTO tournament_matches (tournament_id, match_id) VALUES (?, ?)",
				tournament.ID, match.ID,
			).Error; err != nil {
				log.Errorf("Failed to add bye match to tournament: %v", err)
				tx.Rollback()
				return 0
			}

			// Set match times immediately since it's automatically complete
			updateMatchStartTime(db, match, time.Now())
			updateMatchEndTime(db, match, time.Now())

			matchCount++
			continue
		}

		// Handle regular matches as before
		player1 := pairing.Player1
		player2 := pairing.Player2

		// Enhanced validation of players
		if player1.ID == 0 || player2.ID == 0 {
			log.Errorf("Skipping invalid pairing in round %d: player ID is 0", roundNumber)
			continue
		}

		if player1.Name == "" || player2.Name == "" {
			log.Warnf("Skipping invalid pairing in round %d: missing player name", roundNumber)
			continue
		}

		log.Infof("Creating match between %s (ID:%d) and %s (ID:%d) (round %d, pairing %d)",
			player1.Name, player1.ID, player2.Name, player2.ID, roundNumber, i)

		// Create the match record
		match := Match{
			NumGames: 5,
			Players: []Player{
				player1,
				player2,
			},
			Status: "Pending",
		}

		// Insert the match in the database within transaction
		if err := tx.Create(&match).Error; err != nil {
			log.Errorf("Failed to create match in database: %v", err)
			tx.Rollback()
			return 0
		}
		log.Infof("Match %d created successfully in database", match.ID)

		// Add match to tournament within transaction
		if err := tx.Exec(
			"INSERT INTO tournament_matches (tournament_id, match_id) VALUES (?, ?)",
			tournament.ID, match.ID,
		).Error; err != nil {
			log.Errorf("Failed to add match to tournament: %v", err)
			tx.Rollback()
			return 0
		}

		matchCount++
		matchIDs = append(matchIDs, match.ID)
	}

	// Commit the transaction
	if err := tx.Commit().Error; err != nil {
		log.Errorf("Failed to commit transaction: %v", err)
		tx.Rollback()
		return 0
	}

	log.Infof("Successfully created and saved %d matches in database for tournament %d round %d",
		matchCount, tournament.ID, roundNumber)

	// Now start the regular matches one by one (not in goroutines)
	for i, matchID := range matchIDs {
		// Get a fresh copy of the match from the database
		matchToStart := getMatch(int(matchID))
		if matchToStart.ID == 0 {
			log.Errorf("Failed to load match with ID %d from database", matchID)
			continue
		}

		log.Infof("Starting match %d (pairing %d) from tournament %d round %d",
			matchID, i, tournament.ID, roundNumber)

		// Set match status to In Progress and update start time
		updateMatchStatus(db, matchToStart, "In Progress")
		updateMatchStartTime(db, matchToStart, time.Now())

		// Create games for this match - IMPORTANT: Use the version that avoids tournament notifications
		// to prevent deadlocks during tournament progression
		log.Infof("Creating games for match %d with isPartOfProgression=true", matchID)
		createGamesForMatchWithOptions(db, matchID, true)

		log.Infof("Match %d (pairing %d from round %d) started with games created",
			matchID, i, roundNumber)
	}

	log.Infof("Successfully processed creation of %d matches for tournament %d round %d",
		matchCount, tournament.ID, roundNumber)

	return matchCount
}

func (t Tournament) StartTournament(id int) {
	tournament := getTournament(db, id)

	// Set tournament status to In Progress
	updateTournamentStatus(db, tournament, "In Progress")
	updateTournamentStartTime(db, tournament, time.Now())

	log.Infof("Starting Tournament %d", id)

	// Initialize tournament players
	tournamentPlayers := BuildTournamentPlayers(tournament.Players)

	// For round 1, sort by ELO rating
	sort.SliceStable(tournamentPlayers[:], func(i, j int) bool {
		return tournamentPlayers[i].Player.Elo > tournamentPlayers[j].Player.Elo
	})

	// Create first round pairings
	roundPairings := SwissPairing(tournamentPlayers, 1)
	log.Infof("Creating %d matches for Tournament %d, Round 1", len(roundPairings), id)

	// Create the first round of matches
	createMatchesFromPairings(db, tournament, roundPairings, 1)

	log.Infof("Tournament %d initialization complete with %d first-round matches", id, len(roundPairings))

	// Tournament will now progress automatically as matches complete
	// The CheckAndUpdateMatchStatus function will trigger checkTournamentProgress when matches complete
}

// ProgressTournament advances a tournament to its next round based on completed match results
func ProgressTournament(db *gorm.DB, tournamentID int) {
	tournamentLock.Lock()

	// Get fresh tournament data with all relationships loaded
	tournament := getTournament(db, tournamentID)

	// Skip if tournament is already completed
	if tournament.Status == "Completed" {
		log.Infof("Tournament %d is already complete, not progressing", tournamentID)
		tournamentLock.Unlock()
		return
	}

	// Better round detection - use a more precise method to determine round number
	currentRound := GetTournamentCurrentRound(db, tournament.ID)
	log.Infof("Tournament %d has completed round %d", tournamentID, currentRound)

	// Build tournament players with current tournament state to check standings
	tournamentPlayers := buildTournamentPlayersFromResults(tournament)

	// Sort players by score to check if we have a clear winner
	sort.Slice(tournamentPlayers, func(i, j int) bool {
		return tournamentPlayers[i].Score > tournamentPlayers[j].Score
	})

	// Check for tournament completion conditions
	shouldComplete := false

	// Condition 1: Maximum rounds reached
	if currentRound >= MaxRounds {
		log.Infof("Tournament %d has reached maximum rounds (%d), ending tournament", tournamentID, MaxRounds)
		shouldComplete = true
	}

	// Condition 2: Clear winner (highest scoring player cannot be caught)
	if len(tournamentPlayers) > 1 {
		leader := tournamentPlayers[0]
		secondPlace := tournamentPlayers[1]
		remainingRoundsPossible := MaxRounds - currentRound       // Use MaxRounds instead of player count
		maxPossiblePointsGain := float32(remainingRoundsPossible) // 1 point per round win

		// If second place can't catch up even if they win all remaining possible games
		if secondPlace.Score+maxPossiblePointsGain < leader.Score {
			log.Infof("Tournament %d has a clear winner, no other player can catch up", tournamentID)
			shouldComplete = true
		}
	}

	if shouldComplete {
		winner := determineSwissTournamentWinner(tournament)
		if winner != nil && winner.ID > 0 {
			updateTournamentWinner(db, tournament, winner)
			log.Infof("Tournament %d winner: %s (ID: %d)", tournamentID, winner.Name, winner.ID)
		} else {
			log.Warningf("Could not determine winner for tournament %d or winner ID was invalid", tournamentID)
		}
		updateTournamentStatus(db, tournament, "Completed")
		updateTournamentEndTime(db, tournament, time.Now())
		tournamentLock.Unlock()
		return
	}

	// Continue to next round
	nextRound := currentRound + 1
	log.Infof("Starting Tournament %d, Round %d", tournamentID, nextRound)

	// Update the metadata for current round
	err := SetTournamentCurrentRound(db, tournament.ID, nextRound)
	if err == nil {
		log.Infof("Updated tournament %d metadata to round %d", tournament.ID, nextRound)
	} else {
		log.Errorf("Failed to update tournament round metadata: %v", err)
	}

	// Create pairings for the next round using the Swiss pairing algorithm
	roundPairings := SwissPairing(tournamentPlayers, nextRound)

	// Debug the pairings to ensure they're correctly formed
	log.Infof("Generated %d pairings for tournament %d round %d", len(roundPairings), tournamentID, nextRound)
	for i, pairing := range roundPairings {
		if pairing.IsBye {
			log.Infof("Pairing %d: %s vs BYE", i, pairing.Player1.Name)
		} else {
			log.Infof("Pairing %d: %s vs %s", i, pairing.Player1.Name, pairing.Player2.Name)
		}
	}

	// Release the lock before I/O-heavy match creation (repo cloning, game launching)
	// The pairings and round metadata are already persisted, so it's safe to release
	tournamentLock.Unlock()

	// Create matches for the new round (may involve repo cloning, so done outside lock)
	log.Infof("Creating matches for tournament %d round %d with %d pairings",
		tournamentID, nextRound, len(roundPairings))

	matchCount := createMatchesFromPairings(db, tournament, roundPairings, nextRound)
	log.Infof("Created %d matches for round %d of tournament %d", matchCount, nextRound, tournamentID)

	// If no matches were created (no valid pairings possible), end the tournament
	if matchCount == 0 {
		tournamentLock.Lock()
		log.Infof("No new matches created for tournament %d, marking as complete", tournamentID)
		winner := determineSwissTournamentWinner(tournament)
		if winner != nil && winner.ID > 0 {
			updateTournamentWinner(db, tournament, winner)
			log.Infof("Tournament %d winner: %s (ID: %d)", tournamentID, winner.Name, winner.ID)
		} else {
			log.Warningf("Could not determine winner for tournament %d or winner ID was invalid", tournamentID)
		}
		updateTournamentStatus(db, tournament, "Completed")
		updateTournamentEndTime(db, tournament, time.Now())
		tournamentLock.Unlock()
	}
}

func compareTournaments(tournamentOne Tournament, tournamentTwo Tournament) bool {
	return tournamentOne.ID == tournamentTwo.ID &&
		tournamentOne.CreatedAt == tournamentTwo.CreatedAt &&
		tournamentOne.UpdatedAt == tournamentTwo.UpdatedAt &&
		tournamentOne.DeletedAt == tournamentTwo.DeletedAt
}

// buildTournamentPlayersFromResults builds TournamentPlayer records from actual match results
func buildTournamentPlayersFromResults(tournament Tournament) []*TournamentPlayer {
	var tournamentPlayers []*TournamentPlayer

	// Initialize all players with empty records
	playerMap := make(map[uint]*TournamentPlayer)
	for _, player := range tournament.Players {
		tp := &TournamentPlayer{
			Player:          &player,
			Score:           0.0,
			PastOpponents:   make([]*Player, 0),
			NumGamesWhite:   0,
			NumGamesBlack:   0,
			ColorPreference: 0,
			ByeGames:        make([]int, 0),
			LastGameResult:  0,
		}
		playerMap[player.ID] = tp
		tournamentPlayers = append(tournamentPlayers, tp)
	}

	// Process all matches to update player scores and past opponents
	for _, match := range tournament.Matches {
		// Skip incomplete matches
		if match.Status != "Complete" {
			continue
		}

		// Handle bye matches (1 player) - award 1 point for the bye
		if len(match.Players) == 1 {
			byePlayer := match.Players[0]
			if tp, ok := playerMap[byePlayer.ID]; ok {
				tp.Score += 1.0
				tp.LastGameResult = GameResultWin
			}
			continue
		}

		if len(match.Players) < 2 {
			log.Warningf("Match %d has no players, skipping", match.ID)
			continue
		}

		player1 := match.Players[0]
		player2 := match.Players[1]

		tp1 := playerMap[player1.ID]
		tp2 := playerMap[player2.ID]

		// Add each player to the other's past opponents list
		tp1.PastOpponents = append(tp1.PastOpponents, &player2)
		tp2.PastOpponents = append(tp2.PastOpponents, &player1)

		// Count wins for each player
		player1Wins := 0
		player2Wins := 0

		for _, game := range match.Games {
			if game.Status != "Complete" && game.Status != "Error" {
				continue
			}

			if game.Draw {
				// For a draw, both players get 0.5 point
				tp1.Score += 0.5
				tp2.Score += 0.5
			} else if game.Winner != nil && game.Loser != nil {
				if game.Winner.ID == player1.ID {
					player1Wins++
					tp1.Score += 1.0
				} else if game.Winner.ID == player2.ID {
					player2Wins++
					tp2.Score += 1.0
				}
			}
		}

		// Set last game result based on overall match outcome
		if player1Wins > player2Wins {
			tp1.LastGameResult = GameResultWin
			tp2.LastGameResult = GameResultLoss
		} else if player2Wins > player1Wins {
			tp1.LastGameResult = GameResultLoss
			tp2.LastGameResult = GameResultWin
		} else {
			// It's a draw - no change to LastGameResult
		}
	}

	// Sort by score (highest first) for proper Swiss pairings
	sort.Slice(tournamentPlayers, func(i, j int) bool {
		return tournamentPlayers[i].Score > tournamentPlayers[j].Score
	})

	return tournamentPlayers
}

// determineSwissTournamentWinner determines the winner of a Swiss tournament
// based on player scores from match results
func determineSwissTournamentWinner(tournament Tournament) *Player {
	tournamentPlayers := buildTournamentPlayersFromResults(tournament)

	// Sort by score (highest first)
	sort.Slice(tournamentPlayers, func(i, j int) bool {
		return tournamentPlayers[i].Score > tournamentPlayers[j].Score
	})

	if len(tournamentPlayers) > 0 && tournamentPlayers[0].Player != nil && tournamentPlayers[0].Player.ID > 0 {
		return tournamentPlayers[0].Player
	}

	return nil
}

// InitializeTournamentController starts a background process that periodically
// checks for tournament progression
func InitializeTournamentController(db *gorm.DB) {
	// Start a goroutine that runs forever and checks tournaments
	go func() {
		log.Infof("Starting tournament controller")

		// Check every 30 seconds
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				checkTournaments(db)
			}
		}
	}()
}

// checkTournaments checks all in-progress tournaments and advances them if needed
func checkTournaments(db *gorm.DB) {
	// Find all tournaments that are in progress
	var tournaments []Tournament
	db.Where("status = ?", "In Progress").
		Preload("Matches").
		Preload("Players").
		Find(&tournaments)

	if len(tournaments) == 0 {
		return // No active tournaments
	}

	log.Debugf("Checking %d active tournaments for progression", len(tournaments))

	// Check each tournament
	for _, tournament := range tournaments {
		// Check if all matches in this tournament have completed
		allMatchesComplete := true
		for _, match := range tournament.Matches {
			// First make sure match status is up-to-date
			CheckAndUpdateMatchStatus(db, int(match.ID))

			// Refresh match data in case it was updated
			updatedMatch := getMatch(int(match.ID))

			// Check if the match status is Complete
			if updatedMatch.Status != "Complete" {
				allMatchesComplete = false
				log.Debugf("Tournament %d has match %d with status %s, waiting for completion",
					tournament.ID, updatedMatch.ID, updatedMatch.Status)
				break
			}

			// Even if the match is marked as Complete, verify all games are truly complete
			if len(updatedMatch.Games) < updatedMatch.NumGames {
				allMatchesComplete = false
				log.Warnf("Match %d is marked Complete but only has %d/%d games, waiting for all games",
					updatedMatch.ID, len(updatedMatch.Games), updatedMatch.NumGames)
				break
			}

			// Verify all games in the match are in a final state (Complete, Error, or Canceled)
			for _, game := range updatedMatch.Games {
				if game.Status != "Complete" && game.Status != "Error" && game.Status != "Canceled" {
					allMatchesComplete = false
					log.Warnf("Match %d has game %d with status %s, waiting for completion",
						updatedMatch.ID, game.ID, game.Status)
					break
				}
			}

			// If we found a match that's not ready, no need to check other matches
			if !allMatchesComplete {
				break
			}
		}

		if allMatchesComplete {
			log.Infof("All matches in tournament %d are complete, progressing tournament", tournament.ID)
			ProgressTournament(db, int(tournament.ID))
		}
	}
}

// deleteTournament removes a tournament and its associations from the database
func deleteTournament(db *gorm.DB, id int) {
	tournamentLock.Lock()
	defer tournamentLock.Unlock()

	// Use direct SQL to remove associations to avoid parameter limit issues
	db.Exec("DELETE FROM tournament_players WHERE tournament_id = ?", id)
	db.Exec("DELETE FROM tournament_games WHERE tournament_id = ?", id)
	db.Exec("DELETE FROM tournament_matches WHERE tournament_id = ?", id)

	// Delete the tournament
	db.Delete(&Tournament{}, id)
	log.Infof("Tournament %d deleted", id)
}

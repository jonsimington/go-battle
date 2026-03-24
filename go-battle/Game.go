package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"sync"
	"time"

	"github.com/lib/pq"
	"gorm.io/gorm"
)

// Game represents a game between two Players in a Tournament
type Game struct {
	gorm.Model

	Players      []Player `json:"players" gorm:"many2many:game_players"`
	Winner       *Player  `json:"winner" gorm:"foreignKey:WinnerID"`
	WinnerID     *int     `json:"winner_id" gorm:"default:null"`
	Loser        *Player  `json:"loser" gorm:"foreignKey:LoserID"`
	LoserID      *int     `json:"loser_id" gorm:"default:null"`
	MatchID      int      `json:"match_id"`
	Match        Match    `json:"match" gorm:"foreignKey:MatchID"`
	SessionID    int      `json:"session_id"`
	GamelogUrl   string   `json:"gamelog_url"`
	Draw         bool     `json:"draw"`
	Status       string   `json:"status"`
	ErrorMessage string   `json:"error_message"` // Store error messages for display in UI
}

var _httpClient = &http.Client{
	Timeout: time.Second * 10,
}

// clientBuildMutexes is a map of player directory paths to mutexes
// used to synchronize building of clients, especially C++ clients
var clientBuildMutexes sync.Map

// gameResultMutexes is a map of game session IDs to mutexes
// used to ensure only one goroutine processes the game results
var gameResultMutexes sync.Map

// cleanupGameSyncMaps removes entries related to a specific match from the sync.Maps
// to prevent unbounded memory growth during long-running tournaments.
func cleanupGameSyncMaps(matchID uint, sessionIDs []int, playerDirs []string) {
	for _, sid := range sessionIDs {
		gameResultMutexes.Delete(sid)
		gameResultMutexes.Delete(fmt.Sprintf("game_processed_%d", sid))
	}
	for _, dir := range playerDirs {
		clientBuildMutexes.Delete(dir)
	}
}

// getClientBuildMutex returns a mutex for the given player directory
// creating one if it doesn't exist
func getClientBuildMutex(playerDir string) *sync.Mutex {
	mutex, _ := clientBuildMutexes.LoadOrStore(playerDir, &sync.Mutex{})
	return mutex.(*sync.Mutex)
}

// getGameResultMutex returns a mutex for the given game session ID
// creating one if it doesn't exist
func getGameResultMutex(sessionID int) *sync.Mutex {
	mutex, _ := gameResultMutexes.LoadOrStore(sessionID, &sync.Mutex{})
	return mutex.(*sync.Mutex)
}

// hasProcessedGameResult checks if the game result has already been processed
// and marks it as processed if not
func hasProcessedGameResult(sessionID int) bool {
	key := fmt.Sprintf("game_processed_%d", sessionID)
	_, loaded := gameResultMutexes.LoadOrStore(key, true)
	return loaded
}

// isDrawReason checks if the provided reason indicates a draw
// by checking if it starts with "Draw" or "Stalemate"
func isDrawReason(reason string) bool {
	if len(reason) == 0 {
		return false
	}

	// Check if reason starts with "Draw"
	if len(reason) >= 4 && reason[:4] == "Draw" {
		return true
	}

	// Check if reason starts with "Stalemate"
	if len(reason) >= 9 && reason[:9] == "Stalemate" {
		return true
	}

	return false
}

// isGameTerminalStatus returns true if the game status is a final/terminal state
// that will not change further (Complete, Error, Canceled, or Incomplete).
func isGameTerminalStatus(status string) bool {
	return status == "Complete" || status == "Error" || status == "Canceled" || status == "Incomplete"
}

// StaleGameTimeout is how long a game can sit in a non-terminal state before
// the tournament controller forces it to "Incomplete" so the tournament can progress.
const StaleGameTimeout = 10 * time.Minute

// gamePreloads applies the standard Player/Winner/Loser preloads for game queries.
func gamePreloads(q *gorm.DB) *gorm.DB {
	return q.Preload("Players", func(db *gorm.DB) *gorm.DB {
		return db.Select("id, name, elo")
	}).
		Preload("Winner", func(db *gorm.DB) *gorm.DB {
			return db.Select("id, name, elo")
		}).
		Preload("Loser", func(db *gorm.DB) *gorm.DB {
			return db.Select("id, name, elo")
		})
}

func getGamesWithPlayers(players []int) []Game {
	var games []Game

	q := gamePreloads(db)
	if len(players) > 0 {
		var gamesWithPlayers []int
		db.Table("game_players").Where("player_id = ANY(?)", pq.Array(players)).Select("game_id").Find(&gamesWithPlayers)
		q = q.Where("id = ANY(?)", pq.Array(gamesWithPlayers))
	}
	q.Find(&games)

	return games
}

func getGamesByIdPaginated(ids []int, page int, pageSize int, status string, sortField string, sortDir string) ([]Game, int64) {
	var games []Game
	var totalCount int64
	offset := (page - 1) * pageSize

	query := db.Model(&Game{})
	if len(ids) > 0 {
		query = query.Where("id = ANY(?)", pq.Array(ids))
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}
	query.Count(&totalCount)

	preloaded := gamePreloads(db)
	if len(ids) > 0 {
		preloaded = preloaded.Where("id = ANY(?)", pq.Array(ids))
	}
	if status != "" {
		preloaded = preloaded.Where("status = ?", status)
	}

	preloaded.Order(fmt.Sprintf("%s %s", sortField, sortDir)).Offset(offset).Limit(pageSize).Find(&games)

	return games, totalCount
}

func getGamesWithPlayersPaginated(players []int, page int, pageSize int, status string, sortField string, sortDir string) ([]Game, int64) {
	var games []Game
	var totalCount int64
	offset := (page - 1) * pageSize

	countQuery := db.Model(&Game{})
	dataQuery := gamePreloads(db)

	if len(players) > 0 {
		var gameIDs []int
		db.Table("game_players").Where("player_id = ANY(?)", pq.Array(players)).Select("game_id").Find(&gameIDs)
		countQuery = countQuery.Where("id = ANY(?)", pq.Array(gameIDs))
		dataQuery = dataQuery.Where("id = ANY(?)", pq.Array(gameIDs))
	}
	if status != "" {
		countQuery = countQuery.Where("status = ?", status)
		dataQuery = dataQuery.Where("status = ?", status)
	}

	countQuery.Count(&totalCount)
	dataQuery.Order(fmt.Sprintf("%s %s", sortField, sortDir)).Offset(offset).Limit(pageSize).Find(&games)

	return games, totalCount
}

func getGamesById(ids []int) []Game {
	var games []Game

	q := gamePreloads(db)
	if len(ids) > 0 {
		q = q.Where("id = ANY(?)", pq.Array(ids))
	}
	q.Find(&games)

	return games
}

var gameLock = &sync.Mutex{}

// gameCancelFuncs stores context.CancelFunc for each running game,
// keyed by game ID. Used to stop individual running games from the web UI.
var gameCancelFuncs sync.Map

func insertGame(db *gorm.DB, game *Game) {
	gameLock.Lock()
	defer gameLock.Unlock()

	db.Create(&game)
}

func setGamelogUrl(db *gorm.DB, game Game, gamelogUrl string) {
	updateEntityField[Game](db, gameLock, game.ID, func(g *Game) { g.GamelogUrl = gamelogUrl })
}

func setGameWinner(db *gorm.DB, game Game, winner Player) {
	updateEntityField[Game](db, gameLock, game.ID, func(g *Game) { g.Winner = &winner })
}

func setGameLoser(db *gorm.DB, game Game, loser Player) {
	updateEntityField[Game](db, gameLock, game.ID, func(g *Game) { g.Loser = &loser })
}

func updateGameDraw(db *gorm.DB, game Game, draw bool) {
	updateEntityField[Game](db, gameLock, game.ID, func(g *Game) { g.Draw = draw })
}

func updateGameStatus(db *gorm.DB, game Game, status string) {
	updateEntityField[Game](db, gameLock, game.ID, func(g *Game) { g.Status = status })
}

func updateGameErrorMessage(db *gorm.DB, game Game, errorMessage string) {
	updateEntityField[Game](db, gameLock, game.ID, func(g *Game) { g.ErrorMessage = errorMessage })
}

func (g Game) PlayGame(ctx context.Context, gameSession int) bool {
	// Create a per-game cancellable context (child of match context)
	gameCtx, gameCancel := context.WithCancel(ctx)
	gameCancelFuncs.Store(g.ID, gameCancel)
	defer func() {
		gameCancelFuncs.Delete(g.ID)
		gameCancel()
	}()

	updateGameStatus(db, g, "In Progress")
	g.Status = "In Progress"

	var matchID = strconv.Itoa(int(g.Match.ID))
	pwd, _ := os.Getwd()

	var matchDir = pwd + "/tmp/" + matchID

	// Create WG(2) to wait for player games to complete
	var gameplayWG sync.WaitGroup
	gameplayWG.Add(2)

	// play game for each player
	for _, player := range g.Players {

		go func(player Player) {
			playerDir := matchDir + "/" + player.Name + "/"

			g.playGame(gameCtx, player, playerDir, &gameplayWG, gameSession)

			gameplayWG.Done()
		}(player)
	}

	// Wait for games to finish before returning
	gameplayWG.Wait()

	return true
}

// StopGame cancels a running game by invoking its cancel function.
func StopGame(db *gorm.DB, gameID int) error {
	cancelVal, ok := gameCancelFuncs.Load(uint(gameID))
	if !ok {
		return fmt.Errorf("game %d is not currently running", gameID)
	}

	cancel := cancelVal.(context.CancelFunc)
	cancel()

	var game Game
	db.First(&game, gameID)
	if game.ID != 0 {
		updateGameStatus(db, game, "Canceled")
		updateGameErrorMessage(db, game, "Game was stopped by user")
	}

	log.Infof("Game %d stopped by user", gameID)
	return nil
}

// getGame fetches a single game with full preloads
func getGame(id int) Game {
	var game Game
	db.Preload("Players").
		Preload("Players.Client").
		Preload("Match").
		Preload("Match.Players").
		Preload("Match.Players.Client").
		Preload("Winner").
		Preload("Loser").
		First(&game, id)
	return game
}

// RestartGame resets a completed/errored/canceled game and re-runs it.
func RestartGame(db *gorm.DB, gameID int) error {
	game := getGame(gameID)
	if game.ID == 0 {
		return fmt.Errorf("game %d not found", gameID)
	}

	if game.Status != "Complete" && game.Status != "Error" && game.Status != "Canceled" {
		return fmt.Errorf("game %d has status '%s' and cannot be restarted", gameID, game.Status)
	}

	// Create a new session for the restarted game
	insertSession(db, &Session{})
	newSession := getCurrentSessionID(db)

	// Reset game fields
	gameLock.Lock()
	var g Game
	db.Where("id = ?", game.ID).First(&g)
	g.Status = "Pending"
	g.WinnerID = nil
	g.LoserID = nil
	g.Draw = false
	g.GamelogUrl = ""
	g.ErrorMessage = ""
	g.SessionID = newSession
	db.Save(&g)
	gameLock.Unlock()

	// Reload with preloads
	freshGame := getGame(gameID)

	// Run the game in a goroutine
	go func() {
		defer func() {
			if r := recover(); r != nil {
				log.Errorf("Panic recovered in RestartGame goroutine for game %d: %v", gameID, r)
				updateGameStatus(db, freshGame, "Error")
				updateGameErrorMessage(db, freshGame, fmt.Sprintf("Panic: %v", r))
			}
		}()
		freshGame.PlayGame(context.Background(), newSession)
	}()

	log.Infof("Game %d restarted by user with new session %d", gameID, newSession)
	return nil
}

// findOpponent finds the opponent player in a game given the current player
func (g Game) findOpponent(player Player) Player {
	for _, p := range g.Players {
		if p.ID != player.ID {
			return p
		}
	}
	// This should never happen in a two-player game, but return the first player as fallback
	if len(g.Players) > 0 {
		return g.Players[0]
	}
	return Player{}
}

func (g Game) playGame(ctx context.Context, player Player, playerDir string, wg *sync.WaitGroup, gameSession int) {
	playerLanguage := player.Client.Language
	gameType := player.Client.Game

	// Check if cancelled before building
	if ctx.Err() != nil {
		updateGameStatus(db, g, "Canceled")
		updateGameErrorMessage(db, g, "Game was stopped by user")
		return
	}

	// Build the client first
	buildErr := makeClient(playerDir, playerLanguage)
	if buildErr != nil {
		log.Warningf("Failed to build client for player %s: %v", player.Name, buildErr)

		// Use hasProcessedGameResult to ensure only one goroutine sets winner/loser
		if !hasProcessedGameResult(gameSession) {
			opponent := g.findOpponent(player)

			errorMsg := fmt.Sprintf("Build failed for player %s: %v", player.Name, buildErr)
			updateGameStatus(db, g, "Error")
			updateGameErrorMessage(db, g, errorMsg)

			// Mark this player as loser since their code failed to build
			setGameWinner(db, g, opponent)
			setGameLoser(db, g, player)
		}

		return
	}

	errorOccurred := false
	g.runGame(ctx, playerLanguage, playerDir, gameType, gameSession, &player, &errorOccurred)

	// If the player's code caused an error, mark this player as loser and opponent as winner
	if errorOccurred {
		// Use hasProcessedGameResult to ensure only one goroutine sets winner/loser
		if !hasProcessedGameResult(gameSession) {
			opponent := g.findOpponent(player)

			log.Infof("Player %s code caused error in game %d - marking as loser", player.Name, gameSession)

			setGameWinner(db, g, opponent)
			setGameLoser(db, g, player)
		}
	}
}

func (g Game) runGame(ctx context.Context, playerLanguage string, playerDir string, gameType string, gameSession int, player *Player, errorOccurred *bool) {
	m := make(map[string]string)
	m["js"] = "node"
	m["cpp"] = "./build/cpp-client"

	// check if host uses python vs python3 command, and if it's python, make sure the version is 3.x.x
	if playerLanguage == "py" {
		if checkIfCommandExistsOnHost("python3") {
			m["py"] = "python3"
		} else if checkIfCommandExistsOnHost("python") {
			m["py"] = "python"

			if checkPythonVersionOnHost(m["py"]) != 3 {
				errorMsg := "Host does not support python3. Cerveau python clients require python3."
				log.Errorf(errorMsg)
				updateGameStatus(db, g, "Error")
				updateGameErrorMessage(db, g, errorMsg)
				*errorOccurred = true
				return
			}
		}
	}

	if !checkIfCommandExistsOnHost(m[playerLanguage]) {
		errorMsg := fmt.Sprintf("`%s` does not exist on host! Game %d cannot be played until `%s` is available.", m[playerLanguage], gameSession, m[playerLanguage])
		log.Errorf(errorMsg)
		updateGameStatus(db, g, "Error")
		updateGameErrorMessage(db, g, errorMsg)
		*errorOccurred = true
		return
	}

	var gameserverURL = conf.Get("cerveauApiHost")
	var port = conf.Get("cerveauApiPort")

	var exePath string

	if playerLanguage == "cpp" {
		exePath = m[playerLanguage]
	} else {
		exePath = playerDir + "main." + playerLanguage
	}

	if _, err := os.Stat(exePath); errors.Is(err, os.ErrNotExist) {
		log.Warnf(fmt.Sprintf("`%s` doesn't exist!", exePath))
	}

	gameTimeoutContext, cancel := context.WithTimeout(ctx, 90*time.Minute)
	defer cancel()

	var runCmd *exec.Cmd

	if playerLanguage == "cpp" {
		log.Infof("Executing command: `%s %s %s %s %s %d`", exePath, gameType, "-s", gameserverURL+":"+port, "-r", gameSession)
		runCmd = exec.CommandContext(gameTimeoutContext, exePath, gameType, "-s", gameserverURL+":"+port, "-r", strconv.Itoa(gameSession))
		runCmd.Dir = playerDir
	} else {
		log.Infof("Executing command: `%s %s %s %s %s %s %d`", m[playerLanguage], exePath, gameType, "-s", gameserverURL+":"+port, "-r", gameSession)
		runCmd = exec.CommandContext(gameTimeoutContext, m[playerLanguage], exePath, gameType, "-s", gameserverURL+":"+port, "-r", strconv.Itoa(gameSession))
	}

	_, runErr := runCmd.CombinedOutput()

	if gameTimeoutContext.Err() != context.DeadlineExceeded && gameTimeoutContext.Err() != nil {
		log.Debugf("Run Game context returned error, but not timeout: %v", gameTimeoutContext.Err())
	}

	var numRetries = 0
	maxRetries := 3

	if runErr != nil {
		for numRetries < maxRetries {
			log.Warningf("Game error occurred for player %s, attempt %d of %d: %v", player.Name, numRetries+1, maxRetries, runErr)

			// Check if the cerveau session is already over before retrying.
			// Retrying against a finished session will hang indefinitely.
			cerveauStatus := getGameStatus(gameType, gameSession)
			if cerveauStatus.Status == "over" {
				log.Infof("Cerveau session %d is already 'over', skipping retry for player %s", gameSession, player.Name)
				break
			}

			// Create a new command for each retry - can't reuse runCmd because Stdout is already set
			if playerLanguage == "cpp" {
				runCmd = exec.CommandContext(gameTimeoutContext, exePath, gameType, "-s", gameserverURL+":"+port, "-r", strconv.Itoa(gameSession))
				runCmd.Dir = playerDir
			} else {
				runCmd = exec.CommandContext(gameTimeoutContext, m[playerLanguage], exePath, gameType, "-s", gameserverURL+":"+port, "-r", strconv.Itoa(gameSession))
			}

			// Retry running the game
			_, runErr = runCmd.CombinedOutput()
			numRetries++

			// If successful on retry, break out
			if runErr == nil {
				break
			}

			time.Sleep(2 * time.Second)
		}

		// If we still have an error after retries
		if runErr != nil {
			if runErr.Error() == "signal: killed" {
				updateGameStatus(db, g, "Canceled")
				g.Status = "Canceled"
				updateGameErrorMessage(db, g, "Game process was killed")
			} else if runErr.Error() == "context deadline exceeded" {
				updateGameStatus(db, g, "Canceled")
				g.Status = "Canceled"
				updateGameErrorMessage(db, g, "Game process timed out")
			} else {
				var gameErrorCode, _ = GetGameErrorCode(runErr.Error())
				errorMsg := fmt.Sprintf("Player %s game command failed after %d attempts: %v (%s)",
					player.Name, numRetries, runErr, gameErrorCode.String())
				log.Warningln(errorMsg)
				updateGameStatus(db, g, "Complete")
				updateGameErrorMessage(db, g, errorMsg)
				g.Status = "Complete"
			}
			*errorOccurred = true
			return
		}
	}

	// Game completed successfully, now wait for and verify gamelog exists.
	// Use exponential backoff: starts at 2s, caps at 30s, up to ~5 min total.
	var gamelogFilename string
	var gamelogFound bool = false
	gamelogBackoff := 2 * time.Second
	maxGamelogBackoff := 30 * time.Second
	maxGamelogWait := 5 * time.Minute
	gamelogElapsed := time.Duration(0)
	gamelogAttempt := 0

	// On retries, use a shorter timeout for getGamelogFilename since the session
	// should already be 'over' — we only need to wait for cerveau to finish writing the gamelog.
	gamelogPollTimeout := 90 * time.Minute

	for gamelogElapsed < maxGamelogWait && !gamelogFound {
		gamelogAttempt++
		log.Debugf("Waiting for gamelog for session %d (attempt %d, elapsed %v)", gameSession, gamelogAttempt, gamelogElapsed)

		if gamelogAttempt > 1 {
			gamelogPollTimeout = 30 * time.Second
		}

		func() {
			defer func() {
				if r := recover(); r != nil {
					log.Warningf("Error getting gamelog for game session %d (attempt %d): %v", gameSession, gamelogAttempt, r)
				}
			}()

			gamelogFilename = getGamelogFilenameWithTimeout(gameType, gameSession, gamelogPollTimeout)
			if gamelogFilename != "" {
				gamelogUrl := getGamelogUrl(gamelogFilename)

				if gamelogUrl != "" {
					// Lock the game result processing to prevent duplicate processing
					resultMutex := getGameResultMutex(gameSession)
					resultMutex.Lock()
					defer resultMutex.Unlock()

					if hasProcessedGameResult(gameSession) {
						gamelogFound = true
						return
					}

					setGamelogUrl(db, g, gamelogUrl)
					updateGameStatus(db, g, "Complete")
					g.Status = "Complete"
					log.Infof("Game %d complete with gamelog: %s", gameSession, gamelogUrl)

					glog := getGamelog(gamelogFilename)

					// Process winners and losers from the gamelog
					if glog != nil {
						// First check for the draw case - two losers with reason starting with "Draw" or "Stalemate"
						if len(glog.Losers) == 2 && (isDrawReason(glog.Losers[0].Reason) || isDrawReason(glog.Losers[1].Reason)) {
							log.Infof("Game %d resulted in a draw (both players in losers with Draw/Stalemate reason)", gameSession)
							updateGameDraw(db, g, true)

							// Set an error message with the draw reason for UI display
							updateGameErrorMessage(db, g, glog.Losers[0].Reason)

							// Handle ELO changes for draw
							handleEloChanges(g.Players[0], g.Players[1], nil, true)
							// Regular win/loss case
						} else if len(glog.Winners) > 0 && len(glog.Losers) > 0 {
							winnerName := glog.Winners[0].Name
							loserName := glog.Losers[0].Name

							var winner, loser Player

							// Find the matching players from our game
							for _, p := range g.Players {
								if p.Name == winnerName {
									winner = p
								} else if p.Name == loserName {
									loser = p
								}
							}

							if winner.ID > 0 {
								log.Infof("Setting winner for game %d: %s", gameSession, winner.Name)
								setGameWinner(db, g, winner)
							}

							if loser.ID > 0 {
								log.Infof("Setting loser for game %d: %s", gameSession, loser.Name)
								setGameLoser(db, g, loser)
							}

							handleEloChanges(winner, loser, &winner, false)
							// No winners or losers means it's a draw (fallback case)
						} else if len(glog.Winners) == 0 && len(glog.Losers) == 0 {
							log.Infof("Game %d resulted in a draw (no winners or losers)", gameSession)
							updateGameDraw(db, g, true)
							handleEloChanges(g.Players[0], g.Players[1], nil, true)
						}
					}

					// Automatically check and update match status when a game completes
					// This ensures matches are marked complete as soon as all their games are done
					go func() {
						// Add a small delay to ensure all game updates are persisted
						time.Sleep(1 * time.Second)
						CheckAndUpdateMatchStatus(db, g.MatchID)
					}()

					gamelogFound = true
				}
			}
		}()

		if gamelogFound {
			break
		}

		time.Sleep(gamelogBackoff)
		gamelogElapsed += gamelogBackoff
		if gamelogBackoff < maxGamelogBackoff {
			gamelogBackoff *= 2
			if gamelogBackoff > maxGamelogBackoff {
				gamelogBackoff = maxGamelogBackoff
			}
		}
	}

	if gamelogFound {
		*errorOccurred = false
		return
	}

	// If we get here, we couldn't get a gamelog, but we don't know which player is at fault
	// This is likely a system issue, not a player's code issue
	errorMsg := fmt.Sprintf("Failed to retrieve gamelog for session %d after %d attempts (%v elapsed)", gameSession, gamelogAttempt, gamelogElapsed)
	log.Warningf(errorMsg)
	updateGameStatus(db, g, "Incomplete")
	updateGameErrorMessage(db, g, errorMsg)
	g.Status = "Incomplete"

	*errorOccurred = false // Don't penalize any player for system issues
}

func handleEloChanges(player1 Player, player2 Player, winner *Player, draw bool) {
	// Hold the playerLock for the entire read-calculate-write sequence to
	// prevent concurrent games from reading the same stale Elo and
	// overwriting each other's results.
	playerLock.Lock()
	defer playerLock.Unlock()

	// Fetch fresh Elo values from the database so calculations aren't based
	// on stale values from when the game/match was first loaded.
	var freshP1, freshP2 Player
	db.First(&freshP1, player1.ID)
	db.First(&freshP2, player2.ID)

	player1.Elo = freshP1.Elo
	player2.Elo = freshP2.Elo

	outcomeA, outcomeB := calculateEloOutcomes(player1, player2, winner, draw)

	// Use the lock-free variant since we already hold playerLock.
	updatePlayerEloLocked(db, player1, outcomeA.Rating)
	updatePlayerEloLocked(db, player2, outcomeB.Rating)
}

func makeClient(playerDir string, playerLanguage string) error {
	var makeCmd *exec.Cmd
	var makeErr error

	// run make to grab client deps, build, etc.
	if playerLanguage == "cpp" {
		// Acquire a mutex lock for this player directory
		// This ensures that only one goroutine can build a C++ client in this directory at a time
		mutex := getClientBuildMutex(playerDir)
		mutex.Lock()
		defer mutex.Unlock()

		// Check for executable before running make
		exePath := filepath.Join(playerDir, "build", "cpp-client")
		if _, err := os.Stat(exePath); err == nil {
			// Executable already exists - this is likely from a previous build in another goroutine
			// Skip rebuilding to prevent concurrent builds
			return nil
		}

		// Check if the directory exists before running commands
		if _, err := os.Stat(playerDir); os.IsNotExist(err) {
			return fmt.Errorf("player directory %s does not exist", playerDir)
		}

		// Run make clean
		makeCmd = exec.Command("make", "clean")
		makeCmd.Dir = playerDir
		output, err := makeCmd.CombinedOutput()
		if err != nil {
			log.Warningf("Make clean failed: %v\nOutput: %s", err, string(output))
			// Continue even if clean fails
		}

		// Run make to build
		makeCmd = exec.Command("make")
		makeCmd.Dir = playerDir
		output, makeErr = makeCmd.CombinedOutput()
		if makeErr != nil {
			log.Warningf("Make build failed: %v\nOutput: %s", makeErr, string(output))
			return makeErr
		}

		// Verify the executable exists
		if _, err := os.Stat(exePath); os.IsNotExist(err) {
			log.Warningf("C++ client executable not found at %s after build", exePath)
			return fmt.Errorf("c++ client build completed but executable not found at %s", exePath)
		}
	} else {
		// For non-C++ clients
		makeCmd = exec.Command("make")
		makeCmd.Dir = playerDir

		output, makeErr := makeCmd.CombinedOutput()
		if makeErr != nil {
			log.Warningf("Make failed for %s client: %v\nOutput: %s", playerLanguage, makeErr, string(output))
			return makeErr
		}
	}

	return nil
}

func getGamelog(gamelogFilename string) *Gamelog {
	glogURL := getGamelogUrl(gamelogFilename)

	glog := new(Gamelog)

	getJSON(glogURL, glog)

	return glog
}

func getGameStatus(gameType string, gameSession int) *GameStatus {
	var cerveauHost = conf.Get("cerveauWebHost")
	var cerveauPort = conf.Get("cerveauWebPort")
	var cerveauURLScheme = conf.Get("cerveauURLScheme")
	var cerveauURL = cerveauURLScheme + "://" + cerveauHost + ":" + cerveauPort
	url := cerveauURL + "/status/" + gameType + "/" + strconv.Itoa(gameSession)

	gameStatus := new(GameStatus)

	getJSON(url, gameStatus)

	return gameStatus
}

func getGamelogFilename(gameType string, gameSession int) string {
	return getGamelogFilenameWithTimeout(gameType, gameSession, 90*time.Minute)
}

func getGamelogFilenameWithTimeout(gameType string, gameSession int, maxWait time.Duration) string {
	var cerveauHost = conf.Get("cerveauWebHost")
	var cerveauPort = conf.Get("cerveauWebPort")
	var cerveauURLScheme = conf.Get("cerveauURLScheme")
	var cerveauURL = cerveauURLScheme + "://" + cerveauHost + ":" + cerveauPort
	url := cerveauURL + "/status/" + gameType + "/" + strconv.Itoa(gameSession)

	// Use exponential backoff to wait for the game to finish.
	backoff := 1 * time.Second
	maxBackoff := 30 * time.Second
	elapsed := time.Duration(0)
	status := "running"
	pollAttempt := 0

	for status != "over" {
		gameStatus := getGameStatus(gameType, gameSession)
		status = gameStatus.Status
		if status == "over" {
			break
		}
		pollAttempt++
		if pollAttempt%10 == 0 {
			log.Debugf("Still waiting for session %d to be 'over' (status=%q, attempt %d, elapsed %v)", gameSession, status, pollAttempt, elapsed)
		}
		if status == "" {
			log.Warningf("Game session %d returned empty status from cerveau (attempt %d, elapsed %v)", gameSession, pollAttempt, elapsed)
		}
		if elapsed >= maxWait {
			log.Warningf("Game session %d status never reached 'over' after %v (last status=%q)", gameSession, elapsed, status)
			return ""
		}
		time.Sleep(backoff)
		elapsed += backoff
		if backoff < maxBackoff {
			backoff *= 2
			if backoff > maxBackoff {
				backoff = maxBackoff
			}
		}
	}

	gameStatus := new(GameStatus)

	getJSON(url, gameStatus)

	if gameStatus.GamelogFilename != "" {
		return gameStatus.GamelogFilename
	}

	log.Warningf("Game session %d status is 'over' but gamelog filename is empty", gameSession)
	return ""
}

func getGamelogUrl(gamelogFilename string) string {
	var cerveauHost = conf.Get("cerveauWebHost")
	var cerveauPort = conf.Get("cerveauWebPort")
	var cerveauURLScheme = conf.Get("cerveauURLScheme")
	var cerveauURL = cerveauURLScheme + "://" + cerveauHost + ":" + cerveauPort
	glogURL := cerveauURL + "/gamelog/" + gamelogFilename

	return glogURL
}

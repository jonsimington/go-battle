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

func getGamesWithPlayers(players []int) []Game {
	var games []Game

	if len(players) > 0 {
		var gamesWithPlayers []int

		db.Table("game_players").Where("player_id = ANY(?)", pq.Array(players)).Select("game_id").Find(&gamesWithPlayers)

		db.Preload("Players", func(db *gorm.DB) *gorm.DB {
			return db.Select("id, name, elo")
		}).
			Preload("Winner", func(db *gorm.DB) *gorm.DB {
				return db.Select("id, name, elo")
			}).
			Preload("Loser", func(db *gorm.DB) *gorm.DB {
				return db.Select("id, name, elo")
			}).
			Where("id = ANY(?)", pq.Array(gamesWithPlayers)).
			Find(&games)
	} else {
		db.Preload("Players", func(db *gorm.DB) *gorm.DB {
			return db.Select("id, name, elo")
		}).
			Preload("Winner", func(db *gorm.DB) *gorm.DB {
				return db.Select("id, name, elo")
			}).
			Preload("Loser", func(db *gorm.DB) *gorm.DB {
				return db.Select("id, name, elo")
			}).
			Find(&games)
	}

	return games
}

func getGamesById(ids []int) []Game {
	var games []Game

	if len(ids) > 0 {
		db.Preload("Players", func(db *gorm.DB) *gorm.DB {
			return db.Select("id, name, elo")
		}).
			Preload("Winner", func(db *gorm.DB) *gorm.DB {
				return db.Select("id, name, elo")
			}).
			Preload("Loser", func(db *gorm.DB) *gorm.DB {
				return db.Select("id, name, elo")
			}).
			Where("id = ANY(?)", pq.Array(ids)).
			Find(&games)
	} else {
		db.Preload("Players", func(db *gorm.DB) *gorm.DB {
			return db.Select("id, name, elo")
		}).
			Preload("Winner", func(db *gorm.DB) *gorm.DB {
				return db.Select("id, name, elo")
			}).
			Preload("Loser", func(db *gorm.DB) *gorm.DB {
				return db.Select("id, name, elo")
			}).
			Find(&games)
	}

	return games
}

var gameLock = &sync.Mutex{}

func insertGame(db *gorm.DB, game *Game) {
	gameLock.Lock()
	defer gameLock.Unlock()

	db.Create(&game)
}

func setGamelogUrl(db *gorm.DB, game Game, gamelogUrl string) {
	gameLock.Lock()
	defer gameLock.Unlock()

	var g Game

	db.Where("id = ?", game.ID).First(&g)

	g.GamelogUrl = gamelogUrl

	db.Save(&g)
}

func setGameWinner(db *gorm.DB, game Game, winner Player) {
	gameLock.Lock()
	defer gameLock.Unlock()

	var g Game

	db.Where("id = ?", game.ID).First(&g)

	g.Winner = &winner

	db.Save(&g)
}

func setGameLoser(db *gorm.DB, game Game, loser Player) {
	gameLock.Lock()
	defer gameLock.Unlock()

	var g Game

	db.Where("id = ?", game.ID).First(&g)

	g.Loser = &loser

	db.Save(&g)
}

func updateGameDraw(db *gorm.DB, game Game, draw bool) {
	gameLock.Lock()
	defer gameLock.Unlock()

	var g Game

	db.Where("id = ?", game.ID).First(&g)

	g.Draw = draw

	db.Save(&g)
}

func updateGameStatus(db *gorm.DB, game Game, status string) {
	var g Game

	gameLock.Lock()
	defer gameLock.Unlock()

	db.Where("id = ?", game.ID).First(&g)

	g.Status = status

	db.Save(&g)
}

func updateGameErrorMessage(db *gorm.DB, game Game, errorMessage string) {
	var g Game

	gameLock.Lock()
	defer gameLock.Unlock()

	db.Where("id = ?", game.ID).First(&g)

	g.ErrorMessage = errorMessage

	db.Save(&g)
}

func (g Game) PlayGame(gameSession int) bool {
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

			g.playGame(player, playerDir, &gameplayWG, gameSession)

			gameplayWG.Done()
		}(player)
	}

	// Wait for games to finish before returning
	gameplayWG.Wait()

	return true
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

func (g Game) playGame(player Player, playerDir string, wg *sync.WaitGroup, gameSession int) {
	playerLanguage := player.Client.Language
	gameType := player.Client.Game

	// Build the client first
	buildErr := makeClient(playerDir, playerLanguage)
	if buildErr != nil {
		log.Warningf("Failed to build client for player %s: %v", player.Name, buildErr)

		opponent := g.findOpponent(player)

		errorMsg := fmt.Sprintf("Build failed for player %s: %v", player.Name, buildErr)
		updateGameStatus(db, g, "Error")
		updateGameErrorMessage(db, g, errorMsg)

		// Mark this player as loser since their code failed to build
		setGameWinner(db, g, opponent)
		setGameLoser(db, g, player)

		return
	}

	errorOccurred := false
	g.runGame(playerLanguage, playerDir, gameType, gameSession, &player, &errorOccurred)

	// If the player's code caused an error, mark this player as loser and opponent as winner
	if errorOccurred {
		opponent := g.findOpponent(player)

		log.Infof("Player %s code caused error in game %d - marking as loser", player.Name, gameSession)

		setGameWinner(db, g, opponent)
		setGameLoser(db, g, player)
	}
}

func (g Game) runGame(playerLanguage string, playerDir string, gameType string, gameSession int, player *Player, errorOccurred *bool) {
	m := make(map[string]string)
	m["js"] = "node"
	m["cpp"] = "./build/cpp-client"

	// check if host uses python vs python3 command, and if it's python, make sure the version is 3.x.x
	if playerLanguage == "py" {
		if checkIfCommandExistsOnHost("python3") {
			m["py"] = "python3"
		} else if checkIfCommandExistsOnHost("python") {
			m["py"] = "python"

			// panic if host's python isn't python v3.x.x
			if checkPythonVersionOnHost(m["py"]) != 3 {
				panic("Host does not support python3.  Cerveau python clients require python3.")
			}
		}
	}

	if !checkIfCommandExistsOnHost(m[playerLanguage]) {
		panic(fmt.Sprintf("`%s` does not exist on host!  Game %d cannot be played until `%s` is available.", m[playerLanguage], gameSession, m[playerLanguage]))
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

	gameTimeoutContext, cancel := context.WithTimeout(context.Background(), 90*time.Minute)
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

	for gamelogElapsed < maxGamelogWait && !gamelogFound {
		gamelogAttempt++
		log.Debugf("Waiting for gamelog for session %d (attempt %d, elapsed %v)", gameSession, gamelogAttempt, gamelogElapsed)

		func() {
			defer func() {
				if r := recover(); r != nil {
					log.Warningf("Error getting gamelog for game session %d (attempt %d): %v", gameSession, gamelogAttempt, r)
				}
			}()

			gamelogFilename = getGamelogFilename(gameType, gameSession)
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
	outcomeA, outcomeB := calculateEloOutcomes(player1, player2, winner, draw)

	updatePlayerElo(db, player1, outcomeA.Rating)
	updatePlayerElo(db, player2, outcomeB.Rating)
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
	var cerveauHost = conf.Get("cerveauWebHost")
	var cerveauPort = conf.Get("cerveauWebPort")
	var cerveauURLScheme = conf.Get("cerveauURLScheme")
	var cerveauURL = cerveauURLScheme + "://" + cerveauHost + ":" + cerveauPort
	url := cerveauURL + "/status/" + gameType + "/" + strconv.Itoa(gameSession)

	// Use exponential backoff to wait for the game to finish.
	// Complex games can run for a very long time; the max total wait
	// (~90 min) matches the game execution timeout.
	maxWait := 90 * time.Minute
	backoff := 1 * time.Second
	maxBackoff := 30 * time.Second
	elapsed := time.Duration(0)
	status := "running"

	for status != "over" {
		status = getGameStatus(gameType, gameSession).Status
		if status == "over" {
			break
		}
		if elapsed >= maxWait {
			log.Warningf("Game session %d status never reached 'over' after %v", gameSession, elapsed)
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

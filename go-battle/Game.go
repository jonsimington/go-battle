package main

import (
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"sync"
	"time"

	"github.com/lib/pq"
	"gorm.io/gorm"
)

// Game represents a game between two Players in a Tournament
type Game struct {
	gorm.Model

	Players    []Player `json:"players" gorm:"many2many:game_players"`
	Winner     *Player  `json:"winner" gorm:"foreignKey:WinnerID"`
	WinnerID   *int     `json:"winner_id" gorm:"default:null"`
	Loser      *Player  `json:"loser" gorm:"foreignKey:LoserID"`
	LoserID    *int     `json:"loser_id" gorm:"default:null"`
	MatchID    int      `json:"match_id"`
	Match      Match    `json:"match" gorm:"foreignKey:MatchID"`
	SessionID  int      `json:"session_id"`
	GamelogUrl string   `json:"gamelog_url"`
	Draw       bool     `json:"draw"`
}

var _httpClient = &http.Client{
	Timeout: time.Second * 10,
}

func getGamesWithPlayers(players []int) []Game {
	var games []Game

	if len(players) > 0 {
		gamesWithPlayers := db.Table("game_players").Where("player_id = ANY(?)", pq.Array(players)).Select("game_id")

		db.Preload("Match").
			Preload("Match.Players").
			Preload("Match.Players.Client").
			Preload("Players").
			Preload("Players.Client").
			Where("id = ANY(?)", pq.Array(gamesWithPlayers)).
			Find(&games)
	} else {
		db.Preload("Match").
			Preload("Match.Players").
			Preload("Match.Players.Client").
			Preload("Players").
			Preload("Players.Client").
			Find(&games)
	}

	return games
}

func getGamesById(ids []int) []Game {
	var games []Game

	if len(ids) > 0 {
		db.Preload("Match").
			Preload("Match.Players").
			Preload("Match.Players.Client").
			Preload("Players").
			Preload("Players.Client").
			Preload("Winner").
			Preload("Loser").
			Where("id = ANY(?)", pq.Array(ids)).
			Find(&games)
	} else {
		db.Preload("Match").
			Preload("Match.Players").
			Preload("Match.Players.Client").
			Preload("Players").
			Preload("Players.Client").
			Preload("Winner").
			Preload("Loser").
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

func setWinner(db *gorm.DB, game Game, winnerName string) {
	gameLock.Lock()
	defer gameLock.Unlock()

	var g Game

	db.Where("id = ?", game.ID).First(&g)

	var p Player

	db.Where("name = ?", winnerName).First(&p)

	g.Winner = &p

	db.Save(&g)
}

func setLoser(db *gorm.DB, game Game, loserName string) {
	gameLock.Lock()
	defer gameLock.Unlock()

	var g Game

	db.Where("id = ?", game.ID).First(&g)

	var p Player

	db.Where("name = ?", loserName).First(&p)

	g.Loser = &p

	db.Save(&g)
}

func updateGameDraw(db *gorm.DB, game Game, draw bool) {
	var g Game

	db.Where("id = ?", game.ID).First(&g)

	g.Draw = draw

	db.Save(&g)
}

func (g Game) PlayGame(gameSession int) bool {
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

			playGame(player, playerDir, &gameplayWG, gameSession)

			gameplayWG.Done()
			return
		}(player)
	}

	// Wait for games to finish before returning
	gameplayWG.Wait()

	return true
}

func playGame(player Player, playerDir string, wg *sync.WaitGroup, gameSession int) {

	makeClient(playerDir)

	playerLanguage := player.Client.Language
	gameType := player.Client.Game

	runGame(playerLanguage, playerDir, gameType, gameSession)

	return
}

func runGame(playerLanguage string, playerDir string, gameType string, gameSession int) {
	m := make(map[string]string)
	m["js"] = "node"

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
	} else if playerLanguage == "js" {
		npmInstallCommand := exec.Command("npm", "install", "--prefix", playerDir)

		// npmInstallCommand.Stdout = os.Stdout
		// npmInstallCommand.Stderr = os.Stderr

		npmInstallCommand.Start()
		npmInstallCommand.Wait()
	}

	var gameserverURL = conf.Get("cerveauApiHost")
	var port = conf.Get("cerveauApiPort")
	var exePath = playerDir + "main." + playerLanguage

	log.Debugln(fmt.Sprintf("Executing command: `%s %s %s %s %s %s %d`", m[playerLanguage], exePath, gameType, "-s", gameserverURL+":"+port, "-r", gameSession))

	if _, err := os.Stat(exePath); errors.Is(err, os.ErrNotExist) {
		log.Warnf(fmt.Sprintf("`%s` doesn't exist!", exePath))
	}

	// run game
	runCmd := exec.Command(m[playerLanguage], exePath, gameType, "-s", gameserverURL+":"+port, "-r", strconv.Itoa(gameSession))

	// runCmd.Stdout = os.Stdout
	// runCmd.Stderr = os.Stderr

	runErr := runCmd.Run()

	if runErr != nil {
		log.Warningln(fmt.Sprintf("Play game command returned error: `%s`, trying again", runErr))
		runGame(playerLanguage, playerDir, gameType, gameSession)
	}

	return
}

func makeClient(playerDir string) {
	// run make to grab client deps, build, etc.
	makeCmd := exec.Command("make")
	makeCmd.Dir = playerDir

	// wait for make to finish
	makeCmd.Start()
	makeCmd.Wait()

	return
}

func getGamelog(gamelogFilename string) *Gamelog {
	glogURL := getGamelogUrl(gamelogFilename)

	glog := new(Gamelog)

	getJSON(glogURL, glog)

	return glog
}

func getGameStatus(gameType string, gameSession int) *GameStatus {
	var cerveauURL = conf.Get("cerveauWebHost")
	url := "https://" + cerveauURL + "/status/" + gameType + "/" + strconv.Itoa(gameSession)

	gameStatus := new(GameStatus)

	getJSON(url, gameStatus)

	return gameStatus
}

func getGamelogFilename(gameType string, gameSession int) string {
	var cerveauURL = conf.Get("cerveauWebHost")
	url := "https://" + cerveauURL + "/status/" + gameType + "/" + strconv.Itoa(gameSession)

	status := "running"

	for status != "over" {
		status = getGameStatus(gameType, gameSession).Status
	}

	gameStatus := new(GameStatus)

	getJSON(url, gameStatus)

	if gameStatus.GamelogFilename != "" {
		return gameStatus.GamelogFilename
	}

	return getGamelogFilename(gameType, gameSession)
}

func getGamelogUrl(gamelogFilename string) string {
	var cerveauURL = conf.Get("cerveauWebHost")
	glogURL := "https://" + cerveauURL + "/gamelog/" + gamelogFilename

	return glogURL
}

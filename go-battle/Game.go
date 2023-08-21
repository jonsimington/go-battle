package main

import (
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

	Players []Player `json:"players" gorm:"many2many:game_players"`
	Winner  int      `json:"winner"`
	Loser   int      `json:"loser"`
	Match   int      `json:"match"`
}

var _httpClient = &http.Client{
	Timeout: time.Second * 10,
}

func getGames(players []int) []Game {
	var games []Game

	if len(players) > 0 {
		gamesWithPlayers := db.Table("game_players").Where("player_id = ANY(?)", pq.Array(players)).Select("game_id")

		db.Where("id = ANY(?)", pq.Array(gamesWithPlayers)).Find(&games)
	} else {
		db.Find(&games)
	}

	return games
}

var gameLock = &sync.Mutex{}

func insertGame(db *gorm.DB, game *Game) {
	gameLock.Lock()
	defer gameLock.Unlock()

	db.Create(&game)
}

func (g Game) PlayGame(gameSession string) bool {
	var matchID = strconv.Itoa(g.Match)
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

func playGame(player Player, playerDir string, wg *sync.WaitGroup, gameSession string) {

	makeClient(playerDir)

	playerLanguage := player.Client.Language
	gameType := player.Client.Game

	runGame(playerLanguage, playerDir, gameType, gameSession)

	return
}

func runGame(playerLanguage string, playerDir string, gameType string, gameSession string) {
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
	}

	var gameserverURL = conf.Get("gameserver")
	var port = conf.Get("gameserverPlayPort")

	// run game
	runCmd := exec.Command(m[playerLanguage], playerDir+"main."+playerLanguage, gameType, "-s", gameserverURL+":"+port, "-r", gameSession)

	// wait for game to finish
	runCmd.Start()
	runCmd.Wait()

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
	var cerveauURL = conf.Get("gameserver")
	var port = conf.Get("gameserverStatusPort")

	glogURL := "http://" + cerveauURL + ":" + port + "/gamelog/" + gamelogFilename

	glog := new(Gamelog)

	getJSON(glogURL, glog)

	return glog
}

func getGameStatus(gameType string, gameSession string) *GameStatus {
	var cerveauURL = conf.Get("gameserver")
	var port = conf.Get("gameserverStatusPort")
	url := "http://" + cerveauURL + ":" + port + "/status/" + gameType + "/" + gameSession

	gameStatus := new(GameStatus)

	getJSON(url, gameStatus)

	return gameStatus
}

func getGamelogFilename(gameType string, gameSession string) string {
	var cerveauURL = conf.Get("gameserver")
	var port = conf.Get("gameserverStatusPort")
	url := "http://" + cerveauURL + ":" + port + "/status/" + gameType + "/" + gameSession

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

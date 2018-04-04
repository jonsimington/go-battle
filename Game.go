package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"sync"
	"time"
)

// Game represents a game between two Players in a Tournament
type Game struct {
	players []Player
	winner  int
	loser   int
	match   int
}

var _httpClient = &http.Client{
	Timeout: time.Second * 10,
}

func (g Game) PlayGame(gameSession string) bool {
	var matchID = strconv.Itoa(g.match)
	pwd, _ := os.Getwd()

	var matchDir = pwd + "/tmp/" + matchID

	// Create WG(2) to wait for player games to complete
	var gameplayWG sync.WaitGroup
	gameplayWG.Add(2)

	// play game for each player
	for _, player := range g.players {

		go func(player Player) {
			playerDir := matchDir + "/" + player.name + "/"

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

	playerLanguage := player.client.language
	gameType := player.client.game

	runGame(playerLanguage, playerDir, gameType, gameSession)

	return
}

func runGame(playerLanguage string, playerDir string, gameType string, gameSession string) {
	m := make(map[string]string)
	m["py"] = "python3"
	m["js"] = "node"

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

func getGamelog(gameserverURL string, gameType string, gameSession string) {
	var glogURL = "http://localhost:3080/gamelog/2018.03.22.20.47.33.754-" + gameType + "-" + gameSession

	client := http.Client{
		Timeout: time.Second * 2, // Maximum of 2 secs
	}

	req, err := http.NewRequest(http.MethodGet, glogURL, nil)
	if err != nil {
		log.Fatal(err)
	}

	req.Header.Set("User-Agent", "spacecount-tutorial")

	res, getErr := client.Do(req)
	if getErr != nil {
		log.Fatal(getErr)
	}

	body, readErr := ioutil.ReadAll(res.Body)
	if readErr != nil {
		log.Fatal(readErr)
	}

	var gamelog Gamelog
	json.Unmarshal([]byte(body), &gamelog)
	//fmt.Printf("Species: %s, Description: %s", gamelog.winners)
}

func getJson(url string, target interface{}) error {
	r, err := _httpClient.Get(url)
	if err != nil {
		return err
	}
	defer r.Body.Close()

	var _json = json.NewDecoder(r.Body).Decode(target)
	if _json != nil {
		fmt.Println(_json)
	}

	return _json
}

func getGameStatus(gameType string, gameSession string) string {
	var cerveauURL = conf.Get("gameserver")
	var port = conf.Get("gameserverStatusPort")
	url := "http://" + cerveauURL + ":" + port + "/status/" + gameType + "/" + gameSession

	gameStatus := new(GameStatus)

	getJson(url, gameStatus)

	return gameStatus.Status
}

func getGamelogFilename(gameType string, gameSession string) string {
	var cerveauURL = conf.Get("gameserver")
	var port = conf.Get("gameserverStatusPort")
	url := "http://" + cerveauURL + ":" + port + "/status/" + gameType + "/" + gameSession

	status := "running"

	for status != "over" {
		status = getGameStatus(gameType, gameSession)
	}

	gameStatus := new(GameStatus)

	getJson(url, gameStatus)

	return gameStatus.GamelogFilename
}

type GameStatus struct {
	GameName        string       `json:"gameName"`
	GameSession     string       `json:"gameSession"`
	NumberOfPlayers int          `json:"numberOfPlayers"`
	Clients         []GameClient `json:"clients"`
	Status          string       `json:"status"`
	GamelogFilename string       `json:"gamelogFilename"`
}

type GameClient struct {
	Name         string `json:"name"`
	Index        int    `json:"index"`
	Spectating   bool   `json:"spectating"`
	Won          bool   `json:"won"`
	Lost         bool   `json:"lost"`
	Reason       string `json:"reason"`
	Disconnected bool   `json:"disconnected"`
	TimedOut     bool   `json:"timedOut"`
}

// Gamelog represents a mmai Gamelog
type Gamelog struct {
	GameName    string            `json:"gameName"`
	GameSession string            `json:"gameSession"`
	Deltas      []GamelogDelta    `json:"deltas"`
	Constants   map[string]string `json:"constants"`
	Epoch       int               `json:"epoch"`
	RandomSeed  string            `json:"randomSeed"`
	Winners     []GameResult      `json:"winners"`
	Losers      []GameResult      `json:"losers"`
}

// GameResult represents the result of an mmai game
type GameResult struct {
	Index        int    `json:"index"`
	ID           string `json:"id"`
	Name         string `json:"name"`
	Reason       string `json:"reason"`
	Disconnected bool   `json:"disconnected"`
	TimedOut     bool   `json:"timedOut"`
}

// GamelogDelta represents the delta of an mmai Gamelog
type GamelogDelta struct {
	DeltaType string `json:"type"`
	Game      string `json:"game"`
}

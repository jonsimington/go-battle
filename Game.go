package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
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

func checkIfCommandExistsOnHost(commandName string) bool {
	cmd := exec.Command(commandName)

	err := cmd.Run()

	return err == nil
}

func checkPythonVersionOnHost(pythonCommandName string) int {
	cmd := exec.Command(pythonCommandName, "--version")

	// capture output of command
	var outb, errb bytes.Buffer
	cmd.Stdout = &outb
	cmd.Stderr = &errb

	err := cmd.Run()
	checkErr(err)

	// trim newline from stderr output
	cmdOutput := strings.TrimRightFunc(errb.String(), func(c rune) bool {
		return c == '\r' || c == '\n'
	})

	// Python version format is: `Python x.y.z` so capture those version numbers via regex
	re := regexp.MustCompile("^Python (.*?)\\.(.*?)\\.(.*?)")

	match := re.FindStringSubmatch(cmdOutput)

	hostPythonVersionStr := match[1]

	// try to convert parsed version into an int
	hostPythonVersion, err := strconv.Atoi(hostPythonVersionStr)
	checkErr(err)

	return hostPythonVersion
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

			if checkPythonVersionOnHost(m["py"]) != 3 {
				panic("Host does not support python3.  Cerveau python clients require python3.")
			} else {
				fmt.Println("Host supports python3 : ^ )")
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

func getJSON(url string, target interface{}) error {
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

	getJSON(url, gameStatus)

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

	getJSON(url, gameStatus)

	if gameStatus.GamelogFilename != "" {
		return gameStatus.GamelogFilename
	}

	return getGamelogFilename(gameType, gameSession)

}

// GameStatus represents the status of a played game
type GameStatus struct {
	GameName        string       `json:"gameName"`
	GameSession     string       `json:"gameSession"`
	NumberOfPlayers int          `json:"requiredNumberOfPlayers"`
	Clients         []GameClient `json:"clients"`
	Status          string       `json:"status"`
	GamelogFilename string       `json:"gamelogFilename"`
}

// GameClient represents a client in a game
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
	Game      string `json:"gamez"`
}

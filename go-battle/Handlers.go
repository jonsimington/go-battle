package main

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
)

///////////////////////////////////////////////////////////////////////////
// CLIENTS
///////////////////////////////////////////////////////////////////////////
func postClientsHandler(c *fiber.Ctx) error {
	clientRepoUrl := c.Query("repo_url")
	clientLanguage := c.Query("language")
	clientGame := c.Query("game")

	if clientRepoUrl == "" {
		return c.Status(400).SendString("Must supply `repo_url` query parameter which is a url to a git repo containing code for the client.")
	}
	if clientLanguage == "" {
		return c.Status(400).SendString("Must supply `language` query parameter which is the programming language the client is written in.")
	}
	if clientGame == "" {
		return c.Status(400).SendString("Must supply `game` query parameter which is the game this client is programmed to play.")
	}

	client := Client{
		Repo:     clientRepoUrl,
		Language: clientLanguage,
		Game:     clientGame,
	}

	if !clientExists(db, clientRepoUrl) {
		insertClient(db, &client)
	} else {
		return c.Status(400).SendString(fmt.Sprintf("Client with Repo URL `%s` already exists.", clientRepoUrl))
	}

	return c.Status(200).SendString(fmt.Sprintf("Created client for repo %s", clientRepoUrl))
}

func getClientsHandler(c *fiber.Ctx) error {
	clients := getClients([]int{})

	jsonClients, err := json.Marshal(clients)

	if err != nil {
		log.Errorln(fmt.Sprintf("Error marshalling list of clients: %s", err))
	}

	return c.Status(200).SendString(string(jsonClients))
}

///////////////////////////////////////////////////////////////////////////
// PLAYERS
///////////////////////////////////////////////////////////////////////////
func postPlayersHandler(c *fiber.Ctx) error {
	name := c.Query("name")
	clientId := c.Query("client_id")

	if name == "" {
		return c.Status(400).SendString("Must supply `name` query parameter which is the name of the Player.")
	}
	if clientId == "" {
		return c.Status(400).SendString("Must supply `client_id` query parameter which is id of the Player's Client.")
	}

	if playerExists(db, name) {
		return c.Status(400).SendString(fmt.Sprintf("A player by the name of `%s` already exists!", name))
	}

	clientIdInt, clientIdIntErr := strconv.Atoi(clientId)

	if clientIdIntErr != nil {
		return c.Status(400).SendString(fmt.Sprintf("`client_id` query parameter must be an integer"))
	}

	foundClients := getClients([]int{clientIdInt})

	if len(foundClients) == 0 {
		return c.Status(400).SendString(fmt.Sprintf("`client_id` %d does not exist!", clientIdInt))
	}

	client := foundClients[0]

	player := Player{
		Name:   name,
		Client: client,
	}

	insertPlayer(db, &player)

	return c.SendString(fmt.Sprintf("Created player `%s` with client `%s`", name, client.Repo))
}

func getPlayersHandler(c *fiber.Ctx) error {
	ids := c.Query("ids")

	playersList, _ := sliceAtoi(map2(strings.Split(ids, ","), func(s string) string {
		return strings.ReplaceAll(s, " ", "")
	}))

	players := getPlayers(playersList)

	jsonPlayers, err := json.Marshal(players)

	if err != nil {
		log.Errorln(fmt.Sprintf("Error marshalling list of players: %s", err))
	}

	return c.Status(200).SendString(string(jsonPlayers))
}

///////////////////////////////////////////////////////////////////////////
// GAMES
///////////////////////////////////////////////////////////////////////////
func postGamesHandler(c *fiber.Ctx) error {
	// gameId := c.Query("game_id")
	numGames := c.Query("num_games")
	numGamesInt, numGamesIntErr := strconv.Atoi(numGames)
	playersQuery := c.Query("players")

	if numGamesIntErr != nil {
		return c.Status(400).SendString(fmt.Sprintf("`num_games` query parameter must be an integer"))
	}
	if numGames == "" {
		return c.Status(400).SendString("The `players` query param value must be a comma-separated list of two ints")
	}

	playersList, _ := sliceAtoi(map2(strings.Split(playersQuery, ","), func(s string) string {
		return strings.ReplaceAll(s, " ", "")
	}))

	if len(playersList) != 2 {
		return c.Status(400).SendString("The `players` query param value must be a comma-separated list of two ints")
	}

	players := getPlayers(playersList)

	match := Match{
		Id:       getCurrentMatchID(db),
		NumGames: numGamesInt,
		Players:  players,
	}

	insertMatch(db, &match)

	game := Game{
		Match:   match.Id,
		Players: players,
		Winner:  int(players[0].ID),
		Loser:   int(players[1].ID),
	}

	insertGame(db, &game)

	// sessionID := getCurrentSessionID(db)

	// create match

	// then call func (m Match) StartMatch(db *gorm.DB)

	return c.SendString(fmt.Sprintf("Created game with id %s!", 1))
}

func getGamesHandler(c *fiber.Ctx) error {
	players := c.Query("players")

	playersList, err := sliceAtoi(map2(strings.Split(players, ","), func(s string) string {
		return strings.ReplaceAll(s, " ", "")
	}))

	games := getGames(playersList)

	jsonGames, err := json.Marshal(games)

	if err != nil {
		log.Errorln(fmt.Sprintf("Error marshalling list of games: %s", err))
	}

	return c.Status(200).SendString(string(jsonGames))
}

///////////////////////////////////////////////////////////////////////////
// MATCHES
///////////////////////////////////////////////////////////////////////////
func postMatchesHandler(c *fiber.Ctx) error {
	numGames := c.Query("num_games")
	numGamesInt, numGamesIntErr := strconv.Atoi(numGames)
	playersQuery := c.Query("players")

	if numGamesIntErr != nil {
		return c.Status(400).SendString(fmt.Sprintf("`num_games` query parameter must be an integer"))
	}
	if numGames == "" {
		return c.Status(400).SendString("The `players` query param value must be a comma-separated list of two ints")
	}

	playersList, _ := sliceAtoi(map2(strings.Split(playersQuery, ","), func(s string) string {
		return strings.ReplaceAll(s, " ", "")
	}))

	if len(playersList) != 2 {
		return c.Status(400).SendString("The `players` query param value must be a comma-separated list of two ints")
	}

	players := getPlayers(playersList)

	match := Match{
		Id:       getCurrentMatchID(db),
		NumGames: numGamesInt,
		Players:  players,
	}

	insertMatch(db, &match)

	return c.Status(200).SendString(fmt.Sprintf("%s", match))
}

func getMatchesHandler(c *fiber.Ctx) error {
	ids := c.Query("ids")

	idList, err := sliceAtoi(map2(strings.Split(ids, ","), func(s string) string {
		return strings.ReplaceAll(s, " ", "")
	}))

	matches := getMatches(idList)

	jsonMatches, err := json.Marshal(matches)

	if err != nil {
		log.Errorln(fmt.Sprintf("Error marshalling list of matches: %s", err))
	}

	return c.Status(200).SendString(string(jsonMatches))
}

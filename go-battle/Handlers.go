package main

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"slices"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
)

// /////////////////////////////////////////////////////////////////////////
// CLIENTS
// /////////////////////////////////////////////////////////////////////////
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
	ids := c.Query("ids")

	clientsList, _ := sliceAtoi(map2(strings.Split(ids, ","), func(s string) string {
		return strings.ReplaceAll(s, " ", "")
	}))

	clients := getClients(clientsList)

	jsonClients, err := json.Marshal(clients)

	if err != nil {
		log.Errorln(fmt.Sprintf("Error marshalling list of clients: %s", err))
	}

	return c.Status(200).SendString(string(jsonClients))
}

// /////////////////////////////////////////////////////////////////////////
// PLAYERS
// /////////////////////////////////////////////////////////////////////////
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

// /////////////////////////////////////////////////////////////////////////
// GAMES
// /////////////////////////////////////////////////////////////////////////
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
		NumGames: numGamesInt,
		Players:  players,
	}

	insertMatch(db, &match)

	game := Game{
		Match:   match,
		Players: players,
		Winner:  &players[0],
		Loser:   &players[1],
	}

	insertGame(db, &game)

	// sessionID := getCurrentSessionID(db)

	// create match

	// then call func (m Match) StartMatch(db *gorm.DB)

	return c.SendString(fmt.Sprintf("Created game with id %s!", 1))
}

func getGamesHandler(c *fiber.Ctx) error {
	players := c.Query("players")
	ids := c.Query("ids")

	playersList, err := sliceAtoi(map2(strings.Split(players, ","), func(s string) string {
		return strings.ReplaceAll(s, " ", "")
	}))
	idList, err := sliceAtoi(map2(strings.Split(ids, ","), func(s string) string {
		return strings.ReplaceAll(s, " ", "")
	}))

	var games []Game

	if len(playersList) > 0 {
		games = getGamesWithPlayers(playersList)
	} else if len(idList) > 0 {
		games = getGamesById(idList)
	} else {
		games = getGamesById([]int{})
	}

	jsonGames, err := json.Marshal(games)

	if err != nil {
		log.Errorln(fmt.Sprintf("Error marshalling list of games: %s", err))
	}

	return c.Status(200).SendString(string(jsonGames))
}

// /////////////////////////////////////////////////////////////////////////
// MATCHES
// /////////////////////////////////////////////////////////////////////////
func postMatchesHandler(c *fiber.Ctx) error {
	numGames := c.Query("num_games")
	numGamesInt, numGamesIntErr := strconv.Atoi(numGames)
	playersQuery := c.Query("players")

	if numGamesIntErr != nil {
		return c.Status(400).SendString(fmt.Sprintf("`num_games` query parameter must be an integer"))
	}
	if numGames == "" {
		return c.Status(400).SendString("The `num_games` query param value must be provided")
	}

	playersList, _ := sliceAtoi(map2(strings.Split(playersQuery, ","), func(s string) string {
		return strings.ReplaceAll(s, " ", "")
	}))

	if len(playersList) != 2 {
		return c.Status(400).SendString("The `players` query param value must be a comma-separated list of two ints")
	}

	players := getPlayers(playersList)

	match := Match{
		NumGames: numGamesInt,
		Players:  players,
		Status:   "Pending",
	}

	insertMatch(db, &match)

	foundMatch := getMatch(int(match.ID))

	return c.Status(200).SendString(fmt.Sprintf("Created match %d, status: %s", match.ID, foundMatch.Status))
}

func deleteMatchesHandler(c *fiber.Ctx) error {
	matchId := c.Query("match_id")
	matchIdInt, matchIdIntErr := strconv.Atoi(matchId)

	if matchId == "" {
		return c.Status(400).SendString("The `match_id` query param value must be provided")
	}

	if matchIdIntErr != nil {
		return c.Status(400).SendString(fmt.Sprintf("`match_id` query parameter must be an integer"))
	}

	var emptyMatch Match

	match := getMatch(matchIdInt)

	if compareMatches(match, emptyMatch) {
		return c.Status(400).SendString(fmt.Sprintf("`match_id` query parameter must point to an existing Match"))
	}

	deleteMatch(db, matchIdInt)

	return c.Status(200).SendString(fmt.Sprintf("Deleted match %d", matchIdInt))
}

func getMatchesHandler(c *fiber.Ctx) error {
	ids := c.Query("ids")
	players := c.Query("players")

	playersList, err := sliceAtoi(map2(strings.Split(players, ","), func(s string) string {
		return strings.ReplaceAll(s, " ", "")
	}))
	idList, err := sliceAtoi(map2(strings.Split(ids, ","), func(s string) string {
		return strings.ReplaceAll(s, " ", "")
	}))

	var matches []Match

	if len(playersList) > 0 {
		matches = getMatchesWithPlayers(playersList)
	} else if len(idList) > 0 {
		matches = getMatches(idList)
	} else {
		matches = getMatches([]int{})
	}

	jsonMatches, err := json.Marshal(matches)

	if err != nil {
		log.Errorln(fmt.Sprintf("Error marshalling list of matches: %s", err))
	}

	return c.Status(200).SendString(string(jsonMatches))
}

func startMatchHandler(c *fiber.Ctx) error {
	matchId := c.Query("match_id")
	matchIdInt, matchIdIntErr := strconv.Atoi(matchId)

	if matchId == "" {
		return c.Status(400).SendString("The `match_id` query param value must be provided")
	}

	if matchIdIntErr != nil {
		return c.Status(400).SendString(fmt.Sprintf("`match_id` query parameter must be an integer"))
	}

	var emptyMatch Match

	match := getMatch(matchIdInt)

	if compareMatches(match, emptyMatch) {
		return c.Status(400).SendString(fmt.Sprintf("`match_id` query parameter must point to an existing Match"))
	}

	match.StartMatch(db)

	match = getMatch(matchIdInt)
	winner, draw := getPlayerWithMostWins(match)

	if draw {
		return c.Status(200).SendString(fmt.Sprintf("Match %d finished, Draw!", matchIdInt))
	} else {
		return c.Status(200).SendString(fmt.Sprintf("Match %d finished, Winner: %s", matchIdInt, winner.Name))
	}
}

func randomMatchHandler(c *fiber.Ctx) error {
	numGames := c.Query("num_games")
	numGamesInt, numGamesIntErr := strconv.Atoi(numGames)

	if numGames != "" && numGamesIntErr != nil {
		return c.Status(400).SendString(fmt.Sprintf("`num_games` query parameter must be an integer"))
	}

	allPlayers := getPlayers([]int{})

	var matchPlayerIds [2]int
	matchPlayerIds[0] = -1
	matchPlayerIds[1] = -1

	for matchPlayerIds[0] == matchPlayerIds[1] {
		matchPlayerIds[0] = int(allPlayers[rand.Intn(len(allPlayers))].ID)
		matchPlayerIds[1] = int(allPlayers[rand.Intn(len(allPlayers))].ID)
	}

	log.Infof("Going to pair player %d against %d", matchPlayerIds[0], matchPlayerIds[1])

	playersToInclude := getPlayers(matchPlayerIds[:])

	var numGamesInMatch int

	if numGames == "" {
		numGamesInMatch = 1
	} else {
		numGamesInMatch = numGamesInt
	}

	match := Match{
		NumGames: numGamesInMatch,
		Players:  playersToInclude,
		Status:   "Pending",
	}

	insertMatch(db, &match)

	go match.StartMatch(db)

	return c.Status(200).SendString(fmt.Sprintf("Started Random Match: ID %d, %d Games, Players %d & %d", match.ID, match.NumGames, match.Players[0].ID, match.Players[1].ID))
}

// /////////////////////////////////////////////////////////////////////////
// TOURNAMENTS
// /////////////////////////////////////////////////////////////////////////
func postTournamentsHandler(c *fiber.Ctx) error {
	playersQuery := c.Query("players")
	tournamentTypeQuery := c.Query("type")

	var allowedTournamentTypes = []string{"swiss", "round-robin"}

	if tournamentTypeQuery == "" {
		return c.Status(400).SendString("The `type` query param value must be provided")
	}

	if playersQuery == "" {
		return c.Status(400).SendString("The `players` query param value must be provided")
	}

	if !slices.Contains(allowedTournamentTypes, tournamentTypeQuery) {
		return c.Status(400).SendString(fmt.Sprintf("The `type` query param value must be one of the following: %v", allowedTournamentTypes))
	}

	playersList, _ := sliceAtoi(map2(strings.Split(playersQuery, ","), func(s string) string {
		return strings.ReplaceAll(s, " ", "")
	}))

	if len(playersList) != 8 {
		return c.Status(400).SendString("The `players` query param value must be a comma-separated list of eight ints")
	}

	// TODO: check that all players passed are actual players

	players := getPlayers(playersList)

	tournament := Tournament{
		Name:    "Chess Tournament (Swiss)",
		Players: players,
		Type:    tournamentTypeQuery,
		Status:  "Pending",
	}

	insertTournament(db, &tournament)

	return c.Status(200).SendString(fmt.Sprintf("Created tournament %d", tournament.ID))
}

func getTournamentsHandler(c *fiber.Ctx) error {
	ids := c.Query("ids")

	idList, err := sliceAtoi(map2(strings.Split(ids, ","), func(s string) string {
		return strings.ReplaceAll(s, " ", "")
	}))

	tournaments := getTournaments(idList)

	jsonTournaments, err := json.Marshal(tournaments)

	if err != nil {
		log.Errorln(fmt.Sprintf("Error marshalling list of tournaments: %s", err))
	}

	return c.Status(200).SendString(string(jsonTournaments))
}

func startTournamentsHandler(c *fiber.Ctx) error {
	tournamentId := c.Query("tournament_id")
	tournamentIdInt, tournamentIdIntErr := strconv.Atoi(tournamentId)

	if tournamentId == "" {
		return c.Status(400).SendString("The `tournament_id` query param value must be provided")
	}

	if tournamentIdIntErr != nil {
		return c.Status(400).SendString(fmt.Sprintf("`tournament_id` query parameter must be an integer"))
	}

	var emptyTournament Tournament

	tournament := getTournament(db, tournamentIdInt)

	if compareTournaments(tournament, emptyTournament) {
		return c.Status(400).SendString(fmt.Sprintf("`tournament_id` query parameter must point to an existing Tournament"))
	}

	tournament.StartTournament(tournamentIdInt)

	tournament = getTournament(db, tournamentIdInt)

	// if draw {
	// 	return c.Status(200).SendString(fmt.Sprintf("Match %d finished, Draw!", matchIdInt))
	// } else {
	// 	return c.Status(200).SendString(fmt.Sprintf("Match %d finished, Winner: %s", matchIdInt, winner.Name))
	// }

	return c.Status(200).SendString(fmt.Sprintf("Tournament %d finished, Winner: %s", tournamentIdInt, "TODO WINNER NAME"))
}

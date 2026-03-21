package main

import (
	"encoding/json"
	"fmt"
	"math"
	"math/rand"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

// PaginatedResponse wraps a page of results with pagination metadata
type PaginatedResponse struct {
	Data       interface{} `json:"data"`
	Page       int         `json:"page"`
	PageSize   int         `json:"pageSize"`
	TotalCount int64       `json:"totalCount"`
	TotalPages int         `json:"totalPages"`
}

const defaultPageSize = 10
const maxPageSize = 100

func parsePaginationParams(c *fiber.Ctx) (int, int) {
	page := parseIntWithDefault(c.Query("page"), 1)
	pageSize := parseIntWithDefault(c.Query("page_size"), defaultPageSize)

	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = defaultPageSize
	}
	if pageSize > maxPageSize {
		pageSize = maxPageSize
	}

	return page, pageSize
}

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
		return c.Status(400).SendString("`client_id` query parameter must be an integer")
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
		return c.Status(400).SendString("`num_games` query parameter must be an integer")
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

	return c.SendString(fmt.Sprintf("Created game with id %d!", 1))
}

func getGamesHandler(c *fiber.Ctx) error {
	players := c.Query("players")
	ids := c.Query("ids")
	page, pageSize := parsePaginationParams(c)

	playersList, _ := sliceAtoi(map2(strings.Split(players, ","), func(s string) string {
		return strings.ReplaceAll(s, " ", "")
	}))
	idList, _ := sliceAtoi(map2(strings.Split(ids, ","), func(s string) string {
		return strings.ReplaceAll(s, " ", "")
	}))

	var games []Game
	var totalCount int64

	if len(playersList) > 0 {
		games, totalCount = getGamesWithPlayersPaginated(playersList, page, pageSize)
	} else if len(idList) > 0 {
		games, totalCount = getGamesByIdPaginated(idList, page, pageSize)
	} else {
		games, totalCount = getGamesByIdPaginated([]int{}, page, pageSize)
	}

	response := PaginatedResponse{
		Data:       games,
		Page:       page,
		PageSize:   pageSize,
		TotalCount: totalCount,
		TotalPages: int(math.Ceil(float64(totalCount) / float64(pageSize))),
	}

	jsonGames, err := json.Marshal(response)

	if err != nil {
		log.Errorln(fmt.Sprintf("Error marshalling list of games: %s", err))
	}

	return c.Status(200).SendString(string(jsonGames))
}

func deleteGamesHandler(c *fiber.Ctx) error {
	gameId := c.Query("game_id")
	gameIdInt, gameIdIntErr := strconv.Atoi(gameId)

	if gameId == "" {
		return c.Status(400).SendString("The `game_id` query param value must be provided")
	}

	if gameIdIntErr != nil {
		return c.Status(400).SendString("`game_id` query parameter must be an integer")
	}

	var game Game
	result := db.First(&game, gameIdInt)
	if result.Error != nil {
		return c.Status(400).SendString(fmt.Sprintf("Game %d not found", gameIdInt))
	}

	db.Delete(&Game{}, gameIdInt)

	return c.Status(200).SendString(fmt.Sprintf("Deleted game %d", gameIdInt))
}

func stopGameHandler(c *fiber.Ctx) error {
	gameId := c.Query("game_id")
	gameIdInt, gameIdIntErr := strconv.Atoi(gameId)

	if gameId == "" {
		return c.Status(400).SendString("The `game_id` query param value must be provided")
	}

	if gameIdIntErr != nil {
		return c.Status(400).SendString("`game_id` query parameter must be an integer")
	}

	var game Game
	result := db.First(&game, gameIdInt)
	if result.Error != nil {
		return c.Status(400).SendString(fmt.Sprintf("Game %d not found", gameIdInt))
	}

	if game.Status != "In Progress" {
		return c.Status(400).SendString(fmt.Sprintf("Game %d is not running (status: %s)", gameIdInt, game.Status))
	}

	err := StopGame(db, gameIdInt)
	if err != nil {
		return c.Status(400).SendString(err.Error())
	}

	return c.Status(200).SendString(fmt.Sprintf("Game %d stopped", gameIdInt))
}

func restartGameHandler(c *fiber.Ctx) error {
	gameId := c.Query("game_id")
	gameIdInt, gameIdIntErr := strconv.Atoi(gameId)

	if gameId == "" {
		return c.Status(400).SendString("The `game_id` query param value must be provided")
	}

	if gameIdIntErr != nil {
		return c.Status(400).SendString("`game_id` query parameter must be an integer")
	}

	err := RestartGame(db, gameIdInt)
	if err != nil {
		return c.Status(400).SendString(err.Error())
	}

	return c.Status(200).SendString(fmt.Sprintf("Game %d restarting", gameIdInt))
}

// /////////////////////////////////////////////////////////////////////////
// MATCHES
// /////////////////////////////////////////////////////////////////////////
func postMatchesHandler(c *fiber.Ctx) error {
	numGames := c.Query("num_games")
	numGamesInt, numGamesIntErr := strconv.Atoi(numGames)
	playersQuery := c.Query("players")

	if numGamesIntErr != nil {
		return c.Status(400).SendString("`num_games` query parameter must be an integer")
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
		return c.Status(400).SendString("`match_id` query parameter must be an integer")
	}

	var emptyMatch Match

	match := getMatch(matchIdInt)

	if compareMatches(match, emptyMatch) {
		return c.Status(400).SendString("`match_id` query parameter must point to an existing Match")
	}

	deleteMatch(db, matchIdInt)

	return c.Status(200).SendString(fmt.Sprintf("Deleted match %d", matchIdInt))
}

func getMatchesHandler(c *fiber.Ctx) error {
	ids := c.Query("ids")
	players := c.Query("players")
	page, pageSize := parsePaginationParams(c)

	playersList, _ := sliceAtoi(map2(strings.Split(players, ","), func(s string) string {
		return strings.ReplaceAll(s, " ", "")
	}))
	idList, _ := sliceAtoi(map2(strings.Split(ids, ","), func(s string) string {
		return strings.ReplaceAll(s, " ", "")
	}))

	var matches []Match
	var totalCount int64

	if len(playersList) > 0 {
		matches, totalCount = getMatchesWithPlayersPaginated(playersList, page, pageSize)
	} else if len(idList) > 0 {
		matches, totalCount = getMatchesPaginated(idList, page, pageSize)
	} else {
		matches, totalCount = getMatchesPaginated([]int{}, page, pageSize)
	}

	// Check and update status for all in-progress matches
	for _, match := range matches {
		if match.Status == "In Progress" {
			CheckAndUpdateMatchStatus(db, int(match.ID))
		}
	}

	// Reload the current page to reflect any status updates
	if len(playersList) > 0 {
		matches, totalCount = getMatchesWithPlayersPaginated(playersList, page, pageSize)
	} else if len(idList) > 0 {
		matches, totalCount = getMatchesPaginated(idList, page, pageSize)
	} else {
		matches, totalCount = getMatchesPaginated([]int{}, page, pageSize)
	}

	response := PaginatedResponse{
		Data:       matches,
		Page:       page,
		PageSize:   pageSize,
		TotalCount: totalCount,
		TotalPages: int(math.Ceil(float64(totalCount) / float64(pageSize))),
	}

	jsonMatches, err := json.Marshal(response)

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
		return c.Status(400).SendString("`match_id` query parameter must be an integer")
	}

	var emptyMatch Match

	match := getMatch(matchIdInt)

	if compareMatches(match, emptyMatch) {
		return c.Status(400).SendString("`match_id` query parameter must point to an existing Match")
	}

	// If the match status is still "In Progress" but all games are in a final state,
	// update the match status to "Complete"
	if match.Status == "In Progress" {
		allGamesComplete := true
		if len(match.Games) == match.NumGames {
			for _, game := range match.Games {
				if game.Status != "Complete" && game.Status != "Canceled" && game.Status != "Error" {
					allGamesComplete = false
					break
				}
			}

			if allGamesComplete {
				log.Infof("Match %d has all games complete. Updating match status to Complete.", matchIdInt)

				// Calculate winner
				_, draw := getPlayerWithMostWins(match) // Changed to not store the unused winner variable

				// Update match status
				if draw {
					updateMatchDraw(db, match, true)
				}

				// Mark the match complete and set end time if not already set
				updateMatchStatus(db, match, "Complete")
				if match.EndTime.IsZero() {
					updateMatchEndTime(db, match, time.Now())
				}

				match = getMatch(matchIdInt)
			}
		}
	}

	// If the match isn't already started, start it
	if match.Status == "Pending" {
		// Start match in a goroutine so the HTTP response returns immediately,
		// allowing the user to stop/control the match from the web UI
		go func() {
			defer func() {
				if r := recover(); r != nil {
					log.Errorf("Panic recovered in startMatchHandler goroutine for match %d: %v", matchIdInt, r)
					updateMatchStatus(db, match, "Error")
				}
			}()
			match.StartMatch(db)
		}()

		return c.Status(200).SendString(fmt.Sprintf("Match %d started", matchIdInt))
	} else {
		return c.Status(200).SendString(fmt.Sprintf("Match %d is already %s", matchIdInt, match.Status))
	}
}

func stopMatchHandler(c *fiber.Ctx) error {
	matchId := c.Query("match_id")
	matchIdInt, matchIdIntErr := strconv.Atoi(matchId)

	if matchId == "" {
		return c.Status(400).SendString("The `match_id` query param value must be provided")
	}

	if matchIdIntErr != nil {
		return c.Status(400).SendString("`match_id` query parameter must be an integer")
	}

	match := getMatch(matchIdInt)
	if match.ID == 0 {
		return c.Status(400).SendString(fmt.Sprintf("Match %d not found", matchIdInt))
	}

	if match.Status != "In Progress" {
		return c.Status(400).SendString(fmt.Sprintf("Match %d is not running (status: %s)", matchIdInt, match.Status))
	}

	err := StopMatch(db, matchIdInt)
	if err != nil {
		return c.Status(400).SendString(err.Error())
	}

	return c.Status(200).SendString(fmt.Sprintf("Match %d stopped", matchIdInt))
}

func restartMatchHandler(c *fiber.Ctx) error {
	matchId := c.Query("match_id")
	matchIdInt, matchIdIntErr := strconv.Atoi(matchId)

	if matchId == "" {
		return c.Status(400).SendString("The `match_id` query param value must be provided")
	}

	if matchIdIntErr != nil {
		return c.Status(400).SendString("`match_id` query parameter must be an integer")
	}

	match := getMatch(matchIdInt)
	if match.ID == 0 {
		return c.Status(400).SendString(fmt.Sprintf("Match %d not found", matchIdInt))
	}

	err := RestartMatch(db, matchIdInt)
	if err != nil {
		return c.Status(400).SendString(err.Error())
	}

	return c.Status(200).SendString(fmt.Sprintf("Match %d restarting", matchIdInt))
}

func randomMatchHandler(c *fiber.Ctx) error {
	numGames := c.Query("num_games")
	numGamesInt, numGamesIntErr := strconv.Atoi(numGames)

	if numGames != "" && numGamesIntErr != nil {
		return c.Status(400).SendString("`num_games` query parameter must be an integer")
	}

	allPlayerIDs := getPlayerIDs()

	// Check if we have any players at all
	if len(allPlayerIDs) < 2 {
		return c.Status(400).SendString("Not enough players available to create a match (minimum 2 required)")
	}

	var matchPlayerIds [2]int
	matchPlayerIds[0] = -1
	matchPlayerIds[1] = -1

	for matchPlayerIds[0] == matchPlayerIds[1] {
		matchPlayerIds[0] = allPlayerIDs[rand.Intn(len(allPlayerIDs))]
		matchPlayerIds[1] = allPlayerIDs[rand.Intn(len(allPlayerIDs))]
	}

	log.Infof("Going to pair player %d against %d", matchPlayerIds[0], matchPlayerIds[1])

	playersToInclude := getPlayers(matchPlayerIds[:])

	log.Debugf("After filtering, players to include")

	// Check if we successfully found both players
	if len(playersToInclude) != 2 {
		log.Errorf("Failed to find both players with IDs %d and %d", matchPlayerIds[0], matchPlayerIds[1])
		return c.Status(404).SendString(fmt.Sprintf("Could not find players with IDs %d and %d", matchPlayerIds[0], matchPlayerIds[1]))
	}

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

	// Confirm that the match was inserted successfully and has an ID
	if match.ID == 0 {
		log.Errorf("Failed to insert match in the database")
		return c.Status(500).SendString("Failed to create match due to a database error")
	}

	// Start the match in a goroutine
	go func() {
		// Catch panics to prevent crashing the server
		defer func() {
			if r := recover(); r != nil {
				log.Errorf("Panic recovered in match.StartMatch goroutine: %v", r)
				// Update match status to Error
				updateMatchStatus(db, match, "Error")
			}
		}()
		match.StartMatch(db)
	}()

	// Double check that we have valid player IDs before attempting to access them
	if len(match.Players) >= 2 {
		return c.Status(200).SendString(fmt.Sprintf("Started Random Match: ID %d, %d Games, Players %d & %d", match.ID, match.NumGames, match.Players[0].ID, match.Players[1].ID))
	} else {
		return c.Status(200).SendString(fmt.Sprintf("Started Random Match: ID %d, %d Games", match.ID, match.NumGames))
	}
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

	// if len(playersList) != 8 {
	// 	return c.Status(400).SendString("The `players` query param value must be a comma-separated list of eight ints")
	// }

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
	page, pageSize := parsePaginationParams(c)

	idList, _ := sliceAtoi(map2(strings.Split(ids, ","), func(s string) string {
		return strings.ReplaceAll(s, " ", "")
	}))

	tournaments, totalCount := getTournamentsPaginated(idList, page, pageSize)

	response := PaginatedResponse{
		Data:       tournaments,
		Page:       page,
		PageSize:   pageSize,
		TotalCount: totalCount,
		TotalPages: int(math.Ceil(float64(totalCount) / float64(pageSize))),
	}

	jsonTournaments, err := json.Marshal(response)

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
		return c.Status(400).SendString("`tournament_id` query parameter must be an integer")
	}

	var emptyTournament Tournament

	tournament := getTournament(db, tournamentIdInt)

	if compareTournaments(tournament, emptyTournament) {
		return c.Status(400).SendString("`tournament_id` query parameter must point to an existing Tournament")
	}

	// Start tournament in a goroutine so the HTTP response isn't blocked by repo cloning
	go func() {
		defer func() {
			if r := recover(); r != nil {
				log.Errorf("Panic recovered in StartTournament goroutine for tournament %d: %v", tournamentIdInt, r)
				updateTournamentStatus(db, tournament, "Error")
			}
		}()
		tournament.StartTournament(tournamentIdInt)
	}()

	return c.Status(200).SendString(fmt.Sprintf("Started tournament %d", tournamentIdInt))
}

func deleteTournamentsHandler(c *fiber.Ctx) error {
	tournamentId := c.Query("tournament_id")
	tournamentIdInt, tournamentIdIntErr := strconv.Atoi(tournamentId)

	if tournamentId == "" {
		return c.Status(400).SendString("The `tournament_id` query param value must be provided")
	}

	if tournamentIdIntErr != nil {
		return c.Status(400).SendString("`tournament_id` query parameter must be an integer")
	}

	var emptyTournament Tournament

	tournament := getTournament(db, tournamentIdInt)

	if compareTournaments(tournament, emptyTournament) {
		return c.Status(400).SendString("`tournament_id` query parameter must point to an existing Tournament")
	}

	// Only allow deletion of tournaments in "Pending" status
	if tournament.Status != "Pending" {
		return c.Status(400).SendString(fmt.Sprintf("Only tournaments with 'Pending' status can be deleted. Tournament %d has status '%s'", tournamentIdInt, tournament.Status))
	}

	deleteTournament(db, tournamentIdInt)

	return c.Status(200).SendString(fmt.Sprintf("Deleted tournament %d", tournamentIdInt))
}

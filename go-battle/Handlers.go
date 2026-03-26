package main

import (
	"fmt"
	"math/rand"
	"slices"
	"strconv"
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

// allowedSortFields restricts which columns can be sorted on to prevent SQL injection
var allowedSortFields = map[string]bool{
	"created_at": true,
	"id":         true,
	"status":     true,
	"name":       true,
}

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

// parseSortParams parses sort and sort_dir query params with validation
func parseSortParams(c *fiber.Ctx) (string, string) {
	sortField := c.Query("sort", "created_at")
	sortDir := c.Query("sort_dir", "desc")

	if !allowedSortFields[sortField] {
		sortField = "created_at"
	}
	if sortDir != "asc" && sortDir != "desc" {
		sortDir = "desc"
	}

	return sortField, sortDir
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
	clientsList := parseIntIDList(c.Query("ids"))
	clients := getClientsFiltered(clientsList, c.Query("language"), c.Query("game"))
	return sendJSON(c, clients)
}

// /////////////////////////////////////////////////////////////////////////
// PLAYERS
// /////////////////////////////////////////////////////////////////////////
func postPlayersHandler(c *fiber.Ctx) error {
	name := c.Query("name")

	if name == "" {
		return c.Status(400).SendString("Must supply `name` query parameter which is the name of the Player.")
	}

	if playerExists(db, name) {
		return c.Status(400).SendString(fmt.Sprintf("A player by the name of `%s` already exists!", name))
	}

	clientIdInt, err := requireIntParam(c, "client_id")
	if err != nil {
		return err
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
	players := getPlayers(parseIntIDList(c.Query("ids")))
	return sendJSON(c, players)
}

func getPlayerByIdHandler(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).SendString("Invalid player ID")
	}
	player := getPlayer(id)
	if player.ID == 0 {
		return c.Status(404).SendString("Player not found")
	}
	return sendJSON(c, player)
}

// /////////////////////////////////////////////////////////////////////////
// GAMES
// /////////////////////////////////////////////////////////////////////////
func postGamesHandler(c *fiber.Ctx) error {
	numGamesInt, err := requireIntParam(c, "num_games")
	if err != nil {
		return err
	}

	playersList := parseIntIDList(c.Query("players"))

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
	playersList := parseIntIDList(c.Query("players"))
	idList := parseIntIDList(c.Query("ids"))
	status := c.Query("status")
	page, pageSize := parsePaginationParams(c)
	sortField, sortDir := parseSortParams(c)

	var games []Game
	var totalCount int64

	if len(playersList) > 0 {
		games, totalCount = getGamesWithPlayersPaginated(playersList, page, pageSize, status, sortField, sortDir)
	} else {
		games, totalCount = getGamesByIdPaginated(idList, page, pageSize, status, sortField, sortDir)
	}

	return sendPaginatedJSON(c, games, page, pageSize, totalCount)
}

func deleteGamesHandler(c *fiber.Ctx) error {
	gameIdInt, err := requireIntParam(c, "game_id")
	if err != nil {
		return err
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
	gameIdInt, err := requireIntParam(c, "game_id")
	if err != nil {
		return err
	}

	var game Game
	result := db.First(&game, gameIdInt)
	if result.Error != nil {
		return c.Status(400).SendString(fmt.Sprintf("Game %d not found", gameIdInt))
	}

	if game.Status != "In Progress" {
		return c.Status(400).SendString(fmt.Sprintf("Game %d is not running (status: %s)", gameIdInt, game.Status))
	}

	err = StopGame(db, gameIdInt)
	if err != nil {
		return c.Status(400).SendString(err.Error())
	}

	return c.Status(200).SendString(fmt.Sprintf("Game %d stopped", gameIdInt))
}

func restartGameHandler(c *fiber.Ctx) error {
	gameIdInt, err := requireIntParam(c, "game_id")
	if err != nil {
		return err
	}

	err = RestartGame(db, gameIdInt)
	if err != nil {
		return c.Status(400).SendString(err.Error())
	}

	return c.Status(200).SendString(fmt.Sprintf("Game %d restarting", gameIdInt))
}

// /////////////////////////////////////////////////////////////////////////
// MATCHES
// /////////////////////////////////////////////////////////////////////////
func postMatchesHandler(c *fiber.Ctx) error {
	numGamesInt, err := requireIntParam(c, "num_games")
	if err != nil {
		return err
	}

	playersList := parseIntIDList(c.Query("players"))

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
	matchIdInt, err := requireIntParam(c, "match_id")
	if err != nil {
		return err
	}

	match := getMatch(matchIdInt)
	if match.ID == 0 {
		return c.Status(400).SendString("`match_id` query parameter must point to an existing Match")
	}

	deleteMatch(db, matchIdInt)

	return c.Status(200).SendString(fmt.Sprintf("Deleted match %d", matchIdInt))
}

func getMatchesHandler(c *fiber.Ctx) error {
	playersList := parseIntIDList(c.Query("players"))
	idList := parseIntIDList(c.Query("ids"))
	status := c.Query("status")
	page, pageSize := parsePaginationParams(c)
	sortField, sortDir := parseSortParams(c)

	fetchMatches := func() ([]Match, int64) {
		if len(playersList) > 0 {
			return getMatchesWithPlayersPaginated(playersList, page, pageSize, status, sortField, sortDir)
		}
		return getMatchesPaginated(idList, page, pageSize, status, sortField, sortDir)
	}

	matches, _ := fetchMatches()

	// Check and update status for all in-progress matches
	for _, match := range matches {
		if match.Status == "In Progress" {
			CheckAndUpdateMatchStatus(db, int(match.ID))
		}
	}

	// Reload the current page to reflect any status updates
	matches, totalCount := fetchMatches()

	return sendPaginatedJSON(c, matches, page, pageSize, totalCount)
}

func startMatchHandler(c *fiber.Ctx) error {
	matchIdInt, err := requireIntParam(c, "match_id")
	if err != nil {
		return err
	}

	match := getMatch(matchIdInt)
	if match.ID == 0 {
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
	matchIdInt, err := requireIntParam(c, "match_id")
	if err != nil {
		return err
	}

	match := getMatch(matchIdInt)
	if match.ID == 0 {
		return c.Status(400).SendString(fmt.Sprintf("Match %d not found", matchIdInt))
	}

	if match.Status != "In Progress" {
		return c.Status(400).SendString(fmt.Sprintf("Match %d is not running (status: %s)", matchIdInt, match.Status))
	}

	err = StopMatch(db, matchIdInt)
	if err != nil {
		return c.Status(400).SendString(err.Error())
	}

	return c.Status(200).SendString(fmt.Sprintf("Match %d stopped", matchIdInt))
}

func restartMatchHandler(c *fiber.Ctx) error {
	matchIdInt, err := requireIntParam(c, "match_id")
	if err != nil {
		return err
	}

	match := getMatch(matchIdInt)
	if match.ID == 0 {
		return c.Status(400).SendString(fmt.Sprintf("Match %d not found", matchIdInt))
	}

	err = RestartMatch(db, matchIdInt)
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

// rankedMatchHandler pairs two players with the most similar ELO ratings and starts a match.
func rankedMatchHandler(c *fiber.Ctx) error {
	numGames := c.Query("num_games")
	numGamesInt, numGamesIntErr := strconv.Atoi(numGames)

	if numGames != "" && numGamesIntErr != nil {
		return c.Status(400).SendString("`num_games` query parameter must be an integer")
	}

	players := getPlayersElo()

	if len(players) < 2 {
		log.Warnf("Ranked matchmaker: not enough players (%d) to create a match", len(players))
		return c.Status(400).SendString("Not enough players available to create a match (minimum 2 required)")
	}

	// Pick a random seed player, then find the opponent with the closest ELO.
	seedIdx := rand.Intn(len(players))
	seed := players[seedIdx]

	bestDiff := -1
	opponentIdx := -1
	for i, p := range players {
		if p.ID == seed.ID {
			continue
		}
		diff := p.Elo - seed.Elo
		if diff < 0 {
			diff = -diff
		}
		if bestDiff == -1 || diff < bestDiff {
			bestDiff = diff
			opponentIdx = i
		}
	}

	opponent := players[opponentIdx]
	log.Infof("Ranked pairing: Player %d (%s, ELO %d) vs Player %d (%s, ELO %d) | ELO diff: %d",
		seed.ID, seed.Name, seed.Elo, opponent.ID, opponent.Name, opponent.Elo, bestDiff)

	playerIds := []int{int(seed.ID), int(opponent.ID)}
	playersToInclude := getPlayers(playerIds)

	if len(playersToInclude) != 2 {
		log.Errorf("Ranked matchmaker: failed to load players with IDs %d and %d", seed.ID, opponent.ID)
		return c.Status(404).SendString(fmt.Sprintf("Could not find players with IDs %d and %d", seed.ID, opponent.ID))
	}

	numGamesInMatch := 1
	if numGames != "" {
		numGamesInMatch = numGamesInt
	}

	match := Match{
		NumGames: numGamesInMatch,
		Players:  playersToInclude,
		Status:   "Pending",
	}

	insertMatch(db, &match)

	if match.ID == 0 {
		log.Errorf("Ranked matchmaker: failed to insert match into the database")
		return c.Status(500).SendString("Failed to create match due to a database error")
	}

	log.Infof("Ranked match created: ID %d, %d game(s), Players %d (%s) vs %d (%s)",
		match.ID, match.NumGames, seed.ID, seed.Name, opponent.ID, opponent.Name)

	go func() {
		defer func() {
			if r := recover(); r != nil {
				log.Errorf("Panic recovered in ranked match goroutine (match %d): %v", match.ID, r)
				updateMatchStatus(db, match, "Error")
			}
		}()
		match.StartMatch(db)
	}()

	return c.Status(200).SendString(fmt.Sprintf(
		"Started Ranked Match: ID %d, %d Games, Players %d (%s, ELO %d) & %d (%s, ELO %d), ELO diff: %d",
		match.ID, match.NumGames,
		seed.ID, seed.Name, seed.Elo,
		opponent.ID, opponent.Name, opponent.Elo,
		bestDiff,
	))
}

// /////////////////////////////////////////////////////////////////////////
// TOURNAMENTS
// /////////////////////////////////////////////////////////////////////////
func postTournamentsHandler(c *fiber.Ctx) error {
	tournamentTypeQuery := c.Query("type")

	var allowedTournamentTypes = []string{"swiss", "round-robin"}

	if tournamentTypeQuery == "" {
		return c.Status(400).SendString("The `type` query param value must be provided")
	}

	if c.Query("players") == "" {
		return c.Status(400).SendString("The `players` query param value must be provided")
	}

	if !slices.Contains(allowedTournamentTypes, tournamentTypeQuery) {
		return c.Status(400).SendString(fmt.Sprintf("The `type` query param value must be one of the following: %v", allowedTournamentTypes))
	}

	playersList := parseIntIDList(c.Query("players"))

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
	status := c.Query("status")
	tournamentType := c.Query("type")
	page, pageSize := parsePaginationParams(c)
	sortField, sortDir := parseSortParams(c)

	idList := parseIntIDList(c.Query("ids"))

	tournaments, totalCount := getTournamentsPaginated(idList, page, pageSize, status, tournamentType, sortField, sortDir)

	return sendPaginatedJSON(c, tournaments, page, pageSize, totalCount)
}

func startTournamentsHandler(c *fiber.Ctx) error {
	tournamentIdInt, err := requireIntParam(c, "tournament_id")
	if err != nil {
		return err
	}

	tournament := getTournament(db, tournamentIdInt)
	if tournament.ID == 0 {
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
	tournamentIdInt, err := requireIntParam(c, "tournament_id")
	if err != nil {
		return err
	}

	tournament := getTournament(db, tournamentIdInt)
	if tournament.ID == 0 {
		return c.Status(400).SendString("`tournament_id` query parameter must point to an existing Tournament")
	}

	// Only allow deletion of tournaments in "Pending" status
	if tournament.Status != "Pending" {
		return c.Status(400).SendString(fmt.Sprintf("Only tournaments with 'Pending' status can be deleted. Tournament %d has status '%s'", tournamentIdInt, tournament.Status))
	}

	deleteTournament(db, tournamentIdInt)

	return c.Status(200).SendString(fmt.Sprintf("Deleted tournament %d", tournamentIdInt))
}

package main

import (
	"sort"
	"sync"
	"time"

	"github.com/lib/pq"
	"gorm.io/gorm"
)

type Tournament struct {
	gorm.Model

	Name    string   `json:"name"`
	Players []Player `json:"players" gorm:"many2many:tournament_players"`
	Games   []Game   `json:"games" gorm:"many2many:tournament_games"`
	Matches []Match  `json:"matches" gorm:"many2many:tournament_matches"`

	Winner    *Player   `json:"winner" gorm:"foreignKey:WinnerID"`
	WinnerID  *int      `json:"winner_id" gorm:"default:null"`
	Type      string    `json:"type" gorm:"default:swiss"`
	Status    string    `json:"status"`
	StartTime time.Time `json:"start_time"`
	EndTime   time.Time `json:"end_time"`
}

const (
	WhiteColor int = 0
	BlackColor     = 1
)

const (
	GameResultLoss int = 0
	GameResultWin      = 1
)

type TournamentPlayer struct {
	Player          *Player   `json:"player"`
	Score           float32   `json:"score"`
	PastOpponents   []*Player `json:"past_opponents"`
	NumGamesWhite   int       `json:"num_games_white"`
	NumGamesBlack   int       `json:"num_games_black"`
	ColorPreference int       `json:"color_preference"`
	ByeGames        []int     `json:"bye_games"`
	LastGameResult  int       `json:"last_game_result"`
}

var tournamentLock = &sync.Mutex{}

func insertTournament(db *gorm.DB, tournament *Tournament) {
	tournamentLock.Lock()
	defer tournamentLock.Unlock()

	db.Create(&tournament)
}

func getTournaments(ids []int) []Tournament {
	var tournaments []Tournament

	if len(ids) > 0 {
		db.Preload("Games").
			Preload("Games.Winner").
			Preload("Games.Loser").
			Preload("Players").
			Preload("Players.Client").
			Preload("Matches").
			Preload("Matches.Games").
			Preload("Matches.Players").
			Where("id = ANY(?)", pq.Array(ids)).
			Find(&tournaments)
	} else {
		db.Preload("Games").
			Preload("Games.Winner").
			Preload("Games.Loser").
			Preload("Players").
			Preload("Players.Client").
			Preload("Matches").
			Preload("Matches.Games").
			Preload("Matches.Players").
			Find(&tournaments)
	}

	return tournaments
}

func getTournament(db *gorm.DB, id int) Tournament {
	var t Tournament

	db.Preload("Games").
		Preload("Games.Winner").
		Preload("Games.Loser").
		Preload("Players").
		Preload("Players.Client").
		Preload("Matches").
		Preload("Matches.Games").
		Preload("Matches.Players").
		Where("id = ?", id).First(&t)

	return t
}

func addMatchToTournament(db *gorm.DB, match Match, tournament Tournament) {
	tournamentLock.Lock()
	defer tournamentLock.Unlock()

	var t Tournament

	db.Where("id = ?", tournament.ID).First(&t)

	t.Matches = append(t.Matches, match)

	db.Save(&t)
}

func BuildTournamentPlayers(players []Player) []*TournamentPlayer {
	var tournamentPlayers []*TournamentPlayer

	for i := range players {
		t := TournamentPlayer{
			Player:        &players[i],
			Score:         0.0,
			PastOpponents: make([]*Player, 0),
			NumGamesWhite: 0,
			NumGamesBlack: 0,
			ByeGames:      make([]int, 0),
		}

		tournamentPlayers = append(tournamentPlayers, &t)
	}

	return tournamentPlayers
}

func (t Tournament) StartTournament(id int) {
	tournament := getTournament(db, id)

	tournamentPlayers := BuildTournamentPlayers(tournament.Players)

	log.Debugf("players: %v", tournament.Players)
	log.Debugf("TournamentPlayers: %v", tournamentPlayers)

	currentRound := 1
	maxRounds := 2

	// round 1 - ranked by ELO
	sort.SliceStable(tournamentPlayers[:], func(i, j int) bool {
		return tournamentPlayers[i].Player.Elo > tournamentPlayers[j].Player.Elo
	})

	for currentRound <= maxRounds {
		log.Infof("Starting Tournament %d, Round %d", id, currentRound)

		roundPairings := SwissPairing(tournamentPlayers, currentRound)

		// wait for all round matches to be complete before iterating
		var roundWG sync.WaitGroup

		log.Debugf("Going to play %d matches", len(roundPairings))

		for i := range roundPairings {
			roundWG.Add(1)

			go func(roundPairing int) {
				defer roundWG.Done()

				pairing := roundPairings[roundPairing]

				player1 := pairing.Player1
				player2 := pairing.Player2

				// Skip invalid pairings
				if player1.Name == "" || player2.Name == "" {
					log.Warnf("Skipping invalid pairing in round %d", currentRound)
					return
				}

				log.Debugf("Starting match between %s and %s (round %d)", player1.Name, player2.Name, currentRound)

				match := Match{
					NumGames: 5,
					Players: []Player{
						player1,
						player2,
					},
					Status: "Pending",
				}

				insertMatch(db, &match)
				addMatchToTournament(db, match, tournament)

				// Add Match to the Tournament in memory
				tournament.Matches = append(tournament.Matches, match)

				match.StartMatch(db)
			}(i)
		}

		roundWG.Wait()

		log.Debugf("Round %d complete!", currentRound)

		// Update scores and past opponents
		for _, pairing := range roundPairings {
			updateTournamentPlayerScores(pairing, tournamentPlayers)
		}

		currentRound++
	}

	// Determine the winner based on scores
	sort.SliceStable(tournamentPlayers[:], func(i, j int) bool {
		return tournamentPlayers[i].Score > tournamentPlayers[j].Score
	})

	tournament.Winner = tournamentPlayers[0].Player
	winnerID := int(tournamentPlayers[0].Player.ID)
	tournament.WinnerID = &winnerID
	tournament.Status = "Completed"
	tournament.EndTime = time.Now()

	db.Save(&tournament)

	log.Infof("Tournament %d completed! Winner: %s", id, tournament.Winner.Name)
}

func updateTournamentPlayerScores(pairing MatchPairing, tournamentPlayers []*TournamentPlayer) {
	var tp1, tp2 *TournamentPlayer

	// Find the TournamentPlayer records for both players in the pairing
	for _, tp := range tournamentPlayers {
		if tp.Player.ID == pairing.Player1.ID {
			tp1 = tp
		} else if tp.Player.ID == pairing.Player2.ID {
			tp2 = tp
		}
	}

	// Update scores only if we found both tournament players
	if tp1 != nil && tp2 != nil {
		// Compare TournamentPlayer scores instead of Player scores
		if tp1.Score > tp2.Score {
			tp1.Score += 1.0
			tp1.LastGameResult = GameResultWin
			tp2.LastGameResult = GameResultLoss
		} else {
			tp2.Score += 1.0
			tp2.LastGameResult = GameResultWin
			tp1.LastGameResult = GameResultLoss
		}

		// Update past opponents for both players
		tp1.PastOpponents = append(tp1.PastOpponents, tp2.Player)
		tp2.PastOpponents = append(tp2.PastOpponents, tp1.Player)
	}
}

func compareTournaments(tournamentOne Tournament, tournamentTwo Tournament) bool {
	return tournamentOne.ID == tournamentTwo.ID &&
		tournamentOne.CreatedAt == tournamentTwo.CreatedAt &&
		tournamentOne.UpdatedAt == tournamentTwo.UpdatedAt &&
		tournamentOne.DeletedAt == tournamentTwo.DeletedAt
}

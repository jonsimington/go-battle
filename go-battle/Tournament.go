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
	var _ *Player

	// round 1 - ranked by ELO
	sort.SliceStable(tournamentPlayers[:], func(i, j int) bool {
		return tournamentPlayers[i].Player.Elo > tournamentPlayers[j].Player.Elo
	})

	log.Infof("Starting Tournament %d, Round %d", id, currentRound)

	roundPairings := SwissPairing(tournamentPlayers, currentRound)

	for i := range roundPairings {
		pairing := roundPairings[i]

		if pairing.Player1.Name == "" || pairing.Player2.Name == "" {
			continue
		}

		log.Debugf("Starting match between %s (%d) and %s (%d)", pairing.Player1.Name, pairing.Player1.Elo, pairing.Player2.Name, pairing.Player2.Elo)
	}

	// for i := 1; i < 5; i++ {
	// 	log.Infof("Starting Tournament %d, Round %d", id, currentRound)

	// 	roundPairings := SwissPairing(tournamentPlayers, currentRound)

	// 	for i := range roundPairings {
	// 		pairing := roundPairings[i]

	// 		log.Debugf("Starting match between %s (%d) and %s (%d)", pairing.Player1.Name, pairing.Player1.Elo, pairing.Player2.Name, pairing.Player2.Elo)
	// 	}

	// 	currentRound += 1
	// }

	// for tournamentWinner == nil {
	// }

}

func compareTournaments(tournamentOne Tournament, tournamentTwo Tournament) bool {
	return tournamentOne.ID == tournamentTwo.ID &&
		tournamentOne.CreatedAt == tournamentTwo.CreatedAt &&
		tournamentOne.UpdatedAt == tournamentTwo.UpdatedAt &&
		tournamentOne.DeletedAt == tournamentTwo.DeletedAt
}

package main

import (
	"time"

	elogo "github.com/kortemy/elo-go"
	"gorm.io/gorm"
)

type HistoricalElo struct {
	gorm.Model

	Elo       int       `json:"elo"`
	Timestamp time.Time `json:"timestamp"`
}

func calculateEloOutcomes(player1 Player, player2 Player, winner *Player, draw bool) (elogo.Outcome, elogo.Outcome) {
	if winner.ID != player1.ID && winner.ID != player2.ID {
		log.Errorf("Attempted to calculate Elo outcome between %s and %s with winner %s...", player1.Name, player2.Name, winner.Name)
	}

	rankA := player1.Elo
	rankB := player2.Elo

	var score float64 = -1

	if winner != nil {
		switch winnerId := winner.ID; winnerId {
		case player1.ID:
			score = 1
		case player2.ID:
			score = 0
		}
	} else if draw {
		score = 0.5
	}

	if score == -1 {
		log.Errorf("Calculating ELO outcomes between %s and %s with winner %s (draw: %t).  Score was still default value before returning", player1.Name, player2.Name, winner.Name, draw)
	}

	return elo.Outcome(rankA, rankB, score)
}

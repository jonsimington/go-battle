package main

import (
	elogo "github.com/kortemy/elo-go"
)

func calculateEloOutcomes(player1 Player, player2 Player, winner *Player, draw bool) (elogo.Outcome, elogo.Outcome) {
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

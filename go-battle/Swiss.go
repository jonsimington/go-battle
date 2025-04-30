package main

import (
	"math/rand"
	"sort"
)

// win = 1 pt
// draw = 0.5 pt
// loss = 0 pt

type MatchPairing struct {
	Player1 Player
	Player2 Player
}

func RandomPairing(players []Player) []MatchPairing {
	if len(players)%2 != 0 {
		log.Errorf("Cannot randomly pair an uneven number of players: %d", len(players))
	}

	numGroups := len(players) / 2
	matchedPlayers := make([]MatchPairing, numGroups)

	playersToBeMatched := players

	for len(playersToBeMatched) > 0 {

		var matchPairing MatchPairing

		playerToGrab := rand.Intn(len(playersToBeMatched))
		matchPairing.Player1 = players[playerToGrab]

		log.Infof("players length before removal: %d", len(playersToBeMatched))

		RemoveIndex(playersToBeMatched, playerToGrab)

		log.Infof("players length after removal: %d", len(playersToBeMatched))

		playerToGrab = rand.Intn(len(playersToBeMatched))
		matchPairing.Player2 = players[playerToGrab]

		RemoveIndex(playersToBeMatched, playerToGrab)
	}

	return matchedPlayers
}

func removeMatchedPlayer(players []*TournamentPlayer, i int) []*TournamentPlayer {
	ret := make([]*TournamentPlayer, 0)
	ret = append(ret, players[:i]...)
	return append(ret, players[i+1:]...)
}

func SwissPairing(tournamentPlayers []*TournamentPlayer, round int) []MatchPairing {
	matchedPlayers := make([]MatchPairing, 0)
	playersToPair := make([]*TournamentPlayer, 0)

	// Filter out any potentially nil players
	for _, tp := range tournamentPlayers {
		if tp != nil && tp.Player != nil {
			playersToPair = append(playersToPair, tp)
		}
	}

	if len(playersToPair) < 2 {
		log.Warningf("Not enough valid players to create pairings for round %d", round)
		return matchedPlayers
	}

	log.Infof("Creating pairings for round %d with %d players", round, len(playersToPair))

	if round == 1 {
		// First round pairing - players should already be sorted by Elo
		players := playersToPair
		for len(players) >= 2 {
			p1 := players[0]
			p2 := players[1]

			// Get fresh player data
			freshPlayer1 := getPlayer(int(p1.Player.ID))
			freshPlayer2 := getPlayer(int(p2.Player.ID))

			if freshPlayer1.ID != 0 && freshPlayer2.ID != 0 {
				matchPairing := MatchPairing{
					Player1: freshPlayer1,
					Player2: freshPlayer2,
				}
				matchedPlayers = append(matchedPlayers, matchPairing)
			}
			players = players[2:]
		}

		// Handle odd number of players with a bye
		if len(players) > 0 {
			log.Infof("Assigning bye to player %s for round %d", players[0].Player.Name, round)
			players[0].ByeGames = append(players[0].ByeGames, round)
			players[0].Score += 1.0
		}
	} else {
		// For round 2+, use score-based pairing
		// Sort players by score (should already be sorted but ensure it)
		sort.Slice(playersToPair, func(i, j int) bool {
			return playersToPair[i].Score > playersToPair[j].Score
		})

		players := playersToPair
		for len(players) >= 2 {
			// Try to find a valid pairing for the current top player
			p1 := players[0]
			validOpponentFound := false

			// Look for the highest-ranked player they haven't played yet
			for j := 1; j < len(players); j++ {
				p2 := players[j]
				if !hasPlayedBefore(p1, p2) {
					// Valid pairing found
					freshPlayer1 := getPlayer(int(p1.Player.ID))
					freshPlayer2 := getPlayer(int(p2.Player.ID))

					if freshPlayer1.ID != 0 && freshPlayer2.ID != 0 {
						matchPairing := MatchPairing{
							Player1: freshPlayer1,
							Player2: freshPlayer2,
						}
						matchedPlayers = append(matchedPlayers, matchPairing)

						// Remove both players from the pool
						players = append(players[:j], players[j+1:]...) // Remove p2 first
						players = players[1:]                           // Remove p1
						validOpponentFound = true
						break
					}
				}
			}

			// If no valid opponent found, give a bye
			if !validOpponentFound {
				log.Infof("No valid opponents for %s, assigning bye for round %d", p1.Player.Name, round)
				p1.ByeGames = append(p1.ByeGames, round)
				p1.Score += 1.0
				players = players[1:] // Remove p1
			}
		}

		// Handle last player if odd number
		if len(players) == 1 {
			log.Infof("Odd number of players, assigning bye to %s for round %d",
				players[0].Player.Name, round)
			players[0].ByeGames = append(players[0].ByeGames, round)
			players[0].Score += 1.0
		}
	}

	log.Infof("Created %d pairings for round %d", len(matchedPlayers), round)
	for i, pairing := range matchedPlayers {
		log.Debugf("Pairing %d: %s (ID: %d) vs %s (ID: %d)",
			i, pairing.Player1.Name, pairing.Player1.ID, pairing.Player2.Name, pairing.Player2.ID)
	}

	return matchedPlayers
}

func hasPlayedBefore(p1, p2 *TournamentPlayer) bool {
	if p1 == nil || p2 == nil || p1.Player == nil || p2.Player == nil {
		log.Warningf("Nil player reference in hasPlayedBefore check")
		return false
	}

	for _, opponent := range p1.PastOpponents {
		if opponent != nil && p2.Player != nil && opponent.ID == p2.Player.ID {
			return true
		}
	}

	// Check the reverse relationship as well
	for _, opponent := range p2.PastOpponents {
		if opponent != nil && p1.Player != nil && opponent.ID == p1.Player.ID {
			return true
		}
	}

	return false
}

func MonradPairing(players []Player, round int) []MatchPairing {
	// see https://en.wikipedia.org/wiki/Swiss-system_tournament#:~:text=seeded%20players/teams.-,Monrad%20system,-%5Bedit%5D

	return make([]MatchPairing, 0)

}

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
	IsBye   bool
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

	// Filter out any potentially nil players into a fresh copy (avoid mutating the caller's slice)
	remainingPlayers := make([]*TournamentPlayer, 0, len(tournamentPlayers))
	for _, tp := range tournamentPlayers {
		if tp != nil && tp.Player != nil {
			remainingPlayers = append(remainingPlayers, tp)
		}
	}

	if len(remainingPlayers) < 2 {
		log.Warningf("Not enough valid players to create pairings for round %d", round)
		return matchedPlayers
	}

	log.Infof("Creating pairings for round %d with %d players", round, len(remainingPlayers))

	// Sort players by score so highest scoring players play each other
	sort.Slice(remainingPlayers, func(i, j int) bool {
		return remainingPlayers[i].Score > remainingPlayers[j].Score
	})

	// Handle odd number of players: assign bye to the lowest-scoring player
	// who hasn't already received a bye in this tournament.
	if len(remainingPlayers)%2 != 0 {
		byeIdx := -1
		// Search from bottom (lowest score) up
		for i := len(remainingPlayers) - 1; i >= 0; i-- {
			if len(remainingPlayers[i].ByeGames) == 0 {
				byeIdx = i
				break
			}
		}
		// If everyone has had a bye, give it to the lowest-scoring player
		if byeIdx == -1 {
			byeIdx = len(remainingPlayers) - 1
		}

		byePlayer := remainingPlayers[byeIdx]
		log.Infof("Odd number of players, assigning bye to %s (lowest eligible) for round %d", byePlayer.Player.Name, round)
		freshPlayer := getPlayer(int(byePlayer.Player.ID))
		if freshPlayer.ID != 0 {
			matchPairing := MatchPairing{
				Player1: freshPlayer,
				IsBye:   true,
			}
			matchedPlayers = append(matchedPlayers, matchPairing)
			byePlayer.ByeGames = append(byePlayer.ByeGames, round)
			byePlayer.Score += 1.0
		}
		// Remove the bye player from the pairing pool (safe copy removal)
		remainingPlayers = append(remainingPlayers[:byeIdx], remainingPlayers[byeIdx+1:]...)
	}

	for len(remainingPlayers) > 1 {
		p1 := remainingPlayers[0]
		// Remove p1 from pool immediately (we always consume p1 in this iteration)
		remainingPlayers = remainingPlayers[1:]
		matched := false

		// First try to find opponent from same score group who hasn't been played
		for i := 0; i < len(remainingPlayers); i++ {
			p2 := remainingPlayers[i]
			if !hasPlayedBefore(p1, p2) {
				freshPlayer1 := getPlayer(int(p1.Player.ID))
				freshPlayer2 := getPlayer(int(p2.Player.ID))

				if freshPlayer1.ID != 0 && freshPlayer2.ID != 0 {
					matchPairing := MatchPairing{
						Player1: freshPlayer1,
						Player2: freshPlayer2,
					}
					matchedPlayers = append(matchedPlayers, matchPairing)

					// Remove p2 from remaining pool using safe copy
					remainingPlayers = append(remainingPlayers[:i], remainingPlayers[i+1:]...)
					matched = true
					break
				}
			}
		}

		// If no unpaired opponent found, pair with anyone
		if !matched {
			for i := 0; i < len(remainingPlayers); i++ {
				p2 := remainingPlayers[i]
				freshPlayer1 := getPlayer(int(p1.Player.ID))
				freshPlayer2 := getPlayer(int(p2.Player.ID))

				if freshPlayer1.ID != 0 && freshPlayer2.ID != 0 {
					matchPairing := MatchPairing{
						Player1: freshPlayer1,
						Player2: freshPlayer2,
					}
					matchedPlayers = append(matchedPlayers, matchPairing)

					// Remove p2 from remaining pool using safe copy
					remainingPlayers = append(remainingPlayers[:i], remainingPlayers[i+1:]...)
					matched = true
					break
				}
			}
		}

		// If still no match found (player data invalid), p1 is skipped
		if !matched {
			log.Warningf("Could not find a valid opponent for player %s in round %d", p1.Player.Name, round)
		}
	}

	log.Infof("Created %d pairings for round %d", len(matchedPlayers), round)
	for i, pairing := range matchedPlayers {
		if pairing.IsBye {
			log.Debugf("Pairing %d: %s (ID: %d) - BYE",
				i, pairing.Player1.Name, pairing.Player1.ID)
		} else {
			log.Debugf("Pairing %d: %s (ID: %d) vs %s (ID: %d)",
				i, pairing.Player1.Name, pairing.Player1.ID, pairing.Player2.Name, pairing.Player2.ID)
		}
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

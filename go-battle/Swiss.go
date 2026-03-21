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

	// Sort players by score so highest scoring players play each other
	sort.Slice(playersToPair, func(i, j int) bool {
		return playersToPair[i].Score > playersToPair[j].Score
	})

	// Create score groups - players with same scores should play each other when possible
	scoreGroups := make(map[float32][]*TournamentPlayer)
	for _, p := range playersToPair {
		scoreGroups[p.Score] = append(scoreGroups[p.Score], p)
	}

	// Process each score group from highest to lowest
	scores := make([]float32, 0)
	for score := range scoreGroups {
		scores = append(scores, score)
	}
	sort.Slice(scores, func(i, j int) bool {
		return scores[i] > scores[j]
	})

	remainingPlayers := playersToPair
	for len(remainingPlayers) > 1 { // Stop at 1 to handle odd number case separately
		p1 := remainingPlayers[0]
		matched := false

		// First try to find opponent from same score group who hasn't been played
		for i := 1; i < len(remainingPlayers); i++ {
			p2 := remainingPlayers[i]
			if !hasPlayedBefore(p1, p2) {
				// Get fresh player data
				freshPlayer1 := getPlayer(int(p1.Player.ID))
				freshPlayer2 := getPlayer(int(p2.Player.ID))

				if freshPlayer1.ID != 0 && freshPlayer2.ID != 0 {
					matchPairing := MatchPairing{
						Player1: freshPlayer1,
						Player2: freshPlayer2,
					}
					matchedPlayers = append(matchedPlayers, matchPairing)

					// Remove both players from remaining pool
					remainingPlayers = append(remainingPlayers[:i], remainingPlayers[i+1:]...)
					remainingPlayers = remainingPlayers[1:]
					matched = true
					break
				}
			}
		}

		// If no unpaired opponent found, pair with anyone
		if !matched {
			for i := 1; i < len(remainingPlayers); i++ {
				p2 := remainingPlayers[i]
				freshPlayer1 := getPlayer(int(p1.Player.ID))
				freshPlayer2 := getPlayer(int(p2.Player.ID))

				if freshPlayer1.ID != 0 && freshPlayer2.ID != 0 {
					matchPairing := MatchPairing{
						Player1: freshPlayer1,
						Player2: freshPlayer2,
					}
					matchedPlayers = append(matchedPlayers, matchPairing)

					// Remove both players from remaining pool
					remainingPlayers = append(remainingPlayers[:i], remainingPlayers[i+1:]...)
					remainingPlayers = remainingPlayers[1:]
					matched = true
					break
				}
			}
		}

		// If still no match found (shouldn't happen unless player data invalid)
		if !matched {
			remainingPlayers = remainingPlayers[1:]
		}
	}

	// Handle last player if odd number
	if len(remainingPlayers) == 1 {
		log.Infof("Odd number of players, assigning bye to %s for round %d", remainingPlayers[0].Player.Name, round)
		freshPlayer := getPlayer(int(remainingPlayers[0].Player.ID))
		if freshPlayer.ID != 0 {
			matchPairing := MatchPairing{
				Player1: freshPlayer,
				IsBye:   true,
			}
			matchedPlayers = append(matchedPlayers, matchPairing)
			remainingPlayers[0].ByeGames = append(remainingPlayers[0].ByeGames, round)
			remainingPlayers[0].Score += 1.0
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

package main

import (
	"math/rand"
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
	matchedPlayers := make([]MatchPairing, 0) // Initialize as empty slice to avoid nil issues
	var pairs = [][]*TournamentPlayer{}

	// assumption: players is sorted in Elo desc
	playersToPair := make([]*TournamentPlayer, len(tournamentPlayers))
	copy(playersToPair, tournamentPlayers)

	var winnersLastRound []*TournamentPlayer
	var losersLastRound []*TournamentPlayer

	for i := range playersToPair {
		if playersToPair[i].LastGameResult == GameResultWin {
			winnersLastRound = append(winnersLastRound, playersToPair[i])
		} else {
			losersLastRound = append(losersLastRound, playersToPair[i])
		}
	}

	if round == 1 {
		var players = append([]*TournamentPlayer{}, playersToPair...)
		for {
			if len(players) <= 1 {
				break
			}
			// handle trying to prevent playing previous opponents

			pairs = append(pairs, []*TournamentPlayer{players[0], players[1]})
			players = players[2:] // Simplified slice manipulation
		}
		if len(players) > 0 {
			log.Infof("Assigning bye to player %s for round %d", players[0].Player.Name, round)
			players[0].ByeGames = append(players[0].ByeGames, round)
		}

		log.Debugf("pairs: %v", pairs)

		for i := range pairs {
			pair := pairs[i]

			m := MatchPairing{
				Player1: *pair[0].Player,
				Player2: *pair[1].Player,
			}

			matchedPlayers = append(matchedPlayers, m)
		}
	} else {
		// Match winners against winners
		for len(winnersLastRound) > 1 {
			p1 := winnersLastRound[0]
			p2 := winnersLastRound[1]

			if !hasPlayedBefore(p1, p2) {
				setPlayersColorPreferences(*p1, *p2)

				matchPairing := MatchPairing{
					*p1.Player,
					*p2.Player,
				}

				matchedPlayers = append(matchedPlayers, matchPairing)

				winnersLastRound = winnersLastRound[2:] // Remove matched players
			} else {
				// Handle case where players have already played
				winnersLastRound = append(winnersLastRound[1:], winnersLastRound[0])
			}
		}

		if len(winnersLastRound) == 1 {
			winnersLastRound[0].ByeGames = append(winnersLastRound[0].ByeGames, round)
		}

		// Match losers against losers
		for len(losersLastRound) > 1 {
			p1 := losersLastRound[0]
			p2 := losersLastRound[1]

			if !hasPlayedBefore(p1, p2) {
				setPlayersColorPreferences(*p1, *p2)

				matchPairing := MatchPairing{
					*p1.Player,
					*p2.Player,
				}

				matchedPlayers = append(matchedPlayers, matchPairing)

				losersLastRound = losersLastRound[2:] // Remove matched players
			} else {
				// Handle case where players have already played
				losersLastRound = append(losersLastRound[1:], losersLastRound[0])
			}
		}

		if len(losersLastRound) == 1 {
			losersLastRound[0].ByeGames = append(losersLastRound[0].ByeGames, round)
		}
	}

	return matchedPlayers
}

func hasPlayedBefore(p1, p2 *TournamentPlayer) bool {
	for _, opponent := range p1.PastOpponents {
		if opponent == p2.Player {
			return true
		}
	}
	return false
}

func setPlayersColorPreferences(p1 TournamentPlayer, p2 TournamentPlayer) {
	if p1.NumGamesBlack > p1.NumGamesWhite {
		p1.ColorPreference = WhiteColor
	} else if p1.NumGamesWhite > p1.NumGamesBlack {
		p1.ColorPreference = BlackColor
	} else {
		p1.ColorPreference = rand.Intn(1)
	}
	if p2.NumGamesBlack > p2.NumGamesWhite {
		p2.ColorPreference = WhiteColor
	} else if p2.NumGamesWhite > p2.NumGamesBlack {
		p2.ColorPreference = BlackColor
	} else {
		p2.ColorPreference = rand.Intn(1)
	}
}

func MonradPairing(players []Player, round int) []MatchPairing {
	// see https://en.wikipedia.org/wiki/Swiss-system_tournament#:~:text=seeded%20players/teams.-,Monrad%20system,-%5Bedit%5D

	return make([]MatchPairing, 0)

}

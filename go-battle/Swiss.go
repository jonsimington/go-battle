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
	numGroups := len(tournamentPlayers) / 2
	matchedPlayers := make([]MatchPairing, numGroups)
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
			players = append([]*TournamentPlayer{}, players[2:]...)
		}
		if len(players) > 0 {
			log.Infof("Assigning bye to player %s for round %d", players[0].Player.Name, round)
			players[0].ByeGames = append(playersToPair[0].ByeGames, round)
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
		// if len(winnersLastRound)+len(losersLastRound) != len(playersToPair) {
		// 	log.Warnf("Did not split all playersToPair into winners, losers...")
		// }

		// unevenNumWinners := len(winnersLastRound)%2 != 0
		// unevenWinnersOffset := 0
		// unevenNumLosers := len(losersLastRound)%2 != 0
		// unevenLosersOffset := 0

		// if unevenNumWinners {
		// 	unevenWinnersOffset = 1
		// }
		// if unevenNumLosers {
		// 	unevenLosersOffset = 1
		// }

		// // match winners against winners
		// for len(winnersLastRound) != (0 + unevenWinnersOffset) {
		// 	for i := range winnersLastRound {
		// 		// don't pair players that have been paired
		// 		// if slices.Contains(playersToPair, players[i]) {
		// 		// 	continue
		// 		// }

		// 		p1 := winnersLastRound[i]
		// 		p2 := winnersLastRound[i+1]

		// 		// No player is paired against an opponent twice!
		// 		if slices.Contains(p1.PastOpponents, p2.Player) {
		// 			continue
		// 		}

		// 		// _try_ to ensure that every player plays an equal number of games as white and black (alternate colors per player per round)
		// 		// never repeat a player's color three rounds in a row
		// 		setPlayersColorPreferences(*p1, *p2)

		// 		matchPairing := MatchPairing{
		// 			*p1.Player,
		// 			*p2.Player,
		// 		}

		// 		matchedPlayers = append(matchedPlayers, matchPairing)

		// 		// remove both players (i, i+1) from playersToPair
		// 		// assumption: after the first removal, the next player to remove will be at i+1,
		// 		// but since i was removed, i+1 is now at index i
		// 		winnersLastRound = removeMatchedPlayer(winnersLastRound, i)
		// 		winnersLastRound = removeMatchedPlayer(winnersLastRound, i)
		// 	}
		// }

		// // assign bye to leftover winners
		// if len(winnersLastRound) == 1 {
		// 	winnersLastRound[0].ByeGames = append(winnersLastRound[0].ByeGames, round)
		// }

		// // match losers against losers
		// for len(losersLastRound) != (0 + unevenLosersOffset) {
		// 	for i := range losersLastRound {
		// 		// don't pair players that have been paired
		// 		// if slices.Contains(playersToPair, players[i]) {
		// 		// 	continue
		// 		// }

		// 		p1 := losersLastRound[i]
		// 		p2 := losersLastRound[i+1]

		// 		// No player is paired against an opponent twice!
		// 		if slices.Contains(p1.PastOpponents, p2.Player) {
		// 			continue
		// 		}

		// 		// _try_ to ensure that every player plays an equal number of games as white and black (alternate colors per player per round)
		// 		// never repeat a player's color three rounds in a row
		// 		setPlayersColorPreferences(*p1, *p2)

		// 		matchPairing := MatchPairing{
		// 			*p1.Player,
		// 			*p2.Player,
		// 		}

		// 		matchedPlayers = append(matchedPlayers, matchPairing)

		// 		// remove both players (i, i+1) from playersToPair
		// 		// assumption: after the first removal, the next player to remove will be at i+1,
		// 		// but since i was removed, i+1 is now at index i
		// 		losersLastRound = removeMatchedPlayer(losersLastRound, i)
		// 		losersLastRound = removeMatchedPlayer(losersLastRound, i)
		// 	}
		// }

		// // assign bye to leftover losers
		// if len(losersLastRound) == 1 {
		// 	losersLastRound[0].ByeGames = append(losersLastRound[0].ByeGames, round)
		// }
	}

	return matchedPlayers
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

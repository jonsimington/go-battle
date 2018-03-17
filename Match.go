package main

import (
	"path/filepath"
	"strconv"
	"fmt"
)

// Match represents a series of games in a Tournament
type Match struct {
	id int
	numGames int
	games []Game
	players []Player
}

// StartMatch begins a match between two players for n games
func (m Match) StartMatch() {
	player1 := m.players[0]
	player2 := m.players[1]
	
	// init players slice
	players := []Player{
		player1,
		player2,
	}
	
	var matchDir = filepath.FromSlash("tmp/" + strconv.Itoa(m.id))

	// clone each player's repo, store in tmp loc
	r1 := player1.client.CloneRepo(matchDir + "/" + player1.name)
	r2 := player2.client.CloneRepo(matchDir + "/" + player2.name)

	fmt.Println(r1.Head, r2.Head)

	// play numGames games between each player
	for i := 0; i < m.numGames; i++ {
		g := Game {
			players,
			1,
			2,
		}

		g.PlayGame()
	}
}
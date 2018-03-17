package main

// Game represents a game between two Players in a Tournament
type Game struct {
	players []Player
	winner int
	loser int
	
}

func (g Game) PlayGame() bool {
	return true
}
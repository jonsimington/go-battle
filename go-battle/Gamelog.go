package main

// GameResult represents the result of an mmai game
type GameResult struct {
	Index        int    `json:"index"`
	ID           string `json:"id"`
	Name         string `json:"name"`
	Reason       string `json:"reason"`
	Disconnected bool   `json:"disconnected"`
	TimedOut     bool   `json:"timedOut"`
}

// GamelogDelta represents the delta of an mmai Gamelog
type GamelogDelta struct {
	DeltaType string `json:"type"`
	Game      string `json:"gamez"`
}

// Gamelog represents a mmai Gamelog
type Gamelog struct {
	GameName    string            `json:"gameName"`
	GameSession string            `json:"gameSession"`
	Deltas      []GamelogDelta    `json:"deltas"`
	Constants   map[string]string `json:"constants"`
	Epoch       int               `json:"epoch"`
	RandomSeed  string            `json:"randomSeed"`
	Winners     []GameResult      `json:"winners"`
	Losers      []GameResult      `json:"losers"`
}

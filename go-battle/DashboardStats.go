package main

import (
	"encoding/json"
	"time"

	"github.com/gofiber/fiber/v2"
)

// LeaderboardEntry is a lightweight player summary for the dashboard
type LeaderboardEntry struct {
	ID         uint   `json:"id"`
	Name       string `json:"name"`
	Elo        int    `json:"elo"`
	Wins       int64  `json:"wins"`
	Losses     int64  `json:"losses"`
	Draws      int64  `json:"draws"`
	TotalGames int64  `json:"total_games"`
	EloTrend   int    `json:"elo_trend"` // delta from previous elo
}

// RecentMatch is a compact match summary
type RecentMatch struct {
	ID        uint      `json:"id"`
	Status    string    `json:"status"`
	Player1   string    `json:"player1"`
	Player1ID uint      `json:"player1_id"`
	Player2   string    `json:"player2"`
	Player2ID uint      `json:"player2_id"`
	NumGames  int       `json:"num_games"`
	Draw      bool      `json:"draw"`
	StartTime time.Time `json:"start_time"`
	EndTime   time.Time `json:"end_time"`
}

// ActiveTournamentSummary is a compact tournament overview
type ActiveTournamentSummary struct {
	ID           uint   `json:"id"`
	Name         string `json:"name"`
	Status       string `json:"status"`
	Type         string `json:"type"`
	PlayerCount  int    `json:"player_count"`
	MatchCount   int    `json:"match_count"`
	CurrentRound int    `json:"current_round"`
}

// EloBucket groups players by elo range
type EloBucket struct {
	Label string `json:"label"`
	Min   int    `json:"min"`
	Max   int    `json:"max"`
	Count int64  `json:"count"`
}

// DashboardStats is the full response for GET /stats/dashboard
type DashboardStats struct {
	// Counts
	PlayerCount     int64 `json:"player_count"`
	MatchCount      int64 `json:"match_count"`
	GameCount       int64 `json:"game_count"`
	TournamentCount int64 `json:"tournament_count"`

	// Status breakdowns
	MatchesByStatus map[string]int64 `json:"matches_by_status"`
	GamesByStatus   map[string]int64 `json:"games_by_status"`

	// Timing
	AvgMatchDurationMs float64 `json:"avg_match_duration_ms"`

	// Leaderboard (top 10 by elo)
	TopPlayers []LeaderboardEntry `json:"top_players"`

	// Recent matches (last 10)
	RecentMatches []RecentMatch `json:"recent_matches"`

	// Active / in-progress tournaments
	ActiveTournaments []ActiveTournamentSummary `json:"active_tournaments"`

	// ELO distribution buckets
	EloDistribution []EloBucket `json:"elo_distribution"`
}

func getDashboardStatsHandler(c *fiber.Ctx) error {
	stats := DashboardStats{
		MatchesByStatus: make(map[string]int64),
		GamesByStatus:   make(map[string]int64),
	}

	// --- Counts (lightweight COUNT queries) ---
	db.Model(&Player{}).Count(&stats.PlayerCount)
	db.Model(&Match{}).Count(&stats.MatchCount)
	db.Model(&Game{}).Count(&stats.GameCount)
	db.Model(&Tournament{}).Count(&stats.TournamentCount)

	// --- Match status breakdown ---
	type statusCount struct {
		Status string
		Count  int64
	}
	var matchStatuses []statusCount
	db.Model(&Match{}).
		Select("status, count(*) as count").
		Group("status").
		Scan(&matchStatuses)
	for _, s := range matchStatuses {
		if s.Status != "" {
			stats.MatchesByStatus[s.Status] = s.Count
		}
	}

	// --- Game status breakdown ---
	var gameStatuses []statusCount
	db.Model(&Game{}).
		Select("status, count(*) as count").
		Group("status").
		Scan(&gameStatuses)
	for _, s := range gameStatuses {
		if s.Status != "" {
			stats.GamesByStatus[s.Status] = s.Count
		}
	}

	// --- Average match duration (only completed matches with valid times) ---
	var avgMs *float64
	db.Model(&Match{}).
		Where("status = ? AND end_time > start_time", "Complete").
		Select("AVG(EXTRACT(EPOCH FROM (end_time - start_time)) * 1000)").
		Scan(&avgMs)
	if avgMs != nil {
		stats.AvgMatchDurationMs = *avgMs
	}

	// --- Top 10 players by ELO ---
	var topPlayers []Player
	db.Order("elo DESC").
		Limit(10).
		Preload("EloHistory").
		Find(&topPlayers)

	for _, p := range topPlayers {
		entry := LeaderboardEntry{
			ID:   p.ID,
			Name: p.Name,
			Elo:  p.Elo,
		}

		// Calculate ELO trend from history
		if len(p.EloHistory) >= 2 {
			sorted := make([]HistoricalElo, len(p.EloHistory))
			copy(sorted, p.EloHistory)
			// Find most recent two entries
			latest := sorted[0]
			prev := sorted[0]
			for _, h := range sorted {
				if h.Timestamp.After(latest.Timestamp) {
					prev = latest
					latest = h
				} else if h.Timestamp.After(prev.Timestamp) && h.ID != latest.ID {
					prev = h
				}
			}
			entry.EloTrend = latest.Elo - prev.Elo
		}

		// Count wins/losses/draws via DB for this player
		db.Model(&Game{}).Where("winner_id = ? AND status = ?", p.ID, "Complete").Count(&entry.Wins)
		db.Model(&Game{}).Where("loser_id = ? AND status = ?", p.ID, "Complete").Count(&entry.Losses)
		db.Model(&Game{}).Where("draw = ? AND status = ?", true, "Complete").
			Joins("JOIN game_players ON game_players.game_id = games.id").
			Where("game_players.player_id = ?", p.ID).
			Count(&entry.Draws)
		entry.TotalGames = entry.Wins + entry.Losses + entry.Draws

		stats.TopPlayers = append(stats.TopPlayers, entry)
	}

	// --- Recent 10 matches ---
	var recentMatches []Match
	db.Order("created_at DESC").
		Limit(10).
		Preload("Players").
		Find(&recentMatches)

	for _, m := range recentMatches {
		rm := RecentMatch{
			ID:        m.ID,
			Status:    m.Status,
			NumGames:  m.NumGames,
			Draw:      m.Draw,
			StartTime: m.StartTime,
			EndTime:   m.EndTime,
		}
		if len(m.Players) > 0 {
			rm.Player1 = m.Players[0].Name
			rm.Player1ID = m.Players[0].ID
		}
		if len(m.Players) > 1 {
			rm.Player2 = m.Players[1].Name
			rm.Player2ID = m.Players[1].ID
		}
		stats.RecentMatches = append(stats.RecentMatches, rm)
	}

	// --- Active tournaments ---
	var activeTournaments []Tournament
	db.Where("status IN ?", []string{"In Progress", "Pending"}).
		Preload("Players").
		Preload("Matches").
		Find(&activeTournaments)

	for _, t := range activeTournaments {
		summary := ActiveTournamentSummary{
			ID:          t.ID,
			Name:        t.Name,
			Status:      t.Status,
			Type:        t.Type,
			PlayerCount: len(t.Players),
			MatchCount:  len(t.Matches),
		}
		summary.CurrentRound = GetTournamentCurrentRound(db, t.ID)
		stats.ActiveTournaments = append(stats.ActiveTournaments, summary)
	}

	// --- ELO distribution ---
	eloBuckets := []EloBucket{
		{Label: "< 1200", Min: 0, Max: 1199},
		{Label: "1200–1399", Min: 1200, Max: 1399},
		{Label: "1400–1599", Min: 1400, Max: 1599},
		{Label: "1600–1799", Min: 1600, Max: 1799},
		{Label: "1800–1999", Min: 1800, Max: 1999},
		{Label: "2000+", Min: 2000, Max: 99999},
	}
	for i := range eloBuckets {
		db.Model(&Player{}).
			Where("elo >= ? AND elo <= ?", eloBuckets[i].Min, eloBuckets[i].Max).
			Count(&eloBuckets[i].Count)
	}
	stats.EloDistribution = eloBuckets

	jsonStats, err := json.Marshal(stats)
	if err != nil {
		log.Errorln("Error marshalling dashboard stats:", err)
		return c.Status(500).SendString("Internal server error")
	}

	return c.Status(200).SendString(string(jsonStats))
}

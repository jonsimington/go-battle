package main

import (
	"strconv"

	"gorm.io/gorm"
)

// Metadata is a simple key-value store for application metadata
type Metadata struct {
	gorm.Model
	MetaKey   string `json:"meta_key" gorm:"index"`
	MetaValue string `json:"meta_value"`
}

// GetMetadata retrieves a metadata entry by key
func GetMetadata(db *gorm.DB, key string) (Metadata, error) {
	var meta Metadata
	result := db.Where("meta_key = ?", key).First(&meta)
	return meta, result.Error
}

// SetMetadata sets or creates a metadata entry
func SetMetadata(db *gorm.DB, key string, value string) error {
	var meta Metadata
	result := db.Where("meta_key = ?", key).First(&meta)

	if result.Error != nil {
		// Create new metadata entry
		newMeta := Metadata{
			MetaKey:   key,
			MetaValue: value,
		}
		return db.Create(&newMeta).Error
	} else {
		// Update existing metadata
		meta.MetaValue = value
		return db.Save(&meta).Error
	}
}

// GetTournamentCurrentRound gets the current round number for a tournament
func GetTournamentCurrentRound(db *gorm.DB, tournamentID uint) int {
	metaKey := GetTournamentRoundKey(tournamentID)
	meta, err := GetMetadata(db, metaKey)
	if err != nil {
		return 1 // Default to round 1 if not found
	}
	return parseIntWithDefault(meta.MetaValue, 1)
}

// SetTournamentCurrentRound updates the current round for a tournament
func SetTournamentCurrentRound(db *gorm.DB, tournamentID uint, round int) error {
	metaKey := GetTournamentRoundKey(tournamentID)
	return SetMetadata(db, metaKey, strconv.Itoa(round))
}

// GetTournamentRoundKey generates the metadata key for a tournament round
func GetTournamentRoundKey(tournamentID uint) string {
	return "tournament:" + strconv.FormatUint(uint64(tournamentID), 10) + ":current_round"
}

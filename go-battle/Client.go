package main

import (
	"github.com/go-git/go-git/v5"
	"gorm.io/gorm"
)

// Client represents the code which is executed for a Player in a Game
type Client struct {
	repo     string
	language string
	game     string
}

// CloneRepo clones a git repo and its submodules recursively
func (c Client) CloneRepo(dir string) *git.Repository {
	r, err := git.PlainClone(dir, false, &git.CloneOptions{
		URL:               c.repo,
		RecurseSubmodules: git.DefaultSubmoduleRecursionDepth,
	})

	if err != nil {

	}

	return r
}

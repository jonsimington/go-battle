package main

import (
	"gopkg.in/src-d/go-git.v4"
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

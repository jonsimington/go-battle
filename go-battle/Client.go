package main

import (
	"sync"

	"github.com/go-git/go-git/v5"
	"gorm.io/gorm"
)

// Client represents the code which is executed for a Player in a Game
type Client struct {
	gorm.Model

	Repo     string `json:"repo"`
	Language string `json:"language"`
	Game     string `json:"game"`
}

var clientLock = &sync.Mutex{}

func insertClient(db *gorm.DB, client *Client) {
	clientLock.Lock()
	defer clientLock.Unlock()

	db.Create(client)
}

func clientExists(db *gorm.DB, repo string) bool {
	var clients []Client

	db.Where("repo=?", repo).Find(&clients)

	return len(clients) > 0
}

func getClients() []Client {
	var clients []Client

	db.Find(&clients)

	return clients
}

// CloneRepo clones a git repo and its submodules recursively
func (c Client) CloneRepo(dir string) *git.Repository {
	r, err := git.PlainClone(dir, false, &git.CloneOptions{
		URL:               c.Repo,
		RecurseSubmodules: git.DefaultSubmoduleRecursionDepth,
	})

	if err != nil {

	}

	return r
}

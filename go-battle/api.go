package main

import (
	"fmt"
	"os"
	"runtime"
	"strconv"
	"time"

	"sync"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/jonsimington/go-battle/matchmaker"
	elogo "github.com/kortemy/elo-go"
	"github.com/sirupsen/logrus"

	. "github.com/Nomon/gonfig"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Create a new instance of the logger. You can have any number of instances.
var log = logrus.New()
var conf = NewConfig(nil)
var wg sync.WaitGroup
var db *gorm.DB

var elo = elogo.NewElo()

func checkErr(err error) {
	if err != nil {
		panic(err)
	}
}

func init() {
	log.Out = os.Stdout
	log.Level = logrus.DebugLevel

	conf.Use("local", NewJsonConfig("./config.json"))

	log.Infof("Running with GOMAXPROCS = %d", runtime.NumCPU())

	runtime.GOMAXPROCS(runtime.NumCPU())

	wg.Add(1)

	// INIT DB
	dbHost := conf.Get("DB_HOST")
	dbPort, _ := strconv.Atoi(conf.Get("DB_PORT"))
	dbUser := conf.Get("DB_USER")
	dbPass := conf.Get("DB_PASS")
	dbName := conf.Get("DB_NAME")

	dsn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
		dbHost, dbPort, dbUser, dbPass, dbName)

	var err error
	db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})

	checkErr(err)

	db.AutoMigrate(
		&GameClient{},
		&GameStatus{},
		&Client{},
		&Game{},
		&Player{},
		&Match{},
		&Session{},
		&Tournament{},
		&HistoricalElo{},
	)

	if dbEmpty() {
		FillDbWithTestData()
	}

	wg.Done()

	// wait until DB is initialized before continuing
	wg.Wait()
}

func main() {
	app := fiber.New()

	app.Use(cors.New(cors.Config{
		AllowHeaders:     "Origin, Content-Type, Accept, Content-Length, Accept-Language, Accept-Encoding, Connection, Access-Control-Allow-Origin",
		AllowOrigins:     conf.Get("ALLOWED_ORIGINS"),
		AllowCredentials: true,
		AllowMethods:     "GET,POST,HEAD,PUT,DELETE,PATCH,OPTIONS",
	}))

	app.Post("/clients", postClientsHandler)
	app.Get("/clients", getClientsHandler)

	app.Post("/players", postPlayersHandler)
	app.Get("/players", getPlayersHandler)

	app.Post("/games", postGamesHandler)
	app.Get("/games", getGamesHandler)

	app.Post("/matches", postMatchesHandler)
	app.Delete("/matches", deleteMatchesHandler)
	app.Post("/matches/start", startMatchHandler)
	app.Get("/matches", getMatchesHandler)
	app.Post("/matches/random", randomMatchHandler)

	app.Post("/tournaments", postTournamentsHandler)
	app.Get("/tournaments", getTournamentsHandler)

	matchmakerPeriod := 20 * time.Minute
	log.Infof("Starting matchmaker with random games every %v", matchmakerPeriod)
	go matchmaker.StartRandomMatch(matchmakerPeriod)

	app.Listen(":3000")
}

func FillDbWithTestData() {
	log.Infoln("Filling DB with test data")

	cravenCataloupeClient := Client{
		Repo:     "https://github.com/jonsimington/craven-cantaloupe",
		Language: "py",
		Game:     "chess",
	}
	madCherimoyaClient := Client{
		Repo:     "https://github.com/jonsimington/mad-cherimoya",
		Language: "py",
		Game:     "chess",
	}
	roundDurianClient := Client{
		Repo:     "https://github.com/jonsimington/round-durian",
		Language: "py",
		Game:     "chess",
	}
	gabbyMuskmelonClient := Client{
		Repo:     "https://github.com/jonsimington/gabby-muskmelon",
		Language: "py",
		Game:     "chess",
	}
	scientificLemonClient := Client{
		Repo:     "https://github.com/jonsimington/scientific-lemon",
		Language: "py",
		Game:     "chess",
	}
	animatedCoconutClient := Client{
		Repo:     "https://github.com/jonsimington/animated-coconut",
		Language: "py",
		Game:     "chess",
	}
	chubbyStrawberryClient := Client{
		Repo:     "https://github.com/jonsimington/chubby-strawberry",
		Language: "py",
		Game:     "chess",
	}
	expensiveGooseberryClient := Client{
		Repo:     "https://github.com/jonsimington/expensive-gooseberry",
		Language: "py",
		Game:     "chess",
	}
	vanBurenBoysClient := Client{
		Repo:     "https://github.com/jonsimington/the-van-buren-boys",
		Language: "js",
		Game:     "chess",
	}
	vanBurenBoyzClient := Client{
		Repo:     "https://github.com/jonsimington/the-van-buren-boyz",
		Language: "js",
		Game:     "chess",
	}
	randomValidMovesClient := Client{
		Repo:     "https://github.com/jonsimington/random-valid-moves",
		Language: "js",
		Game:     "chess",
	}

	insertClient(db, &cravenCataloupeClient)
	insertClient(db, &madCherimoyaClient)
	insertClient(db, &roundDurianClient)
	insertClient(db, &gabbyMuskmelonClient)
	insertClient(db, &scientificLemonClient)
	insertClient(db, &animatedCoconutClient)
	insertClient(db, &chubbyStrawberryClient)
	insertClient(db, &expensiveGooseberryClient)
	insertClient(db, &vanBurenBoysClient)
	insertClient(db, &vanBurenBoyzClient)
	insertClient(db, &randomValidMovesClient)

	cravenCataloupePlayer := Player{
		Name:   "Craven Cantaloupe",
		Client: cravenCataloupeClient,
	}
	madCherimoyaPlayer := Player{
		Name:   "Mad Cherimoya",
		Client: madCherimoyaClient,
	}
	roundDurianPlayer := Player{
		Name:   "Round Durian",
		Client: roundDurianClient,
	}
	gabbyMuskmelonPlayer := Player{
		Name:   "Gabby Muskmelon",
		Client: gabbyMuskmelonClient,
	}
	scientificLemonPlayer := Player{
		Name:   "Scientific Lemon",
		Client: scientificLemonClient,
	}
	animatedCoconutPlayer := Player{
		Name:   "Animated Coconut",
		Client: animatedCoconutClient,
	}
	chubbyStrawberryPlayer := Player{
		Name:   "Chubby Strawberry",
		Client: chubbyStrawberryClient,
	}
	expensiveGooseberryPlayer := Player{
		Name:   "Expensive Gooseberry",
		Client: expensiveGooseberryClient,
	}
	vanBurenBoysPlayer := Player{
		Name:   "The Van Buren Boys",
		Client: vanBurenBoysClient,
	}
	vanBurenBoyzPlayer := Player{
		Name:   "The Van Buren Boyz",
		Client: vanBurenBoyzClient,
	}
	randomValidMovesPlayer := Player{
		Name:   "Random Valid Moves",
		Client: randomValidMovesClient,
	}

	insertPlayer(db, &cravenCataloupePlayer)
	insertPlayer(db, &madCherimoyaPlayer)
	insertPlayer(db, &roundDurianPlayer)
	insertPlayer(db, &gabbyMuskmelonPlayer)
	insertPlayer(db, &scientificLemonPlayer)
	insertPlayer(db, &animatedCoconutPlayer)
	insertPlayer(db, &chubbyStrawberryPlayer)
	insertPlayer(db, &expensiveGooseberryPlayer)
	insertPlayer(db, &vanBurenBoysPlayer)
	insertPlayer(db, &vanBurenBoyzPlayer)
	insertPlayer(db, &randomValidMovesPlayer)
}

func dbEmpty() bool {
	var numPlayers int64 = 0
	var numClients int64 = 0
	var numGames int64 = 0
	var numMatches int64 = 0
	var numTournaments int64 = 0

	db.Model(&Player{}).Count(&numPlayers)
	db.Model(&Client{}).Count(&numClients)
	db.Model(&Game{}).Count(&numGames)
	db.Model(&Match{}).Count(&numMatches)
	db.Model(&Tournament{}).Count(&numTournaments)

	log.Infof("# players: %d", numPlayers)
	log.Infof("# clients: %d", numClients)
	log.Infof("# games: %d", numGames)
	log.Infof("# matches: %d", numMatches)
	log.Infof("# tournaments: %d", numTournaments)

	return numPlayers == 0 && numClients == 0 && numGames == 0 && numMatches == 0 && numTournaments == 0
}

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

	processorsToUse := runtime.NumCPU() - 1
	log.Infof("Running with GOMAXPROCS = %d", processorsToUse)
	runtime.GOMAXPROCS(processorsToUse)

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
	app.Post("/tournaments/start", startTournamentsHandler)

	matchmakerPeriod := 5 * time.Minute
	log.Infof("Starting matchmaker with random games every %v", matchmakerPeriod)
	go matchmaker.StartRandomMatch(matchmakerPeriod)

	app.Listen(":3000")
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

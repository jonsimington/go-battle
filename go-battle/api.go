package main

import (
	"fmt"
	"os"
	"runtime"
	"strconv"

	"sync"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
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

func checkErr(err error) {
	if err != nil {
		panic(err)
	}
}

func init() {
	log.Out = os.Stdout
	log.Level = logrus.DebugLevel

	conf.Use("local", NewJsonConfig("./config.json"))

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
		&SessionID{},
		&GameClient{},
		&GameStatus{},
		&Client{},
		&Game{},
		&Player{},
		&Match{},
	)

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
	app.Post("/matches/start", startMatchHandler)
	app.Get("/matches", getMatchesHandler)

	app.Listen(":3000")
}

func createGame() {
	// p1 := Player{
	// 	"jon",
	// 	Client{
	// 		"https://github.com/brianwgoldman/megaminerai-19-stumped",
	// 		"py",
	// 		"Stumped",
	// 	},
	// }

	// p2 := Player{
	// 	"adam",
	// 	Client{
	// 		"https://github.com/brianwgoldman/megaminerai-19-stumped",
	// 		"py",
	// 		"Stumped",
	// 	},
	// }

	// m := Match{
	// 	getCurrentMatchID(db),
	// 	7,
	// 	[]Game{},
	// 	[]Player{
	// 		p1,
	// 		p2,
	// 	},
	// }

	// m.StartMatch(db)
}

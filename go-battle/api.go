package main

import (
	"fmt"
	"os"
	"runtime"
	"strconv"

	"sync"

	"github.com/gofiber/fiber/v2"
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

	log.Debugln(dsn)

	var err error
	db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})

	checkErr(err)

	db.AutoMigrate(
		&SessionID{},
		&MatchID{},
		&GameClient{},
		&GameStatus{},
		&Client{},
	)

	wg.Done()

	// wait until DB is initialized before continuing
	wg.Wait()
}

func main() {
	app := fiber.New()

	app.Get("/", func(c *fiber.Ctx) error {
		return c.SendString("Hello, World!")
	})

	app.Post("/games", func(c *fiber.Ctx) error {
		gameId := c.Query("game_id")

		return c.SendString(fmt.Sprintf("Created game with id %s!", gameId))
	})

	app.Get("/games", func(c *fiber.Ctx) error {
		return c.SendString("Here are the games!")
	})

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

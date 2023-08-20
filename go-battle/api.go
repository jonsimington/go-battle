package main

import (
	"fmt"

	"sync"

	"github.com/gofiber/fiber/v2"
	"github.com/sirupsen/logrus"

	. "github.com/Nomon/gonfig"
	"github.com/jinzhu/gorm"
	_ "github.com/jinzhu/gorm/dialects/postgres"
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
	// log.Out = os.Stdout
	// log.Level = logrus.DebugLevel

	// conf.Use("local", NewJsonConfig("../config.json"))

	// runtime.GOMAXPROCS(runtime.NumCPU())

	// wg.Add(1)

	// // INIT DB
	// dbHost := conf.Get("DB_HOST")
	// dbPort, _ := strconv.Atoi(conf.Get("DB_PORT"))
	// dbUser := conf.Get("DB_USER")
	// dbPass := conf.Get("DB_PASS")
	// dbName := conf.Get("DB_NAME")
	// dbType := conf.Get("DB_TYPE")

	// dbInfo := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
	// 	dbHost, dbPort, dbUser, dbPass, dbName)

	// db, err := gorm.Open(dbType, dbInfo)

	// checkErr(err)

	// defer db.Close()

	// // db.AutoMigrate(&SessionID{}, &MatchID{}, &GameClient{}, &GameStatus{})

	// wg.Done()

	// // wait until DB is initialized before continuing
	// wg.Wait()
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

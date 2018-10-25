package main

import (
	"fmt"
	"os" //"log"
	"runtime"
	"strconv"
	"sync"

	. "github.com/Nomon/gonfig"
	"github.com/jinzhu/gorm"
	_ "github.com/jinzhu/gorm/dialects/postgres"
	"github.com/sirupsen/logrus"
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

func main() {
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
	dbType := conf.Get("DB_TYPE")

	dbInfo := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
		dbHost, dbPort, dbUser, dbPass, dbName)

	db, err := gorm.Open(dbType, dbInfo)

	checkErr(err)

	defer db.Close()

	db.AutoMigrate(&SessionID{}, &MatchID{})

	wg.Done()

	// wait until DB is initialized before continuing
	wg.Wait()

	p1 := Player{
		"jon",
		Client{
			"https://github.com/brianwgoldman/megaminerai-19-stumped",
			"py",
			"Stumped",
		},
	}

	p2 := Player{
		"adam",
		Client{
			"https://github.com/brianwgoldman/megaminerai-19-stumped",
			"py",
			"Stumped",
		},
	}

	m := Match{
		getCurrentMatchID(db),
		7,
		[]Game{},
		[]Player{
			p1,
			p2,
		},
	}

	m.StartMatch(db)
	fmt.Println("EXITING")
}

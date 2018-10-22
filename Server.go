package main

import (
	"fmt"
	"os" //"log"
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

	//runtime.GOMAXPROCS(runtime.NumCPU())

	wg.Add(1)

	DB_HOST := conf.Get("DB_HOST")
	DB_PORT, _ := strconv.Atoi(conf.Get("DB_PORT"))
	DB_USER := conf.Get("DB_USER")
	DB_NAME := conf.Get("DB_NAME")

	dbinfo := fmt.Sprintf("host=%s port=%d user=%s "+
		"dbname=%s sslmode=disable",
		DB_HOST, DB_PORT, DB_USER, DB_NAME)

	db, err := gorm.Open("postgres", dbinfo)

	checkErr(err)

	defer db.Close()

	db.AutoMigrate(&SessionID{}, &MatchID{})

	fmt.Println("Session: " + strconv.Itoa(getCurrentSessionID(db)))

	wg.Done()

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

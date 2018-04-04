package main

import (
	"fmt"
	"html"
	"os"
	"strings"
	//"log"
	"net/http"

	. "github.com/Nomon/gonfig"
	"github.com/jinzhu/gorm"
	"github.com/sirupsen/logrus"
	//"github.com/gorilla/mux"
)

// Create a new instance of the logger. You can have any number of instances.
var log = logrus.New()

var conf = NewConfig(nil)

func main() {
	log.Out = os.Stdout
	log.Level = logrus.DebugLevel

	conf.Use("local", NewJsonConfig("./config.json"))

	//runtime.GOMAXPROCS(runtime.NumCPU())

	initDB()

	//router := mux.NewRouter().StrictSlash(true)

	//router.HandleFunc("/", Index)

	//log.Fatal(http.ListenAndServe(":8080", router))

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
		getCurrentMatchID(),
		7,
		[]Game{},
		[]Player{
			p1,
			p2,
		},
	}

	m.StartMatch()
	fmt.Println("EXITING")
}

func Index(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Hello, %q", html.EscapeString(r.URL.Path))

}

func initDB() {
	dbNames := []string{
		conf.Get("sessionDBName"),
		conf.Get("matchDBName"),
	}

	for _, dbName := range dbNames {
		go func(dbName string) {
			if _, err := os.Stat(dbName); os.IsNotExist(err) {
				var dbType = conf.Get("dbType")

				db, _ := gorm.Open(dbType, dbName)
				defer db.Close()

				if strings.Contains(dbName, "session") {
					db.CreateTable(&Session{})

					var initialSession = Session{ID: 1}
					db.Create(&initialSession)
				}
				if strings.Contains(dbName, "match") {
					db.CreateTable(&MatchID{})
					var initialMatchID = MatchID{ID: 1}
					db.Create(&initialMatchID)
				}
			}
		}(dbName)
	}

}

type Session struct {
	ID int `sql:"AUTO_INCREMENT" gorm:"primary_key"`
}
type MatchID struct {
	ID int `sql:"AUTO_INCREMENT" gorm:"primary_key"`
}

package main

import (
	"fmt"
	"html"
	"os"
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

	initDB()

	//router := mux.NewRouter().StrictSlash(true)

	//router.HandleFunc("/", Index)

	//log.Fatal(http.ListenAndServe(":8080", router))

	p1 := Player{
		"jon",
		Client{
			"/Users/jonsimington/Desktop/dablord",
			"js",
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
		1,
		2,
		[]Game{},
		[]Player{
			p1,
			p2,
		},
	}

	m.StartMatch()
}

func Index(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Hello, %q", html.EscapeString(r.URL.Path))

}

func initDB() {
	var sessionDBName = conf.Get("sessionDBName")
	if _, err := os.Stat(sessionDBName); os.IsNotExist(err) {
		var dbType = conf.Get("dbType")
		var dbName = conf.Get("sessionDBName")
		db, _ := gorm.Open(dbType, dbName)

		db.CreateTable(&Session{})

		var initialSession = Session{ID: 1}
		db.Create(&initialSession)

		defer db.Close()
	}
}

type Session struct {
	ID int `sql:"AUTO_INCREMENT" gorm:"primary_key"`
}

package main

import (
	"fmt"
	"html"
	//"log"
	"net/http"
	//"github.com/gorilla/mux"
)

func main() {
	//router := mux.NewRouter().StrictSlash(true)

	//router.HandleFunc("/", Index)

	//log.Fatal(http.ListenAndServe(":8080", router))

	p1 := Player {
		"jon",
		Client {
			"https://github.com/src-d/go-git",
			"python",
		},
	}

	p2 := Player {
		"adam",
		Client {
			"https://github.com/jonsimington/clockwork.pw",
			"python",
		},
	}

	m := Match {
		1,
		2,
		[]Game{},
		[]Player {
			p1,
			p2,
		},
	}

	m.StartMatch()
}

func Index(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Hello, %q", html.EscapeString(r.URL.Path))

}
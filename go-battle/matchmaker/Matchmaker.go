package matchmaker

import (
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/sirupsen/logrus"
)

var log = logrus.New()

func init() {
	log.Out = os.Stdout
	log.Level = logrus.DebugLevel
}

func StartRandomMatch(period time.Duration) {
	nextTime := time.Now().Add(period)
	time.Sleep(time.Until(nextTime))

	apiUrl := fmt.Sprintf("%s/matches/random", "http://localhost:3000")

	_, err := http.Post(apiUrl, "application/json", nil)
	if err != nil {
		log.Errorf("error making http request: %s\n", err)
	}

	go StartRandomMatch(period)
}

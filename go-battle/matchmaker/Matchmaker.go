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

func StartRandomMatch(period time.Duration, token string) {
	nextTime := time.Now().Add(period)
	time.Sleep(time.Until(nextTime))

	apiUrl := fmt.Sprintf("%s/matches/random", "http://localhost:3000")

	req, err := http.NewRequest(http.MethodPost, apiUrl, nil)
	if err != nil {
		log.Errorf("error creating http request: %s\n", err)
	} else {
		req.Header.Set("Authorization", "Bearer "+token)
		client := &http.Client{}
		_, err = client.Do(req)
		if err != nil {
			log.Errorf("error making http request: %s\n", err)
		}
	}

	go StartRandomMatch(period, token)
}

package matchmaker

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/sirupsen/logrus"
)

var log = logrus.New()

func init() {
	log.Out = os.Stdout
	log.Level = logrus.DebugLevel
	log.SetFormatter(&logrus.TextFormatter{
		FullTimestamp: true,
	})
}

// StartRankedMatch periodically triggers a ranked match between two randomly selected
// players. The API will reject the pairing if their ELO ratings are too far apart.
// It calls the /matches/ranked API endpoint.
func StartRankedMatch(period time.Duration, token string) {
	nextTime := time.Now().Add(period)
	log.Infof("Matchmaker: next ranked pairing scheduled at %s (in %.0f minutes)",
		nextTime.Format(time.RFC3339), period.Minutes())
	time.Sleep(time.Until(nextTime))

	apiUrl := fmt.Sprintf("%s/matches/ranked", "http://localhost:3000")

	req, err := http.NewRequest(http.MethodPost, apiUrl, nil)
	if err != nil {
		log.Errorf("Matchmaker: failed to build HTTP request: %v", err)
	} else {
		req.Header.Set("Authorization", "Bearer "+token)
		client := &http.Client{Timeout: 30 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			log.Errorf("Matchmaker: HTTP request to %s failed: %v", apiUrl, err)
		} else {
			defer resp.Body.Close()
			body, _ := io.ReadAll(resp.Body)
			if resp.StatusCode >= 200 && resp.StatusCode < 300 {
				log.Infof("Matchmaker: ranked match started [HTTP %d] — %s", resp.StatusCode, string(body))
			} else {
				log.Errorf("Matchmaker: ranked match request rejected [HTTP %d] — %s", resp.StatusCode, string(body))
			}
		}
	}

	go StartRankedMatch(period, token)
}

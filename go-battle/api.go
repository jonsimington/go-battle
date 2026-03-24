package main

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"time"

	"sync"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"

	"github.com/jonsimington/go-battle/matchmaker"
	elogo "github.com/kortemy/elo-go"
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

var elo = elogo.NewElo()

func checkErr(err error) {
	if err != nil {
		panic(err)
	}
}

func initLogs() {
	logsDir := "logs"
	if err := os.MkdirAll(logsDir, 0755); err != nil {
		fmt.Printf("Error creating logs directory: %v\n", err)
	}

	timestamp := time.Now().Format("2006-01-02_15-04-05")
	logFilePath := filepath.Join(logsDir, fmt.Sprintf("go-battle-%s.log", timestamp))
	logFile, err := os.OpenFile(logFilePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		fmt.Printf("Error opening log file: %v\n", err)
	}

	multiWriter := io.MultiWriter(os.Stdout, logFile)

	log.SetOutput(multiWriter)
	log.SetLevel(logrus.DebugLevel)
	log.Infof("Logging initialized. Logs will be written to console and %s", logFilePath)
}

func initDB() {
	dbHost := conf.Get("DB_HOST")
	dbPort, _ := strconv.Atoi(conf.Get("DB_PORT"))
	dbUser := conf.Get("DB_USER")
	dbPass := conf.Get("DB_PASS")
	dbName := conf.Get("DB_NAME")

	dsn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
		dbHost, dbPort, dbUser, dbPass, dbName)

	var err error
	db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})

	checkErr(err)

	db.AutoMigrate(
		&GameClient{},
		&GameStatus{},
		&Client{},
		&Game{},
		&Player{},
		&Match{},
		&Session{},
		&Tournament{},
		&HistoricalElo{},
		&Metadata{},
		&User{},
	)

	initJWTSecret()

	if dbEmpty() {
		FillDbWithTestData()
	}
}

func init() {
	initLogs()

	conf.Use("local", NewJsonConfig("./config.json"))

	processorsToUse := runtime.NumCPU() - 1
	log.Infof("Running with GOMAXPROCS = %d", processorsToUse)
	runtime.GOMAXPROCS(processorsToUse)

	wg.Add(1)
	initDB()
	wg.Done()

	// wait until DB is initialized before continuing
	wg.Wait()
}

func main() {
	app := fiber.New()

	app.Use(cors.New(cors.Config{
		AllowHeaders: "Origin, Content-Type, Accept, Content-Length, Accept-Language, Accept-Encoding, Connection, Access-Control-Allow-Origin, Authorization",
		AllowOrigins: conf.Get("ALLOWED_ORIGINS"),
		AllowMethods: "GET,POST,HEAD,PUT,DELETE,PATCH,OPTIONS",
	}))

	// Auth routes (public)
	app.Post("/auth/register", registerHandler)
	app.Post("/auth/login", loginHandler)
	app.Get("/auth/me", RequireAuth(), meHandler)

	// Public GET routes - anyone can view
	app.Get("/clients", getClientsHandler)
	app.Get("/players", getPlayersHandler)
	app.Get("/games", getGamesHandler)
	app.Get("/matches", getMatchesHandler)
	app.Get("/tournaments", getTournamentsHandler)
	app.Get("/stats/dashboard", getDashboardStatsHandler)

	// Admin-only write routes
	admin := app.Group("", RequireAuth(), RequireAdmin())

	admin.Post("/clients", postClientsHandler)

	admin.Post("/players", postPlayersHandler)

	admin.Post("/games", postGamesHandler)
	admin.Delete("/games", deleteGamesHandler)
	admin.Post("/games/stop", stopGameHandler)
	admin.Post("/games/restart", restartGameHandler)

	admin.Post("/matches", postMatchesHandler)
	admin.Delete("/matches", deleteMatchesHandler)
	admin.Post("/matches/start", startMatchHandler)
	admin.Post("/matches/stop", stopMatchHandler)
	admin.Post("/matches/restart", restartMatchHandler)
	admin.Post("/matches/random", randomMatchHandler)

	admin.Post("/tournaments", postTournamentsHandler)
	admin.Post("/tournaments/start", startTournamentsHandler)
	admin.Delete("/tournaments", deleteTournamentsHandler)

	log.Infof("Initializing tournament controller")
	InitializeTournamentController(db)

	matchmakerPeriod := 5 * time.Minute
	log.Infof("Starting matchmaker with random games every %v", matchmakerPeriod)
	serviceUser := &User{Username: "matchmaker-service", Role: RoleAdmin}
	serviceToken, err := generateToken(serviceUser)
	if err != nil {
		log.Fatalf("failed to generate matchmaker service token: %v", err)
	}
	go matchmaker.StartRandomMatch(matchmakerPeriod, serviceToken)

	app.Listen(":3000")
}

func dbEmpty() bool {
	var numPlayers int64 = 0
	var numClients int64 = 0
	var numGames int64 = 0
	var numMatches int64 = 0
	var numTournaments int64 = 0

	db.Model(&Player{}).Count(&numPlayers)
	db.Model(&Client{}).Count(&numClients)
	db.Model(&Game{}).Count(&numGames)
	db.Model(&Match{}).Count(&numMatches)
	db.Model(&Tournament{}).Count(&numTournaments)

	log.Infof("# players: %d", numPlayers)
	log.Infof("# clients: %d", numClients)
	log.Infof("# games: %d", numGames)
	log.Infof("# matches: %d", numMatches)
	log.Infof("# tournaments: %d", numTournaments)

	return numPlayers == 0 && numClients == 0 && numGames == 0 && numMatches == 0 && numTournaments == 0
}

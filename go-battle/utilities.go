package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"math"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"sync"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// parseIntWithDefault converts a string to int with a fallback default value
func parseIntWithDefault(value string, defaultValue int) int {
	if value == "" {
		return defaultValue
	}

	intValue, err := strconv.Atoi(value)
	if err != nil {
		return defaultValue
	}

	return intValue
}

func sliceAtoi(sa []string) ([]int, error) {
	si := make([]int, 0, len(sa))
	for _, a := range sa {
		i, err := strconv.Atoi(a)
		if err != nil {
			return si, err
		}
		si = append(si, i)
	}
	return si, nil
}

func map2[T, U any](data []T, f func(T) U) []U {
	res := make([]U, 0, len(data))

	for _, e := range data {
		res = append(res, f(e))
	}

	return res
}

func getJSON(url string, target interface{}) error {
	r, err := _httpClient.Get(url)
	if err != nil {
		return err
	}
	defer r.Body.Close()

	var _json = json.NewDecoder(r.Body).Decode(target)
	if _json != nil {
		fmt.Println(_json)
	}

	return _json
}

func checkIfCommandExistsOnHost(commandName string) bool {
	cmd := exec.Command(commandName)

	err := cmd.Run()

	if err != nil {
		log.Infof("Command `%s` exists?: %v", commandName, !strings.Contains(err.Error(), "executable file not found"))

		if strings.Contains(err.Error(), "executable file not found") {
			return false
		}
	}

	return true
}

func checkPythonVersionOnHost(pythonCommandName string) int {
	cmd := exec.Command(pythonCommandName, "--version")

	// capture output of command
	var outb, errb bytes.Buffer
	cmd.Stdout = &outb
	cmd.Stderr = &errb

	err := cmd.Run()
	checkErr(err)

	// trim newline from stderr output
	cmdOutput := strings.TrimRightFunc(errb.String(), func(c rune) bool {
		return c == '\r' || c == '\n'
	})

	// Python version format is: `Python x.y.z` so capture those version numbers via regex
	re := regexp.MustCompile("^Python (.*?)\\.(.*?)\\.(.*?)")

	match := re.FindStringSubmatch(cmdOutput)

	if len(match) < 2 {
		log.Errorf("Failed to parse Python version from output: %s", cmdOutput)
		return 0
	}

	hostPythonVersionStr := match[1]

	// try to convert parsed version into an int
	hostPythonVersion, err := strconv.Atoi(hostPythonVersionStr)
	checkErr(err)

	return hostPythonVersion
}

// ---------------------------------------------------------------------------
// Shared helpers to reduce repetition across handlers and model files
// ---------------------------------------------------------------------------

// parseIntIDList parses a comma-separated string of ints (e.g. "1, 2, 3") into []int.
// Returns nil on empty input.
func parseIntIDList(csv string) []int {
	if csv == "" {
		return nil
	}
	ids, _ := sliceAtoi(map2(strings.Split(csv, ","), func(s string) string {
		return strings.ReplaceAll(s, " ", "")
	}))
	return ids
}

// requireIntParam reads a query parameter and converts it to int.
// Returns a 400 error response if the parameter is missing or not an integer.
func requireIntParam(c *fiber.Ctx, name string) (int, error) {
	raw := c.Query(name)
	if raw == "" {
		return 0, c.Status(400).SendString(fmt.Sprintf("The `%s` query param value must be provided", name))
	}
	val, err := strconv.Atoi(raw)
	if err != nil {
		return 0, c.Status(400).SendString(fmt.Sprintf("`%s` query parameter must be an integer", name))
	}
	return val, nil
}

// sendJSON marshals data to JSON and writes it as the response body.
func sendJSON(c *fiber.Ctx, data interface{}) error {
	jsonBytes, err := json.Marshal(data)
	if err != nil {
		log.Errorf("Error marshalling JSON response: %s", err)
		return c.Status(500).SendString("Internal server error")
	}
	c.Set("Content-Type", "application/json")
	return c.Status(200).SendString(string(jsonBytes))
}

// sendPaginatedJSON builds a PaginatedResponse and writes it as JSON.
func sendPaginatedJSON(c *fiber.Ctx, data interface{}, page, pageSize int, totalCount int64) error {
	response := PaginatedResponse{
		Data:       data,
		Page:       page,
		PageSize:   pageSize,
		TotalCount: totalCount,
		TotalPages: int(math.Ceil(float64(totalCount) / float64(pageSize))),
	}
	return sendJSON(c, response)
}

// updateEntityField is a generic helper that locks a mutex, fetches an entity
// by ID, applies an update function, and saves. This eliminates the repeated
// lock → fetch → mutate → save pattern across Game, Match, Tournament, Player.
func updateEntityField[T any](db *gorm.DB, mu *sync.Mutex, id uint, applyFn func(*T)) {
	mu.Lock()
	defer mu.Unlock()

	var entity T
	db.Where("id = ?", id).First(&entity)
	applyFn(&entity)
	db.Save(&entity)
}

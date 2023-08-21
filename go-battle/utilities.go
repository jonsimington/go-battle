package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
)

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

	return err == nil
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

	hostPythonVersionStr := match[1]

	// try to convert parsed version into an int
	hostPythonVersion, err := strconv.Atoi(hostPythonVersionStr)
	checkErr(err)

	return hostPythonVersion
}

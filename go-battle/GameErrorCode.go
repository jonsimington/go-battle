package main

import (
	"fmt"
	"regexp"
	"strconv"
)

type GameErrorCode int

const (
	NONE                      GameErrorCode = 0
	INVALID_ARGS              GameErrorCode = 20
	COULD_NOT_CONNECT         GameErrorCode = 21
	DISCONNECTED_UNEXPECTEDLY GameErrorCode = 22
	CANNOT_READ_SOCKET        GameErrorCode = 23
	DELTA_MERGE_FAILURE       GameErrorCode = 24
	REFLECTION_FAILED         GameErrorCode = 25
	UNKNOWN_EVENT_FROM_SERVER GameErrorCode = 26
	SERVER_TIMEOUT            GameErrorCode = 27
	FATAL_EVENT               GameErrorCode = 28
	GAME_NOT_FOUND            GameErrorCode = 29
	MALFORMED_JSON            GameErrorCode = 30
	UNAUTHENTICATED           GameErrorCode = 31
	AI_ERRORED                GameErrorCode = 42
)

func GetGameErrorCode(s string) (GameErrorCode, error) {
	re := regexp.MustCompile(`\d+`)

	match := re.FindString(s)

	if match == "" {
		return 0, fmt.Errorf("No int error code found in string '%s'", s)
	}

	i, convertErr := strconv.Atoi(match)

	if convertErr != nil {
		return 0, fmt.Errorf("Error parsing integer '%s': %s", match, convertErr)
	}

	switch i {
	case 0:
		return NONE, nil
	case 20:
		return INVALID_ARGS, nil
	case 21:
		return COULD_NOT_CONNECT, nil
	case 22:
		return DISCONNECTED_UNEXPECTEDLY, nil
	case 23:
		return CANNOT_READ_SOCKET, nil
	case 24:
		return DELTA_MERGE_FAILURE, nil
	case 25:
		return REFLECTION_FAILED, nil
	case 26:
		return UNKNOWN_EVENT_FROM_SERVER, nil
	case 27:
		return SERVER_TIMEOUT, nil
	case 28:
		return FATAL_EVENT, nil
	case 29:
		return GAME_NOT_FOUND, nil
	case 30:
		return MALFORMED_JSON, nil
	case 31:
		return UNAUTHENTICATED, nil
	case 42:
		return AI_ERRORED, nil
	default:
		return 0, fmt.Errorf("%d is not a valid value for GameErrorCode", i)
	}
}

func (code GameErrorCode) String() string {
	switch code {
	case NONE:
		return "NONE"
	case INVALID_ARGS:
		return "INVALID_ARGS"
	case COULD_NOT_CONNECT:
		return "COULD_NOT_CONNECT"
	case DISCONNECTED_UNEXPECTEDLY:
		return "DISCONNECTED_UNEXPECTEDLY"
	case CANNOT_READ_SOCKET:
		return "CANNOT_READ_SOCKET"
	case DELTA_MERGE_FAILURE:
		return "DELTA_MERGE_FAILURE"
	case REFLECTION_FAILED:
		return "REFLECTION_FAILED"
	case UNKNOWN_EVENT_FROM_SERVER:
		return "UNKNOWN_EVENT_FROM_SERVER"
	case SERVER_TIMEOUT:
		return "SERVER_TIMEOUT"
	case FATAL_EVENT:
		return "FATAL_EVENT"
	case GAME_NOT_FOUND:
		return "GAME_NOT_FOUND"
	case MALFORMED_JSON:
		return "MALFORMED_JSON"
	case UNAUTHENTICATED:
		return "UNAUTHENTICATED"
	case AI_ERRORED:
		return "AI_ERRORED"
	default:
		return "Unknown Error Code"
	}
}

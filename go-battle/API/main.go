package main

import (
	"fmt"

	"github.com/gofiber/fiber/v2"
)

func main() {
	app := fiber.New()

	app.Get("/", func(c *fiber.Ctx) error {
		return c.SendString("Hello, World!")
	})

	app.Post("/games", func(c *fiber.Ctx) error {
		gameId := c.Query("game_id")

		fmt.Println(gameId)

		return c.SendString(fmt.Sprintf("Created game with id %s", gameId))
	})

	app.Listen(":3000")
}

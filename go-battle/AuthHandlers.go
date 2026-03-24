package main

import (
	"encoding/json"
	"strings"

	"github.com/gofiber/fiber/v2"
)

type AuthRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

func registerHandler(c *fiber.Ctx) error {
	var req AuthRequest
	if err := json.Unmarshal(c.Body(), &req); err != nil {
		return c.Status(400).SendString("Invalid request body")
	}

	req.Username = strings.TrimSpace(req.Username)

	if req.Username == "" || req.Password == "" {
		return c.Status(400).SendString("Username and password are required")
	}

	if len(req.Username) < 3 || len(req.Username) > 30 {
		return c.Status(400).SendString("Username must be between 3 and 30 characters")
	}

	if len(req.Password) < 8 {
		return c.Status(400).SendString("Password must be at least 8 characters")
	}

	if userExists(db, req.Username) {
		return c.Status(400).SendString("Username already taken")
	}

	hashed, err := hashPassword(req.Password)
	if err != nil {
		log.Errorf("Error hashing password: %v", err)
		return c.Status(500).SendString("Internal server error")
	}

	user := User{
		Username:     req.Username,
		PasswordHash: hashed,
		Role:         RoleUser,
	}

	if err := insertUser(db, &user); err != nil {
		log.Errorf("Error creating user: %v", err)
		return c.Status(500).SendString("Failed to create user")
	}

	token, err := generateToken(&user)
	if err != nil {
		log.Errorf("Error generating token: %v", err)
		return c.Status(500).SendString("Internal server error")
	}

	return sendJSON(c, AuthResponse{Token: token, User: user})
}

func loginHandler(c *fiber.Ctx) error {
	var req AuthRequest
	if err := json.Unmarshal(c.Body(), &req); err != nil {
		return c.Status(400).SendString("Invalid request body")
	}

	req.Username = strings.TrimSpace(req.Username)

	if req.Username == "" || req.Password == "" {
		return c.Status(400).SendString("Username and password are required")
	}

	user, err := getUserByUsername(db, req.Username)
	if err != nil {
		return c.Status(401).SendString("Invalid username or password")
	}

	if !checkPassword(user.PasswordHash, req.Password) {
		return c.Status(401).SendString("Invalid username or password")
	}

	token, err := generateToken(user)
	if err != nil {
		log.Errorf("Error generating token: %v", err)
		return c.Status(500).SendString("Internal server error")
	}

	return sendJSON(c, AuthResponse{Token: token, User: *user})
}

func meHandler(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(uint)
	if !ok {
		return c.Status(401).SendString("Authentication required")
	}

	user, err := getUserByID(db, userID)
	if err != nil {
		return c.Status(404).SendString("User not found")
	}

	return sendJSON(c, user)
}

package main

import (
	"crypto/rand"
	"encoding/hex"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

var jwtSecret []byte

func initJWTSecret() {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		// Generate a random secret for development; in production set JWT_SECRET env var
		bytes := make([]byte, 32)
		if _, err := rand.Read(bytes); err != nil {
			panic("failed to generate JWT secret: " + err.Error())
		}
		secret = hex.EncodeToString(bytes)
		log.Warn("JWT_SECRET not set, using random secret (tokens will not persist across restarts)")
	}
	jwtSecret = []byte(secret)
}

type JWTClaims struct {
	UserID   uint     `json:"user_id"`
	Username string   `json:"username"`
	Role     UserRole `json:"role"`
	jwt.RegisteredClaims
}

func generateToken(user *User) (string, error) {
	claims := JWTClaims{
		UserID:   user.ID,
		Username: user.Username,
		Role:     user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(72 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

func parseToken(tokenString string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return jwtSecret, nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*JWTClaims)
	if !ok || !token.Valid {
		return nil, jwt.ErrSignatureInvalid
	}
	return claims, nil
}

// extractToken pulls the JWT from the Authorization header (Bearer <token>)
func extractToken(c *fiber.Ctx) string {
	auth := c.Get("Authorization")
	if strings.HasPrefix(auth, "Bearer ") {
		return auth[7:]
	}
	return ""
}

// RequireAuth middleware rejects requests without a valid JWT.
func RequireAuth() fiber.Handler {
	return func(c *fiber.Ctx) error {
		tokenStr := extractToken(c)
		if tokenStr == "" {
			return c.Status(401).SendString("Authentication required")
		}
		claims, err := parseToken(tokenStr)
		if err != nil {
			return c.Status(401).SendString("Invalid or expired token")
		}
		c.Locals("user_id", claims.UserID)
		c.Locals("username", claims.Username)
		c.Locals("role", claims.Role)
		return c.Next()
	}
}

// RequireAdmin middleware ensures the authenticated user has the admin role.
// Must be used after RequireAuth.
func RequireAdmin() fiber.Handler {
	return func(c *fiber.Ctx) error {
		role, ok := c.Locals("role").(UserRole)
		if !ok || role != RoleAdmin {
			return c.Status(403).SendString("Admin access required")
		}
		return c.Next()
	}
}

// OptionalAuth middleware parses a JWT if present but does not reject unauthenticated requests.
func OptionalAuth() fiber.Handler {
	return func(c *fiber.Ctx) error {
		tokenStr := extractToken(c)
		if tokenStr != "" {
			claims, err := parseToken(tokenStr)
			if err == nil {
				c.Locals("user_id", claims.UserID)
				c.Locals("username", claims.Username)
				c.Locals("role", claims.Role)
			}
		}
		return c.Next()
	}
}

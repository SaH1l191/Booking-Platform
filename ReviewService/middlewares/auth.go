package middlewares

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

func JWTAuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tokenString := ""

		if authHeader := r.Header.Get("Authorization"); strings.HasPrefix(authHeader, "Bearer ") {
			tokenString = strings.TrimPrefix(authHeader, "Bearer ")
		}

		if tokenString == "" {
			if cookie, err := r.Cookie("access_token"); err == nil {
				tokenString = cookie.Value
			}
		}

		tokenString = strings.TrimSpace(tokenString)
		if tokenString == "" {
			http.Error(w, "Missing token", http.StatusUnauthorized)
			return
		}

		claims := jwt.MapClaims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method")
			}
			secret := os.Getenv("JWT_ACCESS_SECRET")
			if secret == "" {
				secret = "secret"
			}
			return []byte(secret), nil
		})
		if err != nil || !token.Valid {
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}

		if typ, ok := claims["type"].(string); !ok || typ != "access" {
			http.Error(w, "Invalid access token", http.StatusUnauthorized)
			return
		}

		userIDRaw, okID := claims["userId"]
		emailRaw, okEmail := claims["email"]
		if !okID || !okEmail {
			http.Error(w, "Invalid token claims", http.StatusUnauthorized)
			return
		}

		userIDStr := fmt.Sprintf("%.0f", userIDRaw)
		email, _ := emailRaw.(string)

		var roles []string
		if rolesRaw, ok := claims["roles"].([]interface{}); ok {
			for _, r := range rolesRaw {
				if roleStr, ok := r.(string); ok {
					roles = append(roles, roleStr)
				}
			}
		}
		if roles == nil {
			roles = []string{}
		}

		ctx := context.WithValue(r.Context(), "userID", userIDStr)
		ctx = context.WithValue(ctx, "email", email)
		ctx = context.WithValue(ctx, "roles", roles)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func OptionalAuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tokenString := ""

		if authHeader := r.Header.Get("Authorization"); strings.HasPrefix(authHeader, "Bearer ") {
			tokenString = strings.TrimPrefix(authHeader, "Bearer ")
		}

		if tokenString == "" {
			if cookie, err := r.Cookie("access_token"); err == nil {
				tokenString = cookie.Value
			}
		}

		tokenString = strings.TrimSpace(tokenString)
		if tokenString == "" {
			next.ServeHTTP(w, r)
			return
		}

		claims := jwt.MapClaims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method")
			}
			secret := os.Getenv("JWT_ACCESS_SECRET")
			if secret == "" {
				secret = "secret"
			}
			return []byte(secret), nil
		})
		if err != nil || !token.Valid {
			next.ServeHTTP(w, r)
			return
		}

		userIDStr := ""
		email := ""
		var roles []string

		if userIDRaw, ok := claims["userId"]; ok {
			userIDStr = fmt.Sprintf("%.0f", userIDRaw)
		}
		if emailRaw, ok := claims["email"].(string); ok {
			email = emailRaw
		}
		if rolesRaw, ok := claims["roles"].([]interface{}); ok {
			for _, r := range rolesRaw {
				if roleStr, ok := r.(string); ok {
					roles = append(roles, roleStr)
				}
			}
		}
		if roles == nil {
			roles = []string{}
		}

		ctx := context.WithValue(r.Context(), "userID", userIDStr)
		ctx = context.WithValue(ctx, "email", email)
		ctx = context.WithValue(ctx, "roles", roles)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

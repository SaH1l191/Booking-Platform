package middlewares

import (
	"context"
	"fmt"
	env "goAuth/config/env"
	"goAuth/pkg/logger"
	"net/http"
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
			return []byte(env.GetEnv("JWT_ACCESS_SECRET")), nil
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
		usernameRaw, okUsername := claims["username"]
		emailRaw, okEmail := claims["email"]
		if !okID || !okUsername || !okEmail {
			http.Error(w, "Invalid token claims", http.StatusUnauthorized)
			return
		}

		userIDStr := fmt.Sprintf("%.0f", userIDRaw)

		username, okUsernameString := usernameRaw.(string)
		email, okEmailString := emailRaw.(string)
		if !okUsernameString || !okEmailString {
			http.Error(w, "Invalid token claims", http.StatusUnauthorized)
			return
		}

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
		ctx = context.WithValue(ctx, "username", username)
		ctx = context.WithValue(ctx, "roles", roles)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}



func RequirePermission(requiredPerm string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			rolesRaw := r.Context().Value("roles")
			roles, ok := rolesRaw.([]string)
			if !ok {
				http.Error(w, "Unauthorized: no roles in context", http.StatusUnauthorized)
				return
			}
			logger.Log.Info("Checking permissions for user", "requiredPermission", requiredPerm, "userRoles", roles)

			for _, role := range roles {
				permissions, exists := RolePermissions[role]
				if !exists {
					continue
				}
				for _, p := range permissions {
					if p == "*" || p == requiredPerm {
						logger.Log.Info("Permission granted", "userRoles", roles, "requiredPermission", requiredPerm)
						next.ServeHTTP(w, r)
						return
					}
				}
			}

			http.Error(w, "Forbidden: missing required permission", http.StatusForbidden)
		})
	}
}

func SecureHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Referrer-Policy", "no-referrer")
		w.Header().Set("Cache-Control", "no-store")
		next.ServeHTTP(w, r)
	})
}

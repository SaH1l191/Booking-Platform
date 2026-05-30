package middlewares

import (
	"context"
	env "goAuth/config/env"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

func JWTAuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		
		authHeader := r.Header.Get("Authorization")
		tokenString := ""
		if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
			tokenString = strings.TrimPrefix(authHeader, "Bearer ")
		}

		if tokenString == "" {
			if cookie, err := r.Cookie("access_token"); err == nil {
				tokenString = cookie.Value
			}
		}

		if tokenString == "" {
			http.Error(w, "Missing token", http.StatusUnauthorized)
			return
		}

		claims := jwt.MapClaims{}
		_, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return []byte(env.GetEnv("JWT_SECRET", "secret")), nil
		})
		if err != nil {
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}

		userId, okId := claims["username"]
		userEmail, okEmail := claims["email"]

		if !okEmail || !okId {
			http.Error(w, "Invalid token claims", http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), "userID", userId)
		ctx = context.WithValue(ctx, "email", userEmail)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

package middlewares

import ( 
	"context"
	"fmt"
	config "goAuth/config/db"
	env "goAuth/config/env"
	repo "goAuth/db/repositories"
	"net/http"
	"strconv"
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
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method")
			}
			return []byte(env.GetEnv("JWT_SECRET", "secret")), nil
		})
		if err != nil || !token.Valid {
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}

		tokenType, ok := claims["type"].(string)
		if !ok || tokenType != "access" {
			http.Error(w, "Invalid access token", http.StatusUnauthorized)
			return
		}

		userID, okID := claims["userId"]
		username, okUsername := claims["username"]
		email, okEmail := claims["email"]

		if !okEmail || !okID || !okUsername {
			http.Error(w, "Invalid token claims", http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), "userID", userID)
		ctx = context.WithValue(ctx, "email", email)
		ctx = context.WithValue(ctx, "username", username)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func RequireAllRoles(requiredRoles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

			userIdStr := r.Context().Value("userID").(string)
			userId, err := strconv.ParseInt(userIdStr, 10, 64)
			if err != nil {
				http.Error(w, "Invalid user ID in token", http.StatusUnauthorized)
				return
			}

			dbConn, err := config.SetupDB()
			if err != nil {
				http.Error(w, "Database connection error"+err.Error(), http.StatusInternalServerError)
				return
			}
			urr := repo.NewUserRoleRepository(dbConn)

			hasAllRoles, err := urr.HasAllRoles(userId, requiredRoles)

			fmt.Println("userid", userId, "roles", requiredRoles, "hasAllRoles", hasAllRoles)
			if err != nil {
				http.Error(w, "Error checking user roles: "+err.Error(), http.StatusInternalServerError)
				return
			}

			if !hasAllRoles {
				http.Error(w, "Forbidden: You do not have the required roles", http.StatusForbidden)
				return
			}

			fmt.Println("User has all required roles:", requiredRoles)

			next.ServeHTTP(w, r)

		})
	}
}

func RequireAnyRole(requiredRoles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

			userIdStr := r.Context().Value("userID").(string)
			userId, err := strconv.ParseInt(userIdStr, 10, 64)
			if err != nil {
				http.Error(w, "Invalid user ID in token", http.StatusUnauthorized)
				return
			}

			dbConn, err := config.SetupDB()
			if err != nil {
				http.Error(w, "Database connection error"+err.Error(), http.StatusInternalServerError)
				return
			}
			urr := repo.NewUserRoleRepository(dbConn)

			hasAnyRole, err := urr.HasAnyRole(userId, requiredRoles)

			fmt.Println("userid", userId, "roles", requiredRoles, "hasAnyRole", hasAnyRole)
			if err != nil {
				http.Error(w, "Error checking user roles: "+err.Error(), http.StatusInternalServerError)
				return
			}

			if !hasAnyRole {
				http.Error(w, "Forbidden: You do not have the required roles", http.StatusForbidden)
				return
			}

			fmt.Println("User has any of the required roles:", requiredRoles)

			next.ServeHTTP(w, r)

		})
	}
}



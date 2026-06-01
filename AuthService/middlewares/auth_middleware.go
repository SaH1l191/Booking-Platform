package middlewares

import (
	"context"
	"fmt"
	config "goAuth/config/db"
	env "goAuth/config/env"
	repo "goAuth/db/repositories"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

func JWTAuthMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

        // ----- Extract token -----
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
        tokenString = strings.TrimSpace(tokenString)
        if tokenString == "" {
            http.Error(w, "Missing token", http.StatusUnauthorized)
            return
        }

        // ----- Parse token -----
        claims := jwt.MapClaims{}
        token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
            // Ensure token is signed with HMAC
            if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
                return nil, fmt.Errorf("unexpected signing method")
            }
            return []byte(env.GetEnv("JWT_ACCESS_SECRET", "secret")), nil
        })
        if err != nil || !token.Valid {
            http.Error(w, "Invalid token", http.StatusUnauthorized)
            return
        }
		

        // ----- Validate claim types -----
        // token must be an access token
        if typ, ok := claims["type"].(string); !ok || typ != "access" {
            http.Error(w, "Invalid access token", http.StatusUnauthorized)
            return
        }

        // required claims
        userIDRaw, okID := claims["userId"]
        usernameRaw, okUsername := claims["username"]
        emailRaw, okEmail := claims["email"]
        if !okID || !okUsername || !okEmail {
            http.Error(w, "Invalid token claims", http.StatusUnauthorized)
            return
        }
		
        // ----- Normalise userId to string -----
        var userIDStr string
        switch v := userIDRaw.(type) {
        case float64:
            // JWT numeric claims are float64; format without fraction
            userIDStr = fmt.Sprintf("%.0f", v)
        case int64, int, uint64:
            userIDStr = fmt.Sprintf("%d", v)
        case string:
            userIDStr = v
        default:
            http.Error(w, "Unsupported userId type in token", http.StatusUnauthorized)
            return
        }

        // Ensure username and email are strings (they should already be)
        username, _ := usernameRaw.(string)
        email, _ := emailRaw.(string)

        // Store values in context – keep both "userID" (legacy) and "userId" for other code
        ctx := context.WithValue(r.Context(), "userID", userIDStr) // legacy key used by Require*Roles
        ctx = context.WithValue(ctx, "userId", userIDStr)      // key used by proxy utils
        ctx = context.WithValue(ctx, "email", email)
        ctx = context.WithValue(ctx, "username", username)

        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

	
func RequireAllRoles(requiredRoles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			val := r.Context().Value("userID")
			userId, ok := val.(int64)
			if !ok {
				http.Error(w, "invalid userID in context", http.StatusUnauthorized)
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

			val := r.Context().Value("userID")
			userId, ok := val.(int64)
			if !ok {
				http.Error(w, "invalid userID in context", http.StatusUnauthorized)
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

package middlewares

import (
	"context"
	"fmt"
	config "goAuth/config/db"
	env "goAuth/config/env"
	repo "goAuth/db/repositories"
	"goAuth/pkg/logger"
	"net/http"
	"strconv"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

func JWTAuthMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

        tokenString := ""
		if cookie, err := r.Cookie("access_token"); err == nil {
			tokenString = cookie.Value
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
            return []byte(env.GetEnv("JWT_ACCESS_SECRET", "secret")), nil
        })
        if err != nil || !token.Valid {
            http.Error(w, "Invalid token", http.StatusUnauthorized)
            return
        }
		
		fmt.Println("Token claims:", claims)

   
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
        logger.Logger.Info("Token claims extracted",
            "userId", userIDRaw,
            "username", usernameRaw,
            "email", emailRaw,
        )
		
    
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

        username, okUsernameString := usernameRaw.(string)
        email, okEmailString := emailRaw.(string)
        if !okUsernameString || !okEmailString {
            http.Error(w, "Invalid token claims", http.StatusUnauthorized)
            return
        }

        logger.Logger.Info("User info extracted from token",
            "userId", userIDStr,
            "username", username,
            "email", email,
        )
        
        ctx := context.WithValue(r.Context(), "userID", userIDStr)
        ctx = context.WithValue(ctx, "userId", userIDStr)     
        ctx = context.WithValue(ctx, "email", email)
        ctx = context.WithValue(ctx, "username", username)

        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

	
func RequireAllRoles(requiredRoles ...string) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // userID is stored as a string in the context by JWTAuthMiddleware
            val := r.Context().Value("userID")
            userIDStr, ok := val.(string)
            if !ok {
                http.Error(w, "invalid userID in context", http.StatusUnauthorized)
                return
            }
            userId, err := strconv.ParseInt(userIDStr, 10, 64)
            if err != nil {
                http.Error(w, "invalid userID format", http.StatusUnauthorized)
                return
            }

            dbConn, err := config.SetupDB()
            if err != nil {
                http.Error(w, "Database connection error"+err.Error(), http.StatusInternalServerError)
                return
            }
            urr := repo.NewUserRoleRepository(dbConn)

            hasAllRoles, err := urr.HasAllRoles(userId, requiredRoles)

            logger.Logger.Info("Role check result",
                "userid", userId,
                "roles", requiredRoles,
                "hasAllRoles", hasAllRoles,
            )
            if err != nil {
                http.Error(w, "Error checking user roles: "+err.Error(), http.StatusInternalServerError)
                return
            }

            if !hasAllRoles {
                http.Error(w, "Forbidden: You do not have the required roles", http.StatusForbidden)
                return
            }

            logger.Logger.Info("User has all required roles",
                "userid", userId,
                "roles", requiredRoles,
            )

            next.ServeHTTP(w, r)
        })
    }
}

func RequireAnyRole(requiredRoles ...string) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // userID is stored as a string in the context by JWTAuthMiddleware
            val := r.Context().Value("userID")
            userIDStr, ok := val.(string)
            if !ok {
                http.Error(w, "invalid userID in context", http.StatusUnauthorized)
                return
            }
            userId, err := strconv.ParseInt(userIDStr, 10, 64)
            if err != nil {
                http.Error(w, "invalid userID format", http.StatusUnauthorized)
                return
            }

            dbConn, err := config.SetupDB()
            if err != nil {
                http.Error(w, "Database connection error"+err.Error(), http.StatusInternalServerError)
                return
            }
            urr := repo.NewUserRoleRepository(dbConn)

            hasAnyRole, err := urr.HasAnyRole(userId, requiredRoles)

            logger.Logger.Info("Role check result",
                "userid", userId,
                "roles", requiredRoles,
                "hasAnyRole", hasAnyRole,
            )
            if err != nil {
                http.Error(w, "Error checking user roles: "+err.Error(), http.StatusInternalServerError)
                return
            }

            if !hasAnyRole {
                http.Error(w, "Forbidden: You do not have the required roles", http.StatusForbidden)
                return
            }

            logger.Logger.Info("User has any of the required roles",
                "userid", userId,
                "roles", requiredRoles,
            )

            next.ServeHTTP(w, r)
        })
    }
}

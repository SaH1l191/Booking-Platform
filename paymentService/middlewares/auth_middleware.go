package middlewares
import (
	"context"
	"net/http"
	"strings"
)

func JWTAuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID := r.Header.Get("X-User-ID")
		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		email := r.Header.Get("X-User-Email")
		roleHeader := r.Header.Get("X-User-Role")

		var roles []string
		if roleHeader != "" {
			roles = strings.Split(roleHeader, ",")
		}
		if roles == nil {
			roles = []string{}
		}
		ctx := context.WithValue(r.Context(), "userID", userID)
		ctx = context.WithValue(ctx, "email", email)
		ctx = context.WithValue(ctx, "roles", roles)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
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
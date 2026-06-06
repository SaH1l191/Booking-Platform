package middlewares

import (
	"golang.org/x/time/rate"
	"net/http"
	"time"
)

// middleware factoory pattern for rate limit + closure

func RateLimitMiddleware(limit int) func(http.Handler) http.Handler {
	limiter := rate.NewLimiter(rate.Every(1*time.Minute), limit)
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !limiter.Allow() {
				http.Error(w, "Too many requests", http.StatusTooManyRequests)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

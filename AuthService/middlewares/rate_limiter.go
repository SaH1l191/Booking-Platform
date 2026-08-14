package middlewares

import (
	"golang.org/x/time/rate"
	"net/http"
	"strings"
	"sync"

	"goAuth/pkg/logger"
)



// global ipLimiter stores rate limiter per client IP.
var (
	ipLimiters = make(map[string]*rate.Limiter)
	ipMu       sync.Mutex
)
//192.168.1.10 -> Limiter A
//mutex is required because multiple requests can access the map concurrently.

// getLimiter returns the limiter for a given IP, creating one if necessary.
func getLimiter(ip string, limit int) *rate.Limiter {
	ipMu.Lock()
	defer ipMu.Unlock()
	if l, exists := ipLimiters[ip]; exists {
		return l
	}
	// requests per minute -> rate per second
	r := rate.Limit(float64(limit) / 60.0)
	// burst size set to limit to allow short bursts up to the limit per minute
	l := rate.NewLimiter(r, limit)
	ipLimiters[ip] = l
	return l
}

// middleware factoory pattern for rate limit + closure
func RateLimitMiddleware(limit int) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            ip := r.RemoteAddr
            if colon := strings.LastIndex(ip, ":"); colon != -1 {
                ip = ip[:colon]
            }
            limiter := getLimiter(ip, limit)
            if !limiter.Allow() {
                logger.Log.Warn("Rate limit exceeded", "ip", ip, "limit", limit)
                http.Error(w, "Too many requests", http.StatusTooManyRequests)
                return
            }
            logger.Log.Info("Rate limit check passed", "ip", ip, "limit", limit)
            next.ServeHTTP(w, r)
        })
    }
}

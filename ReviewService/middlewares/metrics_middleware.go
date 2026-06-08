package middlewares

import (
    "net/http"
    "strconv"
    "time" 
    "ReviewService/pkg/metrics"
)

func MetricsMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()

        // wrap ResponseWriter to capture status code
        wrapped := &statusRecorder{ResponseWriter: w, status: 200}
        next.ServeHTTP(wrapped, r)

        duration := time.Since(start).Seconds()
        status := strconv.Itoa(wrapped.status)

        metrics.HTTPRequestDuration.WithLabelValues(r.Method, r.URL.Path).Observe(duration)
        metrics.HTTPRequestsTotal.WithLabelValues(r.Method, r.URL.Path, status).Inc()
    })
}

type statusRecorder struct {
    http.ResponseWriter
    status int
}

func (r *statusRecorder) WriteHeader(code int) {
    r.status = code
    r.ResponseWriter.WriteHeader(code)
}
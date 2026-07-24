package middlewares

import (
	"context"
	"crypto/rand"
	"fmt"
	"net/http"
	"time"

	"goAuth/pkg/logger"
)

type contextKey string

const RequestIDKey contextKey = "request_id"
const OriginalPathKey contextKey = "original_path"

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

func generateRequestID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}

func RequestContext(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestID := r.Header.Get("X-Request-ID")
		if requestID == "" {
			requestID = generateRequestID()
		}

		originalPath := r.Header.Get("X-Original-Path")
		if originalPath == "" {
			originalPath = r.URL.Path
		}

		ctx := context.WithValue(r.Context(), RequestIDKey, requestID)
		ctx = context.WithValue(ctx, OriginalPathKey, originalPath)

		rw := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
		start := time.Now()

		next.ServeHTTP(rw, r.WithContext(ctx))

		latency := time.Since(start)
		logger.Log.Info("HTTP Request",
			"requestId", requestID,
			"method", r.Method,
			"route", originalPath,
			"status", rw.statusCode,
			"latency", latency.Milliseconds(),
		)
	})
}

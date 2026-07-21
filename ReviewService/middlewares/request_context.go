package middlewares

import (
	"context"
	"crypto/rand"
	"fmt"
	"net/http"

	"ReviewService/pkg/logger"
)

type contextKey string

const RequestIDKey contextKey = "request_id"
const OriginalPathKey contextKey = "original_path"

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

		logger.Log.Info("Incoming request",
			"request_id", requestID,
			"original_path", originalPath,
			"method", r.Method,
			"path", r.URL.Path,
		)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

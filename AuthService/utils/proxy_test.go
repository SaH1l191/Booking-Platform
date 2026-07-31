package utils

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"goAuth/pkg/logger"

	"github.com/go-chi/chi"
)

func TestMain(m *testing.M) {
	logger.Init("test", "../logs")
	os.Exit(m.Run())
}

func TestContextPropagation(t *testing.T) {
	// Simulate JWT middleware setting context values
	jwtMiddleware := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := context.WithValue(r.Context(), "userID", "42")
			ctx = context.WithValue(ctx, "email", "test@example.com")
			ctx = context.WithValue(ctx, "roles", []string{"customer"})
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}

	// Simulate downstream service
	downstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		uid := r.Header.Get("X-User-ID")
		email := r.Header.Get("X-User-Email")
		role := r.Header.Get("X-User-Role")
		fmt.Fprintf(w, "uid=%s,email=%s,role=%s", uid, email, role)
	}))
	defer downstream.Close()

	proxy := ProxyToService(downstream.URL, "/")

	chiRouter := chi.NewRouter()
	chiRouter.Route("/api/v1/test", func(r chi.Router) {
		r.Use(jwtMiddleware)
		r.Handle("/*", proxy)
	})

	// Make request through chi → middleware → proxy
	req := httptest.NewRequest("GET", "/api/v1/test/hello", nil)
	w := httptest.NewRecorder()
	chiRouter.ServeHTTP(w, req)

	t.Logf("Downstream received: %s", w.Body.String())
	if w.Body.String() != "uid=42,email=test@example.com,role=[customer]" {
		t.Errorf("Expected context values to propagate, got: %s", w.Body.String())
	}
}

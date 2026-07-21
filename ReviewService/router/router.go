package router

import ( 
	"ReviewService/pkg/metrics" 
	"net/http"

	"github.com/go-chi/chi"
	"github.com/go-chi/chi/middleware"
)

type Router interface {
	Register(r chi.Router)
}

func SetupRouter(reviewRouter *ReviewRouter) chi.Router {
	r := chi.NewRouter()

	// Initialize custom metrics
	metrics.Init()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(metrics.MetricsMiddleware)

	r.Handle("/metrics", metrics.MetricsHandler())
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok","service":"ReviewService"}`))
	})

	reviewRouter.Register(r)

	return r
}

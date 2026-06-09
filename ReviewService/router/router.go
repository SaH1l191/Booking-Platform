package router

import ( 
	"ReviewService/pkg/metrics" 
	"github.com/go-chi/chi"
	"github.com/go-chi/chi/middleware"
)

type Router interface {
	Register(r chi.Router)
}

func SetupRouter(reviewRouter *ReviewRouter) chi.Router {
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Handle("/metrics", metrics.MetricsHandler())


	reviewRouter.Register(r)

	return r
}

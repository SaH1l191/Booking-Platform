package router

import (
	"goPayment/pkg/metrics"
	"goPayment/middlewares"
	"net/http"

	"github.com/go-chi/chi"
)

type Route interface {
	Register(r chi.Router)
}

func SetupRouter(paymentRouter Route) chi.Router {
	chiRouter := chi.NewRouter()

	// Initialize custom metrics
	metrics.Init()

	chiRouter.Use(middlewares.RequestContext)
	chiRouter.Use(metrics.MetricsMiddleware)

	chiRouter.Handle("/metrics", metrics.MetricsHandler())
	chiRouter.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok","service":"PaymentService"}`))
	})

	paymentRouter.Register(chiRouter)

	return chiRouter
}

package router
import (
	"goPayment/pkg/metrics"
	"github.com/go-chi/chi"
)

type Route interface {
	Register(r chi.Router)
}

func SetupRouter(paymentRouter Route) chi.Router {
	chiRouter := chi.NewRouter()
	chiRouter.Handle("/metrics", metrics.MetricsHandler())

	paymentRouter.Register(chiRouter)

	return chiRouter
}

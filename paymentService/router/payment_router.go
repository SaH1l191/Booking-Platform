package router

import (
	"net/http"

	"github.com/go-chi/chi"
	"goPayment/controllers"
	"goPayment/middlewares"
)

type PaymentRouter struct {
	paymentController *controllers.PaymentController
}

func NewPaymentRouter(paymentController *controllers.PaymentController) *PaymentRouter {
	return &PaymentRouter{paymentController: paymentController}
}

func (pr *PaymentRouter) Register(chiRouter chi.Router) {
	chiRouter.Route("/payments", func(r chi.Router) {
		r.Get("/error-test", func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(`{"success":false,"message":"Dummy 500 Internal Server Error"}`))
		})

		r.Group(func(protected chi.Router) {
			protected.Use(middlewares.JWTAuthMiddleware)

			// Create order - customer only
			protected.With(middlewares.RequirePermission("payment:create")).With(middlewares.CreateOrderRequestValidator).Post("/create-order", pr.paymentController.CreateOrder)
			// Verify payment - customer only
			protected.With(middlewares.RequirePermission("payment:create")).With(middlewares.VerifyPaymentRequestValidator).Post("/verify", pr.paymentController.VerifyPayment)
			// Refund payment - admin only
			protected.With(middlewares.RequirePermission("payment:create")).With(middlewares.RefundRequestValidator).Post("/refund", pr.paymentController.RefundPayment)
			// Get payment by booking ID - any authenticated user
			protected.With(middlewares.RequirePermission("payment:read")).Get("/booking/{bookingId}", pr.paymentController.GetPaymentByBookingId)
		})

		r.Post("/webhook", pr.paymentController.HandleWebhook)
	})
}

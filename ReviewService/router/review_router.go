package router

import (
	"ReviewService/controllers"
	"ReviewService/middlewares"
	"net/http"

	"github.com/go-chi/chi"
)

type ReviewRouter struct {
	reviewController *controllers.ReviewController
}

func NewReviewRouter(reviewController *controllers.ReviewController) *ReviewRouter {
	return &ReviewRouter{reviewController: reviewController}
}

func (rr *ReviewRouter) Register(chiRouter chi.Router) {

	chiRouter.Route("/reviews", func(r chi.Router) {
		r.Get("/error-test", func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(`{"success":false,"message":"Dummy 500 Internal Server Error"}`))
		})

		r.Group(func(public chi.Router) {
			public.Use(middlewares.OptionalAuthMiddleware)

			public.Get("/", rr.reviewController.GetAllReviews)
			public.Get("/{id}", rr.reviewController.GetReviewById)
			public.Get("/user/{id}", rr.reviewController.GetReviewsByUserId)
			public.Get("/hotels/{id}", rr.reviewController.GetReviewsByHotelId)
			public.Get("/booking/{id}", rr.reviewController.GetReviewsByBookingId)
		})

		r.Group(func(auth chi.Router) {
			auth.Use(middlewares.JWTAuthMiddleware)

			auth.With(middlewares.RequirePermission("review:create")).With(middlewares.CreateReviewValidator).Post("/", rr.reviewController.CreateReview)
			auth.With(middlewares.RequirePermission("review:create")).With(middlewares.UpdateReviewValidator).Put("/{id}", rr.reviewController.UpdateReview)
			auth.With(middlewares.RequirePermission("review:delete")).Delete("/{id}", rr.reviewController.DeleteReview)
		})
	})
}

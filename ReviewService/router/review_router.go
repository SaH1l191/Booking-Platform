package router

import (
	"ReviewService/controllers"
	"ReviewService/middlewares"
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
		r.Group(func(auth chi.Router) {
			auth.Use(middlewares.JWTAuthMiddleware)

			auth.With(middlewares.RequirePermission("review:read")).Get("/", rr.reviewController.GetAllReviews)
			auth.With(middlewares.RequirePermission("review:create")).With(middlewares.CreateReviewValidator).Post("/", rr.reviewController.CreateReview)
			auth.With(middlewares.RequirePermission("review:read")).Get("/{id}", rr.reviewController.GetReviewById)
			auth.With(middlewares.RequirePermission("review:create")).With(middlewares.UpdateReviewValidator).Put("/{id}", rr.reviewController.UpdateReview)
			auth.With(middlewares.RequirePermission("review:delete")).Delete("/{id}", rr.reviewController.DeleteReview)
			auth.With(middlewares.RequirePermission("review:read")).Get("/user", rr.reviewController.GetReviewsByUserId)
			auth.With(middlewares.RequirePermission("review:read")).Get("/hotel", rr.reviewController.GetReviewsByHotelId)
			auth.With(middlewares.RequirePermission("review:read")).Get("/booking", rr.reviewController.GetReviewsByBookingId)
		})
	})
}

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
		r.Get("/", rr.reviewController.GetAllReviews)
		r.With(middlewares.CreateReviewValidator).Post("/", rr.reviewController.CreateReview)
		r.Get("/{id}", rr.reviewController.GetReviewById)
		r.With(middlewares.UpdateReviewValidator).Put("/{id}", rr.reviewController.UpdateReview)
		r.Delete("/{id}", rr.reviewController.DeleteReview)
		r.Get("/user", rr.reviewController.GetReviewsByUserId)       // expects query param user_id
		r.Get("/hotel", rr.reviewController.GetReviewsByHotelId)     // expects query param hotel_id
		r.Get("/booking", rr.reviewController.GetReviewsByBookingId) // expects query param booking_id
	})
}

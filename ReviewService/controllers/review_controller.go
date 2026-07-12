package controllers

import (
	"ReviewService/dto"
	"ReviewService/services"
	"ReviewService/utils"
	"ReviewService/pkg/logger"
	"fmt"
	"github.com/go-chi/chi"
	"net/http"
)

type ReviewController struct {
	ReviewService services.ReviewService
}

func NewReviewController(reviewService services.ReviewService) *ReviewController {
	return &ReviewController{
		ReviewService: reviewService,
	}
}

func (rc *ReviewController) GetReviewById(w http.ResponseWriter, r *http.Request) {
	logger.Log.Info("Fetching review by ID in ReviewController")

	reviewId := chi.URLParam(r, "id")
	if reviewId == "" {
		utils.WriteJsonErrorResponse(w, http.StatusBadRequest, "Review ID is required", fmt.Errorf("missing review ID"))
		return
	}

	review, err := rc.ReviewService.GetReviewById(reviewId)
	if err != nil {
		utils.WriteJsonErrorResponse(w, http.StatusInternalServerError, "Failed to fetch review", err)
		return
	}
	if review == nil {
		utils.WriteJsonErrorResponse(w, http.StatusNotFound, "Review not found", fmt.Errorf("review with ID %s not found", reviewId))
		return
	}
	utils.WriteJsonSuccessResponse(w, http.StatusOK, "Review fetched successfully", review)
	logger.Log.Info("Review fetched successfully", "review", review)
}

func (rc *ReviewController) CreateReview(w http.ResponseWriter, r *http.Request) {
	payload := r.Context().Value("payload").(dto.CreateReviewRequestDTO)

	logger.Log.Info("Payload received", "payload", payload)

	review, err := rc.ReviewService.CreateReview(&payload)

	if err != nil {
		utils.WriteJsonErrorResponse(w, http.StatusInternalServerError, "Failed to create review", err)
		return
	}

	utils.WriteJsonSuccessResponse(w, http.StatusCreated, "Review created successfully", review)
	logger.Log.Info("Review created successfully", "review", review)
}

func (rc *ReviewController) UpdateReview(w http.ResponseWriter, r *http.Request) {
	logger.Log.Info("Updating review in ReviewController")

	reviewId := chi.URLParam(r, "id")
	if reviewId == "" {
		utils.WriteJsonErrorResponse(w, http.StatusBadRequest, "Review ID is required", fmt.Errorf("missing review ID"))
		return
	}

	payload := r.Context().Value("payload").(dto.UpdateReviewRequestDTO)

	logger.Log.Info("Payload received", "payload", payload)

	review, err := rc.ReviewService.UpdateReview(reviewId, &payload)

	if err != nil {
		utils.WriteJsonErrorResponse(w, http.StatusInternalServerError, "Failed to update review", err)
		return
	}

	utils.WriteJsonSuccessResponse(w, http.StatusOK, "Review updated successfully", review)
	logger.Log.Info("Review updated successfully", "review", review)
}

func (rc *ReviewController) DeleteReview(w http.ResponseWriter, r *http.Request) {
	logger.Log.Info("Deleting review in ReviewController")

	reviewId := chi.URLParam(r, "id")
	if reviewId == "" {
		utils.WriteJsonErrorResponse(w, http.StatusBadRequest, "Review ID is required", fmt.Errorf("missing review ID"))
		return
	}

	err := rc.ReviewService.DeleteReview(reviewId)

	if err != nil {
		utils.WriteJsonErrorResponse(w, http.StatusInternalServerError, "Failed to delete review", err)
		return
	}

	utils.WriteJsonSuccessResponse(w, http.StatusOK, "Review deleted successfully", nil)
	logger.Log.Info("Review deleted successfully")
}

func (rc *ReviewController) GetAllReviews(w http.ResponseWriter, r *http.Request) {
	logger.Log.Info("Fetching all reviews in ReviewController")

	reviews, err := rc.ReviewService.GetAllReviews()
	if err != nil {
		utils.WriteJsonErrorResponse(w, http.StatusInternalServerError, "Failed to fetch reviews", err)
		return
	}

	utils.WriteJsonSuccessResponse(w, http.StatusOK, "Reviews fetched successfully", reviews)
	logger.Log.Info("Reviews fetched successfully", "count", len(reviews))
}

func (rc *ReviewController) GetReviewsByUserId(w http.ResponseWriter, r *http.Request) {
	logger.Log.Info("Fetching reviews by user ID in ReviewController")

	userId := chi.URLParam(r, "id")
	if userId == "" {
		utils.WriteJsonErrorResponse(w, http.StatusBadRequest, "User ID is required", fmt.Errorf("missing user ID"))
		return
	}

	reviews, err := rc.ReviewService.GetReviewsByUserId(userId)
	if err != nil {
		utils.WriteJsonErrorResponse(w, http.StatusInternalServerError, "Failed to fetch reviews by user ID", err)
		return
	}

	utils.WriteJsonSuccessResponse(w, http.StatusOK, "Reviews fetched successfully", reviews)
	logger.Log.Info("Reviews fetched successfully for user ID", "userId", userId, "count", len(reviews))
}

func (rc *ReviewController) GetReviewsByHotelId(w http.ResponseWriter, r *http.Request) {
	logger.Log.Info("Fetching reviews by hotel ID in ReviewController")

	hotelId := chi.URLParam(r, "id")
	if hotelId == "" {
		utils.WriteJsonErrorResponse(w, http.StatusBadRequest, "Hotel ID is required", fmt.Errorf("missing hotel ID"))
		return
	}

	reviews, err := rc.ReviewService.GetReviewsByHotelId(hotelId)
	if err != nil {
		utils.WriteJsonErrorResponse(w, http.StatusInternalServerError, "Failed to fetch reviews by hotel ID", err)
		return
	}

	utils.WriteJsonSuccessResponse(w, http.StatusOK, "Reviews fetched successfully", reviews)
	logger.Log.Info("Reviews fetched successfully for hotel ID", "hotelId", hotelId, "count", len(reviews))
}

func (rc *ReviewController) GetReviewsByBookingId(w http.ResponseWriter, r *http.Request) {
	logger.Log.Info("Fetching reviews by booking ID in ReviewController")

	bookingId := chi.URLParam(r, "id")
	if bookingId == "" {
		utils.WriteJsonErrorResponse(w, http.StatusBadRequest, "Booking ID is required", fmt.Errorf("missing booking ID"))
		return
	}

	reviews, err := rc.ReviewService.GetReviewsByBookingId(bookingId)
	if err != nil {
		utils.WriteJsonErrorResponse(w, http.StatusInternalServerError, "Failed to fetch reviews by booking ID", err)
		return
	}

	utils.WriteJsonSuccessResponse(w, http.StatusOK, "Reviews fetched successfully", reviews)
	logger.Log.Info("Reviews fetched successfully for booking ID", "bookingId", bookingId, "count", len(reviews))
}

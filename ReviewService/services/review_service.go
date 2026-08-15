package services

import (
	db "ReviewService/db/repositories"
	"ReviewService/dto"
	"ReviewService/models"
	"ReviewService/pkg/logger"
	"fmt"
	"strconv"
)

type ReviewService interface {
	GetReviewById(id string) (*models.Review, error)
	CreateReview(payload *dto.CreateReviewRequestDTO) (*models.Review, error)
	UpdateReview(id string, userId int64, payload *dto.UpdateReviewRequestDTO) (*models.Review, error)
	DeleteReview(id string, userId int64) error
	GetAllReviews() ([]*models.Review, error)
	GetReviewsByUserId(userId string) ([]*models.Review, error)
	GetReviewsByHotelId(hotelId string) ([]*models.Review, error)
	GetReviewsByBookingId(bookingId string) ([]*models.Review, error)
}

type ReviewServiceImpl struct {
	reviewRepository db.ReviewRepository
}

func NewReviewService(reviewRepository db.ReviewRepository) ReviewService {
	return &ReviewServiceImpl{
		reviewRepository: reviewRepository,
	}
}

func (r *ReviewServiceImpl) GetReviewById(id string) (*models.Review, error) {
	fmt.Println("Fetching review by ID", "reviewId", id)

	idInt, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		logger.Log.Error("Error parsing review ID", "error", err, "reviewId", id)
		return nil, fmt.Errorf("invalid review ID")
	}

	review, err := r.reviewRepository.GetByID(idInt)
	if err != nil {
		logger.Log.Error("Error fetching review", "error", err, "reviewId", id)
		return nil, err
	}
	return review, nil
}

func (r *ReviewServiceImpl) CreateReview(payload *dto.CreateReviewRequestDTO) (*models.Review, error) {
	fmt.Println("Creating review", "userId", payload.UserId, "hotelId", payload.HotelId, "rating", payload.Rating)

	if payload.Rating < 1 || payload.Rating > 5 {
		return nil, fmt.Errorf("rating must be between 1 and 5")
	}

	// Check if stay is completed (eligibility) — also get the real hotelId
	// tied to this booking, so we don't trust whatever the client sent.
	eligible, realHotelId, err := r.reviewRepository.CheckEligibility(payload.BookingId, payload.UserId)
	if err != nil {
		logger.Log.Error("Error checking eligibility", "error", err)
		return nil, fmt.Errorf("failed to check eligibility")
	}
	if !eligible {
		return nil, fmt.Errorf("not eligible to review this booking")
	}

	// if already reviewed
	existing, err := r.reviewRepository.CheckExistingReview(payload.BookingId)
	if err != nil {
		logger.Log.Error("Error checking existing review", "error", err)
		return nil, fmt.Errorf("failed to check existing review")
	}
	if existing {
		return nil, fmt.Errorf("already reviewed this booking")
	}

	review, err := r.reviewRepository.Create(payload.UserId, payload.BookingId, realHotelId, payload.Comment, payload.Rating)
	if err != nil {
		logger.Log.Error("Error creating review", "error", err)
		return nil, err
	}

	logger.Log.Info("Review created successfully", "reviewId", review.Id)
	return review, nil
}

func (r *ReviewServiceImpl) UpdateReview(id string, userId int64, payload *dto.UpdateReviewRequestDTO) (*models.Review, error) {
	fmt.Println("Updating review", "reviewId", id)

	idInt, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		logger.Log.Error("Error parsing review ID", "error", err, "reviewId", id)
		return nil, fmt.Errorf("invalid review ID")
	}

	review, err := r.reviewRepository.GetByID(idInt)
	if err != nil {
		return nil, fmt.Errorf("review not found")
	}
	if review.UserId != userId {
		return nil, fmt.Errorf("not authorized to update this review")
	}

	if payload.Rating < 1 || payload.Rating > 5 {
		return nil, fmt.Errorf("rating must be between 1 and 5")
	}

	updated, err := r.reviewRepository.Update(idInt, payload.Comment, payload.Rating)
	if err != nil {
		logger.Log.Error("Error updating review", "error", err, "reviewId", id)
		return nil, err
	}

	logger.Log.Info("Review updated successfully", "reviewId", updated.Id)
	return updated, nil
}

func (r *ReviewServiceImpl) DeleteReview(id string, userId int64) error {
	fmt.Println("Deleting review", "reviewId", id)

	idInt, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		logger.Log.Error("Error parsing review ID", "error", err, "reviewId", id)
		return fmt.Errorf("invalid review ID")
	}

	review, err := r.reviewRepository.GetByID(idInt)
	if err != nil {
		return fmt.Errorf("review not found")
	}
	if review.UserId != userId {
		return fmt.Errorf("not authorized to delete this review")
	}

	err = r.reviewRepository.Delete(idInt)
	if err != nil {
		logger.Log.Error("Error deleting review", "error", err, "reviewId", id)
		return err
	}

	logger.Log.Info("Review deleted successfully", "reviewId", id)
	return nil
}

func (r *ReviewServiceImpl) GetAllReviews() ([]*models.Review, error) {
	fmt.Println("Fetching all reviews")

	reviews, err := r.reviewRepository.GetAll()
	if err != nil {
		logger.Log.Error("Error fetching reviews", "error", err)
		return nil, err
	}
	return reviews, nil
}

func (r *ReviewServiceImpl) GetReviewsByUserId(userId string) ([]*models.Review, error) {
	fmt.Println("Fetching reviews by user ID", "userId", userId)

	userIdInt, err := strconv.ParseInt(userId, 10, 64)
	if err != nil {
		logger.Log.Error("Error parsing user ID", "error", err, "userId", userId)
		return nil, fmt.Errorf("invalid user ID")
	}

	reviews, err := r.reviewRepository.GetByUserId(userIdInt)
	if err != nil {
		logger.Log.Error("Error fetching reviews by user ID", "error", err, "userId", userId)
		return nil, err
	}
	return reviews, nil
}

func (r *ReviewServiceImpl) GetReviewsByHotelId(hotelId string) ([]*models.Review, error) {
	fmt.Println("Fetching reviews by hotel ID", "hotelId", hotelId)

	hotelIdInt, err := strconv.ParseInt(hotelId, 10, 64)
	if err != nil {
		logger.Log.Error("Error parsing hotel ID", "error", err, "hotelId", hotelId)
		return nil, fmt.Errorf("invalid hotel ID")
	}

	reviews, err := r.reviewRepository.GetByHotelId(hotelIdInt)
	if err != nil {
		logger.Log.Error("Error fetching reviews by hotel ID", "error", err, "hotelId", hotelId)
		return nil, err
	}
	return reviews, nil
}

func (r *ReviewServiceImpl) GetReviewsByBookingId(bookingId string) ([]*models.Review, error) {
	fmt.Println("Fetching reviews by booking ID", "bookingId", bookingId)

	bookingIdInt, err := strconv.ParseInt(bookingId, 10, 64)
	if err != nil {
		logger.Log.Error("Error parsing booking ID", "error", err, "bookingId", bookingId)
		return nil, fmt.Errorf("invalid booking ID")
	}

	reviews, err := r.reviewRepository.GetByBookingId(bookingIdInt)
	if err != nil {
		logger.Log.Error("Error fetching reviews by booking ID", "error", err, "bookingId", bookingId)
		return nil, err
	}
	return reviews, nil
}

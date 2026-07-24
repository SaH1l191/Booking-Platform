package respositories

import (
	"ReviewService/models"
	"ReviewService/pkg/logger"
	"database/sql"
	"fmt"
)

type ReviewRepository interface {
	GetByID(id int64) (*models.Review, error)
	Create(userId int64, bookingId int64, hotelId int64, comment string, rating int) (*models.Review, error)
	Update(id int64, comment string, rating int) (*models.Review, error)
	Delete(id int64) error
	GetAll() ([]*models.Review, error)
	GetByUserId(userId int64) ([]*models.Review, error)
	GetByHotelId(hotelId int64) ([]*models.Review, error)
	GetByBookingId(bookingId int64) ([]*models.Review, error)
	CheckEligibility(bookingId int64) (bool, error)
	CheckExistingReview(bookingId int64) (bool, error)
}

type ReviewRepositoryImpl struct {
	db *sql.DB
}

func NewReviewRepository(db *sql.DB) ReviewRepository { //interfaec alreayd pointers to the struct
	return &ReviewRepositoryImpl{
		db: db,
	}
}

func (r *ReviewRepositoryImpl) GetAll() ([]*models.Review, error) {
	query := "SELECT id, user_id, booking_id, hotel_id, comment, rating, created_at, updated_at, deleted_at, is_synced FROM reviews WHERE deleted_at IS NULL"
	rows, err := r.db.Query(query)
	if err != nil {
		logger.Log.Error("Error fetching reviews", "error", err)
		return nil, err
	}
	defer rows.Close()

	var reviews []*models.Review
	for rows.Next() {
		review := &models.Review{}
		if err := rows.Scan(&review.Id, &review.UserId, &review.BookingId, &review.HotelId, &review.Comment, &review.Rating, &review.CreatedAt, &review.UpdatedAt, &review.DeletedAt, &review.IsSynced); err != nil {
			logger.Log.Error("Error scanning review", "error", err)
			return nil, err
		}
		reviews = append(reviews, review)
	}

	if err := rows.Err(); err != nil {
		logger.Log.Error("Error iterating review rows", "error", err)
		return nil, err
	}

	return reviews, nil
}

func (r *ReviewRepositoryImpl) GetByID(id int64) (*models.Review, error) {
	query := "SELECT id, user_id, booking_id, hotel_id, comment, rating, created_at, updated_at, deleted_at, is_synced FROM reviews WHERE id = ? AND deleted_at IS NULL"
	row := r.db.QueryRow(query, id)

	review := &models.Review{}
	err := row.Scan(&review.Id, &review.UserId, &review.BookingId, &review.HotelId, &review.Comment, &review.Rating, &review.CreatedAt, &review.UpdatedAt, &review.DeletedAt, &review.IsSynced)

	if err != nil {
		if err == sql.ErrNoRows {
			logger.Log.Warn("No review found with the given ID", "reviewId", id)
			return nil, err
		} else {
			logger.Log.Error("Error scanning review", "error", err, "reviewId", id)
			return nil, err
		}
	}

	return review, nil
}

func (r *ReviewRepositoryImpl) Create(userId int64, bookingId int64, hotelId int64, comment string, rating int) (*models.Review, error) {
	query := "INSERT INTO reviews (user_id, booking_id, hotel_id, comment, rating) VALUES (?, ?, ?, ?, ?)"
	result, err := r.db.Exec(query, userId, bookingId, hotelId, comment, rating)

	if err != nil {
		logger.Log.Error("Error creating review", "error", err, "userId", userId, "hotelId", hotelId)
		return nil, err
	}

	lastInsertID, rowErr := result.LastInsertId()
	if rowErr != nil {
		logger.Log.Error("Error getting last insert ID", "error", rowErr)
		return nil, rowErr
	}

	review := &models.Review{
		Id:        lastInsertID,
		UserId:    userId,
		BookingId: bookingId,
		HotelId:   hotelId,
		Comment:   comment,
		Rating:    rating,
		IsSynced:  false,
	}

	logger.Log.Info("Review created successfully", "reviewId", review.Id, "userId", userId, "hotelId", hotelId)
	return review, nil
}

func (r *ReviewRepositoryImpl) Update(id int64, comment string, rating int) (*models.Review, error) {
	query := "UPDATE reviews SET comment = ?, rating = ? WHERE id = ? AND deleted_at IS NULL"
	result, err := r.db.Exec(query, comment, rating, id)

	if err != nil {
		logger.Log.Error("Error updating review", "error", err, "reviewId", id)
		return nil, err
	}

	rowsAffected, rowErr := result.RowsAffected()
	if rowErr != nil {
		logger.Log.Error("Error getting rows affected", "error", rowErr)
		return nil, rowErr
	}
	if rowsAffected == 0 {
		logger.Log.Warn("No rows were affected, review not found or already deleted", "reviewId", id)
		return nil, fmt.Errorf("review not found")
	}

	return r.GetByID(id)
}

func (r *ReviewRepositoryImpl) Delete(id int64) error {
	query := "UPDATE reviews SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL"
	result, err := r.db.Exec(query, id)

	if err != nil {
		logger.Log.Error("Error deleting review", "error", err, "reviewId", id)
		return err
	}

	rowsAffected, rowErr := result.RowsAffected()
	if rowErr != nil {
		logger.Log.Error("Error getting rows affected", "error", rowErr)
		return rowErr
	}
	if rowsAffected == 0 {
		logger.Log.Warn("No rows were affected, review not found or already deleted", "reviewId", id)
		return fmt.Errorf("review not found")
	}
	logger.Log.Info("Review deleted successfully", "reviewId", id, "rowsAffected", rowsAffected)
	return nil
}

func (r *ReviewRepositoryImpl) GetByUserId(userId int64) ([]*models.Review, error) {
	query := "SELECT id, user_id, booking_id, hotel_id, comment, rating, created_at, updated_at, deleted_at, is_synced FROM reviews WHERE user_id = ? AND deleted_at IS NULL"
	rows, err := r.db.Query(query, userId)
	if err != nil {
		logger.Log.Error("Error fetching reviews by user ID", "error", err, "userId", userId)
		return nil, err
	}
	defer rows.Close()

	var reviews []*models.Review
	for rows.Next() {
		review := &models.Review{}
		if err := rows.Scan(&review.Id, &review.UserId, &review.BookingId, &review.HotelId, &review.Comment, &review.Rating, &review.CreatedAt, &review.UpdatedAt, &review.DeletedAt, &review.IsSynced); err != nil {
			logger.Log.Error("Error scanning review", "error", err)
			return nil, err
		}
		reviews = append(reviews, review)
	}

	if err := rows.Err(); err != nil {
		logger.Log.Error("Error iterating review rows", "error", err)
		return nil, err
	}

	return reviews, nil
}

func (r *ReviewRepositoryImpl) GetByHotelId(hotelId int64) ([]*models.Review, error) {
	query := "SELECT id, user_id, booking_id, hotel_id, comment, rating, created_at, updated_at, deleted_at, is_synced FROM reviews WHERE hotel_id = ? AND deleted_at IS NULL"
	rows, err := r.db.Query(query, hotelId)
	if err != nil {
		logger.Log.Error("Error fetching reviews by hotel ID", "error", err, "hotelId", hotelId)
		return nil, err
	}
	defer rows.Close()

	var reviews []*models.Review
	for rows.Next() {
		review := &models.Review{}
		if err := rows.Scan(&review.Id, &review.UserId, &review.BookingId, &review.HotelId, &review.Comment, &review.Rating, &review.CreatedAt, &review.UpdatedAt, &review.DeletedAt, &review.IsSynced); err != nil {
			logger.Log.Error("Error scanning review", "error", err)
			return nil, err
		}
		reviews = append(reviews, review)
	}

	if err := rows.Err(); err != nil {
		logger.Log.Error("Error iterating review rows", "error", err)
		return nil, err
	}

	return reviews, nil
}

func (r *ReviewRepositoryImpl) GetByBookingId(bookingId int64) ([]*models.Review, error) {
	query := "SELECT id, user_id, booking_id, hotel_id, comment, rating, created_at, updated_at, deleted_at, is_synced FROM reviews WHERE booking_id = ? AND deleted_at IS NULL"
	rows, err := r.db.Query(query, bookingId)
	if err != nil {
		logger.Log.Error("Error fetching reviews by booking ID", "error", err, "bookingId", bookingId)
		return nil, err
	}
	defer rows.Close()

	var reviews []*models.Review
	for rows.Next() {
		review := &models.Review{}
		if err := rows.Scan(&review.Id, &review.UserId, &review.BookingId, &review.HotelId, &review.Comment, &review.Rating, &review.CreatedAt, &review.UpdatedAt, &review.DeletedAt, &review.IsSynced); err != nil {
			logger.Log.Error("Error scanning review", "error", err)
			return nil, err
		}
		reviews = append(reviews, review)
	}

	if err := rows.Err(); err != nil {
		logger.Log.Error("Error iterating review rows", "error", err)
		return nil, err
	}

	return reviews, nil
}

func (r *ReviewRepositoryImpl) CheckEligibility(bookingId int64) (bool, error) {
	query := "SELECT eligible FROM review_eligibility WHERE booking_id = ?"
	var eligible bool
	err := r.db.QueryRow(query, bookingId).Scan(&eligible)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		logger.Log.Error("Error checking eligibility", "error", err, "bookingId", bookingId)
		return false, err
	}
	return eligible, nil
}

func (r *ReviewRepositoryImpl) CheckExistingReview(bookingId int64) (bool, error) {
	query := "SELECT COUNT(*) FROM reviews WHERE booking_id = ? AND deleted_at IS NULL"
	var count int
	err := r.db.QueryRow(query, bookingId).Scan(&count)
	if err != nil {
		logger.Log.Error("Error checking existing review", "error", err, "bookingId", bookingId)
		return false, err
	}
	return count > 0, nil
}

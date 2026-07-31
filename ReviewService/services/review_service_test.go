package services
import (
	respositories "ReviewService/db/repositories"
	"ReviewService/dto"
	"ReviewService/models"
	"ReviewService/pkg/logger"
	"database/sql"
	"fmt"
	"os"
	"strings"
	"sync"
	"testing"
	_ "github.com/go-sql-driver/mysql"
)

var testDB *sql.DB

func TestMain(m *testing.M) {
	logger.Init("ReviewService-Test", "../logs/review-service-test.log")

	dsn := "root:root@tcp(127.0.0.1:3306)/"
	rootDB, err := sql.Open("mysql", dsn)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to open root DB: %v\n", err)
		os.Exit(1)
	}
	if err := rootDB.Ping(); err != nil {
		fmt.Fprintf(os.Stderr, "failed to ping root DB: %v\n", err)
		os.Exit(1)
	}

	if _, err := rootDB.Exec("CREATE DATABASE IF NOT EXISTS review_service_test"); err != nil {
		fmt.Fprintf(os.Stderr, "failed to create test DB: %v\n", err)
		os.Exit(1)
	}
	rootDB.Close()

	testDSN := "root:root@tcp(127.0.0.1:3306)/review_service_test?parseTime=true"
	testDB, err = sql.Open("mysql", testDSN)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to open test DB: %v\n", err)
		os.Exit(1)
	}
	if err := testDB.Ping(); err != nil {
		fmt.Fprintf(os.Stderr, "failed to ping test DB: %v\n", err)
		os.Exit(1)
	}

	createTables()

	os.Exit(m.Run())
}

func createTables() {
	migrations := []string{
		`CREATE TABLE IF NOT EXISTS reviews (
			id BIGINT AUTO_INCREMENT PRIMARY KEY,
			user_id BIGINT NOT NULL,
			booking_id BIGINT NOT NULL,
			hotel_id BIGINT NOT NULL,
			comment TEXT NOT NULL,
			rating INT NOT NULL,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			deleted_at TIMESTAMP NULL,
			is_synced BOOLEAN NOT NULL DEFAULT FALSE,
			INDEX idx_user_id (user_id),
			INDEX idx_booking_id (booking_id),
			INDEX idx_hotel_id (hotel_id)
		)`,
		`CREATE TABLE IF NOT EXISTS review_eligibility (
			id BIGINT AUTO_INCREMENT PRIMARY KEY,
			booking_id BIGINT NOT NULL UNIQUE,
			user_id BIGINT NOT NULL,
			hotel_id BIGINT NOT NULL,
			room_id BIGINT NOT NULL,
			eligible BOOLEAN DEFAULT FALSE,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS processed_events (
			event_id VARCHAR(36) PRIMARY KEY,
			processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
	}

	for _, m := range migrations {
		if _, err := testDB.Exec(m); err != nil {
			fmt.Fprintf(os.Stderr, "failed to create table: %v\n", err)
			os.Exit(1)
		}
	}

	// Add the conditional unique index for concurrent review prevention.
	// MySQL doesn't support CREATE INDEX IF NOT EXISTS, so we check first.
	var indexExists int
	_ = testDB.QueryRow("SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = 'review_service_test' AND table_name = 'reviews' AND index_name = 'idx_reviews_active_booking'").Scan(&indexExists)
	if indexExists == 0 {
		_, err := testDB.Exec(`CREATE UNIQUE INDEX idx_reviews_active_booking ON reviews ((CASE WHEN deleted_at IS NULL THEN booking_id END))`)
		if err != nil {
			fmt.Fprintf(os.Stderr, "failed to create unique index: %v\n", err)
			os.Exit(1)
		}
	}
}

func truncateAll() {
	testDB.Exec("SET FOREIGN_KEY_CHECKS = 0")
	testDB.Exec("TRUNCATE TABLE reviews")
	testDB.Exec("TRUNCATE TABLE review_eligibility")
	testDB.Exec("TRUNCATE TABLE processed_events")
	testDB.Exec("SET FOREIGN_KEY_CHECKS = 1")
}

func newTestService() ReviewService {
	repo := respositories.NewReviewRepository(testDB)
	return NewReviewService(repo)
}

func insertEligibility(t *testing.T, bookingID, userID, hotelID, roomID int64) {
	t.Helper()
	_, err := testDB.Exec(
		"INSERT INTO review_eligibility (booking_id, user_id, hotel_id, room_id, eligible) VALUES (?, ?, ?, ?, TRUE)",
		bookingID, userID, hotelID, roomID,
	)
	if err != nil {
		t.Fatalf("failed to insert eligibility: %v", err)
	}
}

func getReviewByBookingID(t *testing.T, bookingID int64) *models.Review {
	t.Helper()
	row := testDB.QueryRow(
		"SELECT id, user_id, booking_id, hotel_id, comment, rating, created_at, updated_at, deleted_at, is_synced FROM reviews WHERE booking_id = ? AND deleted_at IS NULL",
		bookingID,
	)
	review := &models.Review{}
	err := row.Scan(&review.Id, &review.UserId, &review.BookingId, &review.HotelId, &review.Comment, &review.Rating, &review.CreatedAt, &review.UpdatedAt, &review.DeletedAt, &review.IsSynced)
	if err != nil {
		t.Fatalf("failed to get review by booking_id: %v", err)
	}
	return review
}

func getEligibilityByBookingID(t *testing.T, bookingID int64) (eligible bool, hotelID int64) {
	t.Helper()
	err := testDB.QueryRow(
		"SELECT eligible, hotel_id FROM review_eligibility WHERE booking_id = ?", bookingID,
	).Scan(&eligible, &hotelID)
	if err != nil {
		t.Fatalf("failed to get eligibility: %v", err)
	}
	return
}

func countEligibilityByBookingID(t *testing.T, bookingID int64) int {
	t.Helper()
	var count int
	err := testDB.QueryRow(
		"SELECT COUNT(*) FROM review_eligibility WHERE booking_id = ?", bookingID,
	).Scan(&count)
	if err != nil {
		t.Fatalf("failed to count eligibility: %v", err)
	}
	return count
}

func insertProcessedEvent(t *testing.T, eventID string) {
	t.Helper()
	_, err := testDB.Exec("INSERT IGNORE INTO processed_events (event_id) VALUES (?)", eventID)
	if err != nil {
		t.Fatalf("failed to insert processed event: %v", err)
	}
}

func existsProcessedEvent(t *testing.T, eventID string) bool {
	t.Helper()
	var exists bool
	err := testDB.QueryRow("SELECT EXISTS(SELECT 1 FROM processed_events WHERE event_id = ?)", eventID).Scan(&exists)
	if err != nil {
		t.Fatalf("failed to check processed event: %v", err)
	}
	return exists
}

// --- Creation ---

func TestCreateReview_EligibleUser(t *testing.T) {
	truncateAll()
	svc := newTestService()

	var bookingID int64 = 1001
	var userID int64 = 10
	var hotelID int64 = 50

	insertEligibility(t, bookingID, userID, hotelID, 1)

	payload := &dto.CreateReviewRequestDTO{
		UserId:    userID,
		BookingId: bookingID,
		HotelId:   hotelID,
		Comment:   "Great stay!",
		Rating:    5,
	}

	review, err := svc.CreateReview(payload)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if review.Id == 0 {
		t.Fatal("expected non-zero review ID")
	}
	if review.UserId != userID {
		t.Errorf("UserId = %d, want %d", review.UserId, userID)
	}
	if review.BookingId != bookingID {
		t.Errorf("BookingId = %d, want %d", review.BookingId, bookingID)
	}
	if review.HotelId != hotelID {
		t.Errorf("HotelId = %d, want %d", review.HotelId, hotelID)
	}
	if review.Rating != 5 {
		t.Errorf("Rating = %d, want 5", review.Rating)
	}
	if review.Comment != "Great stay!" {
		t.Errorf("Comment = %q, want %q", review.Comment, "Great stay!")
	}

	dbReview := getReviewByBookingID(t, bookingID)
	if dbReview.Id != review.Id {
		t.Errorf("DB review ID = %d, want %d", dbReview.Id, review.Id)
	}
}

func TestCreateReview_RatingOutside1To5(t *testing.T) {
	truncateAll()
	svc := newTestService()

	payload := &dto.CreateReviewRequestDTO{
		UserId:    10,
		BookingId: 1001,
		HotelId:   50,
		Comment:   "Bad rating",
		Rating:    0,
	}

	_, err := svc.CreateReview(payload)
	if err == nil {
		t.Fatal("expected error for rating 0, got nil")
	}
	if !strings.Contains(err.Error(), "rating must be between 1 and 5") {
		t.Errorf("error = %q, want it to contain %q", err.Error(), "rating must be between 1 and 5")
	}

	payload.Rating = 6
	_, err = svc.CreateReview(payload)
	if err == nil {
		t.Fatal("expected error for rating 6, got nil")
	}
	if !strings.Contains(err.Error(), "rating must be between 1 and 5") {
		t.Errorf("error = %q, want it to contain %q", err.Error(), "rating must be between 1 and 5")
	}
}

// --- Conflict: eligibility & ownership ---

func TestCreateReview_NoEligibility(t *testing.T) {
	truncateAll()
	svc := newTestService()

	payload := &dto.CreateReviewRequestDTO{
		UserId:    10,
		BookingId: 9999,
		HotelId:   50,
		Comment:   "Should fail",
		Rating:    3,
	}

	_, err := svc.CreateReview(payload)
	if err == nil {
		t.Fatal("expected error for no eligibility, got nil")
	}
	if !strings.Contains(err.Error(), "not eligible to review this booking") {
		t.Errorf("error = %q, want it to contain %q", err.Error(), "not eligible to review this booking")
	}
}

func TestCreateReview_EligibilityForDifferentUser(t *testing.T) {
	truncateAll()
	svc := newTestService()

	var bookingID int64 = 2001
	var ownerID int64 = 10
	var otherUserID int64 = 99
	var hotelID int64 = 50

	insertEligibility(t, bookingID, ownerID, hotelID, 1)

	payload := &dto.CreateReviewRequestDTO{
		UserId:    otherUserID,
		BookingId: bookingID,
		HotelId:   hotelID,
		Comment:   "Not my booking",
		Rating:    4,
	}

	_, err := svc.CreateReview(payload)
	if err == nil {
		t.Fatal("expected error for different user, got nil")
	}
	if !strings.Contains(err.Error(), "not eligible to review this booking") {
		t.Errorf("error = %q, want it to contain %q", err.Error(), "not eligible to review this booking")
	}
}

func TestCreateReview_AlreadyReviewed(t *testing.T) {
	truncateAll()
	svc := newTestService()

	var bookingID int64 = 3001
	var userID int64 = 10
	var hotelID int64 = 50

	insertEligibility(t, bookingID, userID, hotelID, 1)

	payload := &dto.CreateReviewRequestDTO{
		UserId:    userID,
		BookingId: bookingID,
		HotelId:   hotelID,
		Comment:   "First review",
		Rating:    5,
	}

	_, err := svc.CreateReview(payload)
	if err != nil {
		t.Fatalf("first create failed: %v", err)
	}

	payload.Comment = "Second review attempt"
	_, err = svc.CreateReview(payload)
	if err == nil {
		t.Fatal("expected error for duplicate review, got nil")
	}
	if !strings.Contains(err.Error(), "already reviewed this booking") {
		t.Errorf("error = %q, want it to contain %q", err.Error(), "already reviewed this booking")
	}
}

func TestCreateReview_ConcurrentCalls(t *testing.T) {
	truncateAll()
	svc := newTestService()

	var bookingID int64 = 4001
	var userID int64 = 10
	var hotelID int64 = 50

	insertEligibility(t, bookingID, userID, hotelID, 1)

	var wg sync.WaitGroup
	type result struct {
		review *models.Review
		err    error
	}
	results := make(chan result, 2)

	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			payload := &dto.CreateReviewRequestDTO{
				UserId:    userID,
				BookingId: bookingID,
				HotelId:   hotelID,
				Comment:   "Concurrent review",
				Rating:    4,
			}
			r, err := svc.CreateReview(payload)
			results <- result{r, err}
		}()
	}

	wg.Wait()
	close(results)

	var succeeded, failed int
	for r := range results {
		if r.err == nil {
			succeeded++
		} else {
			failed++
		}
	}

	if succeeded != 1 || failed != 1 {
		t.Errorf("expected 1 success and 1 failure, got %d success and %d failure", succeeded, failed)
	}
}

func TestCreateReview_HotelIdFromEligibilityNotPayload(t *testing.T) {
	truncateAll()
	svc := newTestService()

	var bookingID int64 = 5001
	var userID int64 = 10
	var realHotelID int64 = 99
	var spoofedHotelID int64 = 1

	insertEligibility(t, bookingID, userID, realHotelID, 1)

	payload := &dto.CreateReviewRequestDTO{
		UserId:    userID,
		BookingId: bookingID,
		HotelId:   spoofedHotelID,
		Comment:   "Testing hotel ID spoofing",
		Rating:    5,
	}

	review, err := svc.CreateReview(payload)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if review.HotelId != realHotelID {
		t.Errorf("HotelId = %d, want %d (should come from eligibility, not payload)", review.HotelId, realHotelID)
	}

	dbReview := getReviewByBookingID(t, bookingID)
	if dbReview.HotelId != realHotelID {
		t.Errorf("DB HotelId = %d, want %d", dbReview.HotelId, realHotelID)
	}
}

// --- Event-driven: stay-completed → eligibility ---

func TestStayCompleted_CreatesEligibility(t *testing.T) {
	truncateAll()

	var bookingID int64 = 6001
	var userID int64 = 10
	var hotelID int64 = 50
	var roomID int64 = 1
	eventID := "evt-stay-completed-001"

	// Simulate what the consumer does for BOOKING_STAY_COMPLETED
	_, err := testDB.Exec(
		"INSERT INTO review_eligibility (booking_id, user_id, hotel_id, room_id, eligible) VALUES (?, ?, ?, ?, TRUE)",
		bookingID, userID, hotelID, roomID,
	)
	if err != nil {
		t.Fatalf("failed to insert eligibility: %v", err)
	}
	insertProcessedEvent(t, eventID)

	eligible, gotHotelID := getEligibilityByBookingID(t, bookingID)
	if !eligible {
		t.Error("expected eligible=true")
	}
	if gotHotelID != hotelID {
		t.Errorf("hotel_id = %d, want %d", gotHotelID, hotelID)
	}
	if !existsProcessedEvent(t, eventID) {
		t.Error("expected processed_events row to exist")
	}
}

func TestStayCompleted_SameEventIdTwice_NoDuplicate(t *testing.T) {
	truncateAll()

	var bookingID int64 = 6002
	var userID int64 = 10
	var hotelID int64 = 50
	var roomID int64 = 1
	eventID := "evt-stay-completed-002"

	// First delivery: insert eligibility
	_, err := testDB.Exec(
		"INSERT INTO review_eligibility (booking_id, user_id, hotel_id, room_id, eligible) VALUES (?, ?, ?, ?, TRUE)",
		bookingID, userID, hotelID, roomID,
	)
	if err != nil {
		t.Fatalf("first insert failed: %v", err)
	}
	insertProcessedEvent(t, eventID)

	// Second delivery: same event_id → should be deduplicated
	// In the consumer, the dedup check happens first and short-circuits.
	// But even if it didn't, the UNIQUE on booking_id prevents duplicate eligibility rows.
	_, err = testDB.Exec(
		"INSERT INTO review_eligibility (booking_id, user_id, hotel_id, room_id, eligible) VALUES (?, ?, ?, ?, TRUE)",
		bookingID, userID, hotelID, roomID,
	)
	if err == nil {
		t.Fatal("expected duplicate insert to fail due to UNIQUE constraint on booking_id")
	}

	count := countEligibilityByBookingID(t, bookingID)
	if count != 1 {
		t.Errorf("expected 1 eligibility row, got %d", count)
	}
}

func TestStayCompleted_ExistingEligibility_SafeNoop(t *testing.T) {
	truncateAll()

	var bookingID int64 = 6003
	var userID int64 = 10
	var hotelID int64 = 50
	var roomID int64 = 1

	// Pre-existing eligibility (simulating a previous delivery that already created it)
	insertEligibility(t, bookingID, userID, hotelID, roomID)

	// Consumer logic: check if exists → yes → skip insert, just mark event processed
	var exists bool
	err := testDB.QueryRow("SELECT EXISTS(SELECT 1 FROM review_eligibility WHERE booking_id = ?)", bookingID).Scan(&exists)
	if err != nil {
		t.Fatalf("failed to check eligibility: %v", err)
	}
	if !exists {
		t.Fatal("expected eligibility to exist")
	}

	// Verify no duplicate was created
	count := countEligibilityByBookingID(t, bookingID)
	if count != 1 {
		t.Errorf("expected 1 eligibility row (safe no-op), got %d", count)
	}

	// Verify the existing row is intact
	eligible, gotHotelID := getEligibilityByBookingID(t, bookingID)
	if !eligible {
		t.Error("expected eligible=true")
	}
	if gotHotelID != hotelID {
		t.Errorf("hotel_id = %d, want %d", gotHotelID, hotelID)
	}
}



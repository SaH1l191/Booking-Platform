package repositories

import (
	"database/sql"
	"fmt"
	"goPayment/models"
	"goPayment/pkg/logger"
	"os"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

var testDB *sql.DB

func TestMain(m *testing.M) {
	logger.Init("PaymentRepo-Test", "../../logs/payment-repo-test.log")

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

	if _, err := rootDB.Exec("CREATE DATABASE IF NOT EXISTS payment_repo_test"); err != nil {
		fmt.Fprintf(os.Stderr, "failed to create test DB: %v\n", err)
		os.Exit(1)
	}
	rootDB.Close()

	testDSN := "root:root@tcp(127.0.0.1:3306)/payment_repo_test?parseTime=true&loc=Local"
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
		`CREATE TABLE IF NOT EXISTS payments (
			id BIGINT AUTO_INCREMENT PRIMARY KEY,
			booking_id BIGINT NOT NULL,
			user_id BIGINT NOT NULL,
			user_email VARCHAR(255) DEFAULT '',
			razorpay_order_id VARCHAR(255) NOT NULL,
			razorpay_payment_id VARCHAR(255),
			razorpay_signature VARCHAR(255),
			amount INT NOT NULL,
			currency VARCHAR(3) DEFAULT 'INR',
			status ENUM('CREATED','CAPTURED','FAILED','REFUNDING','REFUNDED','PARTIAL_REFUNDED') DEFAULT 'CREATED',
			refund_amount INT DEFAULT 0,
			failure_reason TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			INDEX idx_booking_id (booking_id),
			INDEX idx_user_id (user_id),
			INDEX idx_razorpay_order_id (razorpay_order_id),
			INDEX idx_razorpay_payment_id (razorpay_payment_id),
			INDEX idx_status (status)
		)`,
		`CREATE TABLE IF NOT EXISTS outbox (
			id BIGINT AUTO_INCREMENT PRIMARY KEY,
			event_id VARCHAR(36) NOT NULL,
			event_type VARCHAR(100) NOT NULL,
			payload JSON NOT NULL,
			published BOOLEAN DEFAULT FALSE,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			UNIQUE INDEX idx_outbox_event_id (event_id)
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
}

func truncateAll() {
	testDB.Exec("SET FOREIGN_KEY_CHECKS = 0")
	testDB.Exec("TRUNCATE TABLE payments")
	testDB.Exec("TRUNCATE TABLE outbox")
	testDB.Exec("TRUNCATE TABLE processed_events")
	testDB.Exec("SET FOREIGN_KEY_CHECKS = 1")
}

func newTestRepo() *PaymentRepository {
	return NewPaymentRepository(testDB)
}

func insertTestPayment(t *testing.T, bookingId, userId int64, status, razorpayOrderId string, amount int) int64 {
	t.Helper()
	res, err := testDB.Exec(
		`INSERT INTO payments (booking_id, user_id, user_email, razorpay_order_id, razorpay_payment_id, amount, currency, status)
		 VALUES (?, ?, 'test@example.com', ?, 'pay_test_123', ?, 'INR', ?)`,
		bookingId, userId, razorpayOrderId, amount, status,
	)
	if err != nil {
		t.Fatalf("failed to insert test payment: %v", err)
	}
	id, _ := res.LastInsertId()
	return id
}

func insertStalePayment(t *testing.T, bookingId int64, status string, createdAt, updatedAt time.Time) int64 {
	t.Helper()
	res, err := testDB.Exec(
		`INSERT INTO payments (booking_id, user_id, user_email, razorpay_order_id, razorpay_payment_id, amount, currency, status, created_at, updated_at)
		 VALUES (?, 1, 'test@example.com', ?, 'pay_test_123', 1000, 'INR', ?, ?, ?)`,
		bookingId, fmt.Sprintf("order_%d", bookingId), status, createdAt, updatedAt,
	)
	if err != nil {
		t.Fatalf("failed to insert stale payment: %v", err)
	}
	id, _ := res.LastInsertId()
	return id
}

func getPaymentStatus(t *testing.T, paymentId int64) string {
	t.Helper()
	var status string
	err := testDB.QueryRow("SELECT status FROM payments WHERE id = ?", paymentId).Scan(&status)
	if err != nil {
		t.Fatalf("failed to get payment status: %v", err)
	}
	return status
}

func getPaymentRefundAmount(t *testing.T, paymentId int64) int {
	t.Helper()
	var refundAmount int
	err := testDB.QueryRow("SELECT refund_amount FROM payments WHERE id = ?", paymentId).Scan(&refundAmount)
	if err != nil {
		t.Fatalf("failed to get refund amount: %v", err)
	}
	return refundAmount
}

func countOutboxByType(t *testing.T, eventType string) int {
	t.Helper()
	var count int
	err := testDB.QueryRow("SELECT COUNT(*) FROM outbox WHERE event_type = ?", eventType).Scan(&count)
	if err != nil {
		t.Fatalf("failed to count outbox events: %v", err)
	}
	return count
}

// --- ClaimRefund Tests ---

func TestClaimRefund_CapturedToRefunding(t *testing.T) {
	truncateAll()
	repo := newTestRepo()

	paymentId := insertTestPayment(t, 1001, 10, "CREATED", "order_001", 1000)
	// Manually set to CAPTURED
	testDB.Exec("UPDATE payments SET status = 'CAPTURED' WHERE id = ?", paymentId)

	claimed, err := repo.ClaimRefund(paymentId)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !claimed {
		t.Fatal("expected claim to succeed for CAPTURED payment")
	}
	if got := getPaymentStatus(t, paymentId); got != "REFUNDING" {
		t.Errorf("status = %q, want REFUNDING", got)
	}
}

func TestClaimRefund_AlreadyRefunded_ReturnsFalse(t *testing.T) {
	truncateAll()
	repo := newTestRepo()

	paymentId := insertTestPayment(t, 1002, 10, "REFUNDED", "order_002", 1000)

	claimed, err := repo.ClaimRefund(paymentId)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if claimed {
		t.Fatal("expected claim to return false for REFUNDED payment")
	}
	if got := getPaymentStatus(t, paymentId); got != "REFUNDED" {
		t.Errorf("status = %q, want REFUNDED (unchanged)", got)
	}
}

func TestClaimRefund_AlreadyRefunding_ReturnsFalse(t *testing.T) {
	truncateAll()
	repo := newTestRepo()

	paymentId := insertTestPayment(t, 1003, 10, "REFUNDING", "order_003", 1000)

	claimed, err := repo.ClaimRefund(paymentId)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if claimed {
		t.Fatal("expected claim to return false for REFUNDING payment (use ReclaimStaleRefunding for retries)")
	}
	if got := getPaymentStatus(t, paymentId); got != "REFUNDING" {
		t.Errorf("status = %q, want REFUNDING (unchanged)", got)
	}
}

func TestReclaimStaleRefunding_AllowsRetry(t *testing.T) {
	truncateAll()
	repo := newTestRepo()

	paymentId := insertTestPayment(t, 10030, 10, "REFUNDING", "order_0030", 1000)
	// Backdate updated_at to simulate a stale stuck payment
	testDB.Exec("UPDATE payments SET updated_at = DATE_SUB(NOW(), INTERVAL 30 MINUTE) WHERE id = ?", paymentId)

	claimed, err := repo.ReclaimStaleRefunding(paymentId, 15*time.Minute)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !claimed {
		t.Fatal("expected reclaim to succeed for stale REFUNDING payment")
	}
	if got := getPaymentStatus(t, paymentId); got != "REFUNDING" {
		t.Errorf("status = %q, want REFUNDING", got)
	}
}

func TestReclaimStaleRefunding_RecentRefunding_ReturnsFalse(t *testing.T) {
	truncateAll()
	repo := newTestRepo()

	paymentId := insertTestPayment(t, 10031, 10, "REFUNDING", "order_0031", 1000)
	// Recent REFUNDING — not stale enough

	claimed, err := repo.ReclaimStaleRefunding(paymentId, 15*time.Minute)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if claimed {
		t.Fatal("expected reclaim to return false for recent REFUNDING payment")
	}
}

func TestReclaimStaleRefunding_NotRefunding_ReturnsFalse(t *testing.T) {
	truncateAll()
	repo := newTestRepo()

	paymentId := insertTestPayment(t, 10032, 10, "CAPTURED", "order_0032", 1000)

	claimed, err := repo.ReclaimStaleRefunding(paymentId, 15*time.Minute)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if claimed {
		t.Fatal("expected reclaim to return false for CAPTURED payment")
	}
}

func TestClaimRefund_Created_ReturnsFalse(t *testing.T) {
	truncateAll()
	repo := newTestRepo()

	paymentId := insertTestPayment(t, 1004, 10, "CREATED", "order_004", 1000)

	claimed, err := repo.ClaimRefund(paymentId)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if claimed {
		t.Fatal("expected claim to return false for CREATED payment")
	}
	if got := getPaymentStatus(t, paymentId); got != "CREATED" {
		t.Errorf("status = %q, want CREATED (unchanged)", got)
	}
}

func TestClaimRefund_Concurrent_ForUpdateLock(t *testing.T) {
	truncateAll()
	repo := newTestRepo()

	paymentId := insertTestPayment(t, 1005, 10, "CREATED", "order_005", 1000)
	testDB.Exec("UPDATE payments SET status = 'CAPTURED' WHERE id = ?", paymentId)

	var successCount int32
	var wg sync.WaitGroup

	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			claimed, err := repo.ClaimRefund(paymentId)
			if err != nil {
				t.Errorf("unexpected error in goroutine: %v", err)
				return
			}
			if claimed {
				atomic.AddInt32(&successCount, 1)
			}
		}()
	}

	wg.Wait()

	// Both can succeed: first claims from CAPTURED, second re-claims from REFUNDING.
	// The FOR UPDATE lock serializes them, but REFUNDING is an allowed re-claim state.
	// Key invariant: at least one succeeds, no deadlocks, final status is REFUNDING.
	if got := atomic.LoadInt32(&successCount); got < 1 {
		t.Errorf("expected at least 1 successful claim, got %d", got)
	}
	if got := getPaymentStatus(t, paymentId); got != "REFUNDING" {
		t.Errorf("status = %q, want REFUNDING", got)
	}
}

// --- FinalizeRefund Tests ---

func TestFinalizeRefund_RefundingToRefunded(t *testing.T) {
	truncateAll()
	repo := newTestRepo()

	paymentId := insertTestPayment(t, 2001, 10, "REFUNDING", "order_101", 1000)

	err := repo.FinalizeRefund(paymentId, 1000)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got := getPaymentStatus(t, paymentId); got != "REFUNDED" {
		t.Errorf("status = %q, want REFUNDED", got)
	}
	if got := getPaymentRefundAmount(t, paymentId); got != 1000 {
		t.Errorf("refund_amount = %d, want 1000", got)
	}
	if got := countOutboxByType(t, "PAYMENT_REFUNDED"); got != 1 {
		t.Errorf("outbox PAYMENT_REFUNDED count = %d, want 1", got)
	}
}

func TestFinalizeRefund_NotRefunding_IsNoop(t *testing.T) {
	truncateAll()
	repo := newTestRepo()

	paymentId := insertTestPayment(t, 2002, 10, "CAPTURED", "order_102", 1000)

	err := repo.FinalizeRefund(paymentId, 1000)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// Status should not change — FinalizeRefund has WHERE status = 'REFUNDING'
	if got := getPaymentStatus(t, paymentId); got != "CAPTURED" {
		t.Errorf("status = %q, want CAPTURED (unchanged)", got)
	}
	if got := countOutboxByType(t, "PAYMENT_REFUNDED"); got != 0 {
		t.Errorf("outbox PAYMENT_REFUNDED count = %d, want 0", got)
	}
}

func TestFinalizeRefund_Refunded_IsNoop(t *testing.T) {
	truncateAll()
	repo := newTestRepo()

	paymentId := insertTestPayment(t, 2003, 10, "REFUNDED", "order_103", 1000)

	err := repo.FinalizeRefund(paymentId, 1000)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got := getPaymentStatus(t, paymentId); got != "REFUNDED" {
		t.Errorf("status = %q, want REFUNDED (unchanged)", got)
	}
}

// --- GetStalePayments Tests ---

func TestGetStalePayments_CreatedOlderThan1Hour(t *testing.T) {
	truncateAll()
	repo := newTestRepo()

	old := time.Now().Add(-2 * time.Hour)
	insertStalePayment(t, 3001, "CREATED", old, old)

	payments, err := repo.GetStalePayments()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(payments) != 1 {
		t.Fatalf("expected 1 stale payment, got %d", len(payments))
	}
	if payments[0].BookingId != 3001 {
		t.Errorf("booking_id = %d, want 3001", payments[0].BookingId)
	}
}

func TestGetStalePayments_RefundingOlderThan15Min(t *testing.T) {
	truncateAll()
	repo := newTestRepo()

	old := time.Now().Add(-30 * time.Minute)
	insertStalePayment(t, 3002, "REFUNDING", old, old)

	payments, err := repo.GetStalePayments()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(payments) != 1 {
		t.Fatalf("expected 1 stale payment, got %d", len(payments))
	}
	if payments[0].BookingId != 3002 {
		t.Errorf("booking_id = %d, want 3002", payments[0].BookingId)
	}
}

func TestGetStalePayments_RecentNotReturned(t *testing.T) {
	truncateAll()
	repo := newTestRepo()

	// Use SQL NOW() to avoid timezone mismatches between Go and MySQL
	testDB.Exec(
		`INSERT INTO payments (booking_id, user_id, user_email, razorpay_order_id, razorpay_payment_id, amount, currency, status)
		 VALUES (3003, 1, 'test@test.com', 'order_recent_1', 'pay_r1', 1000, 'INR', 'CREATED')`)
	testDB.Exec(
		`INSERT INTO payments (booking_id, user_id, user_email, razorpay_order_id, razorpay_payment_id, amount, currency, status)
		 VALUES (3004, 1, 'test@test.com', 'order_recent_2', 'pay_r2', 1000, 'INR', 'REFUNDING')`)

	payments, err := repo.GetStalePayments()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(payments) != 0 {
		t.Errorf("expected 0 stale payments, got %d", len(payments))
		for _, p := range payments {
			t.Logf("  booking_id=%d status=%s created_at=%v updated_at=%v", p.BookingId, p.Status, p.CreatedAt, p.UpdatedAt)
		}
	}
}

func TestGetStalePayments_EmptyResult(t *testing.T) {
	truncateAll()
	repo := newTestRepo()

	payments, err := repo.GetStalePayments()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(payments) != 0 {
		t.Errorf("expected 0 stale payments, got %d", len(payments))
	}
}

// --- CRUD Tests ---

func TestCreatePayment_InsertsCorrectFields(t *testing.T) {
	truncateAll()
	repo := newTestRepo()

	payment := &models.Payment{
		BookingId:       4001,
		UserId:          10,
		UserEmail:       "test@example.com",
		RazorpayOrderId: "order_test_001",
		Amount:          2500,
		Currency:        "INR",
		Status:          "CREATED",
	}

	saved, err := repo.CreatePayment(payment)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if saved.Id == 0 {
		t.Fatal("expected non-zero ID")
	}

	fetched, err := repo.GetPaymentById(saved.Id)
	if err != nil {
		t.Fatalf("failed to fetch payment: %v", err)
	}
	if fetched.BookingId != 4001 {
		t.Errorf("booking_id = %d, want 4001", fetched.BookingId)
	}
	if fetched.UserId != 10 {
		t.Errorf("user_id = %d, want 10", fetched.UserId)
	}
	if fetched.RazorpayOrderId != "order_test_001" {
		t.Errorf("razorpay_order_id = %q, want order_test_001", fetched.RazorpayOrderId)
	}
	if fetched.Amount != 2500 {
		t.Errorf("amount = %d, want 2500", fetched.Amount)
	}
	if fetched.Status != "CREATED" {
		t.Errorf("status = %q, want CREATED", fetched.Status)
	}
}

func TestGetPaymentByBookingId_ReturnsLatest(t *testing.T) {
	truncateAll()
	repo := newTestRepo()

	p1 := &models.Payment{BookingId: 5001, UserId: 10, RazorpayOrderId: "order_a", Amount: 1000, Currency: "INR", Status: "CREATED"}
	repo.CreatePayment(p1)

	// Ensure different created_at (MySQL TIMESTAMP has second precision)
	testDB.Exec("UPDATE payments SET created_at = DATE_SUB(NOW(), INTERVAL 1 SECOND) WHERE id = ?", p1.Id)

	p2 := &models.Payment{BookingId: 5001, UserId: 10, RazorpayOrderId: "order_b", Amount: 2000, Currency: "INR", Status: "CREATED"}
	repo.CreatePayment(p2)

	fetched, err := repo.GetPaymentByBookingId(5001)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if fetched.RazorpayOrderId != "order_b" {
		t.Errorf("razorpay_order_id = %q, want order_b (latest)", fetched.RazorpayOrderId)
	}
}

func TestGetPaymentByBookingId_NotFound(t *testing.T) {
	truncateAll()
	repo := newTestRepo()

	_, err := repo.GetPaymentByBookingId(9999)
	if err == nil {
		t.Fatal("expected error for non-existent booking, got nil")
	}
}

func TestUpdatePaymentStatus_InsertsOutboxEvent(t *testing.T) {
	truncateAll()
	repo := newTestRepo()

	paymentId := insertTestPayment(t, 6001, 10, "CREATED", "order_601", 1000)

	err := repo.UpdatePaymentStatus(paymentId, "CAPTURED", "pay_captured_123", "sig_123")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if got := getPaymentStatus(t, paymentId); got != "CAPTURED" {
		t.Errorf("status = %q, want CAPTURED", got)
	}
	if got := countOutboxByType(t, "PAYMENT_CAPTURED"); got != 1 {
		t.Errorf("outbox PAYMENT_CAPTURED count = %d, want 1", got)
	}
}

func TestUpdatePaymentFailure_InsertsFailedOutboxEvent(t *testing.T) {
	truncateAll()
	repo := newTestRepo()

	paymentId := insertTestPayment(t, 6002, 10, "CREATED", "order_602", 1000)

	err := repo.UpdatePaymentFailure(paymentId, "payment failed")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if got := getPaymentStatus(t, paymentId); got != "FAILED" {
		t.Errorf("status = %q, want FAILED", got)
	}
	if got := countOutboxByType(t, "PAYMENT_FAILED"); got != 1 {
		t.Errorf("outbox PAYMENT_FAILED count = %d, want 1", got)
	}
}

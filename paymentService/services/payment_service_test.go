package services

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"goPayment/db/repositories"
	"goPayment/dto"
	"goPayment/pkg/logger"
	"os"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

var testDB *sql.DB

func TestMain(m *testing.M) {
	logger.Init("PaymentService-Test", "../../logs/payment-service-test.log")

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

	if _, err := rootDB.Exec("CREATE DATABASE IF NOT EXISTS payment_service_test"); err != nil {
		fmt.Fprintf(os.Stderr, "failed to create test DB: %v\n", err)
		os.Exit(1)
	}
	rootDB.Close()

	testDSN := "root:root@tcp(127.0.0.1:3306)/payment_service_test?parseTime=true&loc=Local"
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
// - m *testing.M represents the entire test suite (not a single test)
// - m.Run() executes all Test* functions and returns 0 (pass) or 1 (fail)
// - os.Exit(m.Run()) is mandatory — without it, tests don't run
// - testDB is a package-level variable shared across all tests
// - If TestMain calls os.Exit, deferred cleanup never runs — so each test cleans up after itself
// - Naming convention: Test<FunctionName>_<Scenario> — e.g., TestClaimRefund_CapturedToRefunding.
// Two failure modes:
// - t.Fatal() / t.Fatalf() — stops this test immediately (like an assertion that aborts)
// - t.Error() / t.Errorf() — marks the test as failed but continues running (like soft assertions)
//t.Helper() — Clean Stack Traces
//t.Helper()   // ← tells Go "this is a helper, don't show it in error traces"
// Without t.Helper(), error messages show the line in insertTestPayment. With it, they show the line in the calling test function — much easier to debug.

//9. Running Tests
// # Run all tests in a package
// go test ./db/repositories/

// # Run with verbose output (shows each test name + PASS/FAIL)
// go test -v ./db/repositories/

// # Run a specific test by name
// go test -v -run TestClaimRefund_CapturedToRefunding ./db/repositories/

// # Run tests matching a pattern
// go test -v -run TestClaimRefund ./db/repositories/    # runs all ClaimRefund tests

// # Run all tests across the project
// go test ./...

// # Set a timeout (default is 10 minutes)
// go test -timeout 60s ./db/repositories/

// # Run tests N times (useful for catching races)
// go test -count=10 ./db/repositories/

// # Run with race detector
// go test -race ./db/repositories/


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

func newTestRepo() *repositories.PaymentRepository {
	return repositories.NewPaymentRepository(testDB)
}

func insertTestPayment(t *testing.T, bookingId, userId int64, status, razorpayOrderId, razorpayPaymentId string, amount int) int64 {
	t.Helper()
	res, err := testDB.Exec(
		`INSERT INTO payments (booking_id, user_id, user_email, razorpay_order_id, razorpay_payment_id, amount, currency, status)
		 VALUES (?, ?, 'test@example.com', ?, ?, ?, 'INR', ?)`,
		bookingId, userId, razorpayOrderId, razorpayPaymentId, amount, status,
	)
	if err != nil {
		t.Fatalf("failed to insert test payment: %v", err)
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

func countOutboxByType(t *testing.T, eventType string) int {
	t.Helper()
	var count int
	err := testDB.QueryRow("SELECT COUNT(*) FROM outbox WHERE event_type = ?", eventType).Scan(&count)
	if err != nil {
		t.Fatalf("failed to count outbox events: %v", err)
	}
	return count
}

// --- Mock Razorpay Client ---

type mockRazorpayClient struct {
	createOrderFunc       func(data map[string]interface{}, extraHeaders map[string]string) (map[string]interface{}, error)
	refundFunc            func(paymentId string, amount int, data map[string]interface{}, extraHeaders map[string]string) (map[string]interface{}, error)
	fetchOrderPaymentsFunc func(orderId string) (map[string]interface{}, error)
	refundCallCount       int32
}

func (m *mockRazorpayClient) CreateOrder(data map[string]interface{}, extraHeaders map[string]string) (map[string]interface{}, error) {
	if m.createOrderFunc != nil {
		return m.createOrderFunc(data, extraHeaders)
	}
	return map[string]interface{}{
		"id":     "order_mock_123",
		"amount": data["amount"],
	}, nil
}

func (m *mockRazorpayClient) Refund(paymentId string, amount int, data map[string]interface{}, extraHeaders map[string]string) (map[string]interface{}, error) {
	atomic.AddInt32(&m.refundCallCount, 1)
	if m.refundFunc != nil {
		return m.refundFunc(paymentId, amount, data, extraHeaders)
	}
	return map[string]interface{}{
		"id":     "refund_mock_123",
		"amount": amount,
	}, nil
}

func (m *mockRazorpayClient) FetchOrderPayments(orderId string) (map[string]interface{}, error) {
	if m.fetchOrderPaymentsFunc != nil {
		return m.fetchOrderPaymentsFunc(orderId)
	}
	return map[string]interface{}{"items": []interface{}{}}, nil
}

func (m *mockRazorpayClient) getRefundCallCount() int32 {
	return atomic.LoadInt32(&m.refundCallCount)
}

func newTestService(mock RazorpayClient) PaymentService {
	repo := newTestRepo()
	return NewPaymentServiceWithClient(repo, mock)
}

// --- CreateOrder Tests ---

func TestCreateOrder_Success(t *testing.T) {
	truncateAll()
	mock := &mockRazorpayClient{}
	svc := newTestService(mock)

	payload := &dto.CreateOrderRequestDTO{
		BookingId: 7001,
		Amount:    5000,
	}

	result, err := svc.CreateOrder(10, "user@test.com", payload)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result["orderId"] != "order_mock_123" {
		t.Errorf("orderId = %v, want order_mock_123", result["orderId"])
	}
	if result["amount"] != 5000 {
		t.Errorf("amount = %v, want 5000", result["amount"])
	}

	// Verify payment row created
	var status string
	err = testDB.QueryRow("SELECT status FROM payments WHERE booking_id = 7001").Scan(&status)
	if err != nil {
		t.Fatalf("payment row not created: %v", err)
	}
	if status != "CREATED" {
		t.Errorf("status = %q, want CREATED", status)
	}
}

func TestCreateOrder_RazorpayFailure_ReturnsError(t *testing.T) {
	truncateAll()
	mock := &mockRazorpayClient{
		createOrderFunc: func(data map[string]interface{}, extraHeaders map[string]string) (map[string]interface{}, error) {
			return nil, fmt.Errorf("razorpay down")
		},
	}
	svc := newTestService(mock)

	payload := &dto.CreateOrderRequestDTO{
		BookingId: 7002,
		Amount:    5000,
	}

	_, err := svc.CreateOrder(10, "user@test.com", payload)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "razorpay down") {
		t.Errorf("error = %q, want it to contain 'razorpay down'", err.Error())
	}

	// Verify no payment row created
	var count int
	testDB.QueryRow("SELECT COUNT(*) FROM payments WHERE booking_id = 7002").Scan(&count)
	if count != 0 {
		t.Errorf("expected 0 payment rows, got %d", count)
	}
}

// --- RefundPayment Tests ---

func TestRefundPayment_Success_CapturedToRefunded(t *testing.T) {
	truncateAll()
	mock := &mockRazorpayClient{}
	svc := newTestService(mock)

	paymentId := insertTestPayment(t, 8001, 10, "CAPTURED", "order_801", "pay_801", 5000)

	payload := &dto.RefundRequestDTO{PaymentId: paymentId}
	result, err := svc.RefundPayment(payload)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result["status"] != "processed" {
		t.Errorf("result status = %v, want processed", result["status"])
	}
	if result["refundId"] != "refund_mock_123" {
		t.Errorf("refundId = %v, want refund_mock_123", result["refundId"])
	}
	if got := getPaymentStatus(t, paymentId); got != "REFUNDED" {
		t.Errorf("status = %q, want REFUNDED", got)
	}
	if mock.getRefundCallCount() != 1 {
		t.Errorf("razorpay refund calls = %d, want 1", mock.getRefundCallCount())
	}
	if got := countOutboxByType(t, "PAYMENT_REFUNDED"); got != 1 {
		t.Errorf("outbox PAYMENT_REFUNDED count = %d, want 1", got)
	}
}

func TestRefundPayment_AlreadyRefunded_ReturnsError(t *testing.T) {
	truncateAll()
	mock := &mockRazorpayClient{}
	svc := newTestService(mock)

	paymentId := insertTestPayment(t, 8002, 10, "REFUNDED", "order_802", "pay_802", 5000)

	payload := &dto.RefundRequestDTO{PaymentId: paymentId}
	_, err := svc.RefundPayment(payload)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "already refunded or not in refundable state") {
		t.Errorf("error = %q, want 'already refunded or not in refundable state'", err.Error())
	}
	if mock.getRefundCallCount() != 0 {
		t.Errorf("razorpay refund calls = %d, want 0", mock.getRefundCallCount())
	}
}

func TestRefundPayment_RazorpayFailure_LeavesInRefunding(t *testing.T) {
	truncateAll()
	mock := &mockRazorpayClient{
		refundFunc: func(paymentId string, amount int, data map[string]interface{}, extraHeaders map[string]string) (map[string]interface{}, error) {
			return nil, fmt.Errorf("razorpay refund api error")
		},
	}
	svc := newTestService(mock)

	paymentId := insertTestPayment(t, 8003, 10, "CAPTURED", "order_803", "pay_803", 5000)

	payload := &dto.RefundRequestDTO{PaymentId: paymentId}
	_, err := svc.RefundPayment(payload)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "razorpay refund api error") {
		t.Errorf("error = %q, want 'razorpay refund api error'", err.Error())
	}

	// CRITICAL: payment must stay in REFUNDING, NOT revert to CAPTURED
	if got := getPaymentStatus(t, paymentId); got != "REFUNDING" {
		t.Errorf("status = %q, want REFUNDING (must not revert to CAPTURED)", got)
	}
}

func TestRefundPayment_ConcurrentSamePayment_ExactlyOneRazorpayCall(t *testing.T) {
	truncateAll()
	mock := &mockRazorpayClient{}
	svc := newTestService(mock)

	paymentId := insertTestPayment(t, 8004, 10, "CAPTURED", "order_804", "pay_804", 5000)

	var wg sync.WaitGroup
	type result struct {
		err    error
		result map[string]interface{}
	}
	results := make(chan result, 2)

	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			payload := &dto.RefundRequestDTO{PaymentId: paymentId}
			r, err := svc.RefundPayment(payload)
			results <- result{err, r}
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
	if mock.getRefundCallCount() != 1 {
		t.Errorf("razorpay refund calls = %d, want exactly 1", mock.getRefundCallCount())
	}
	if got := getPaymentStatus(t, paymentId); got != "REFUNDED" {
		t.Errorf("status = %q, want REFUNDED", got)
	}
}

func TestRefundPayment_ConcurrentHttpAndConsumer_OnlyOneRazorpayCall(t *testing.T) {
	truncateAll()
	mock := &mockRazorpayClient{}
	svc := newTestService(mock)

	paymentId := insertTestPayment(t, 8005, 10, "CAPTURED", "order_805", "pay_805", 5000)

	var wg sync.WaitGroup
	type result struct {
		err    error
		source string
	}
	results := make(chan result, 2)

	// Goroutine 1: simulates HTTP /payments/refund handler
	wg.Add(1)
	go func() {
		defer wg.Done()
		payload := &dto.RefundRequestDTO{PaymentId: paymentId}
		_, err := svc.RefundPayment(payload)
		results <- result{err, "http"}
	}()

	// Goroutine 2: simulates booking-cancelled consumer
	wg.Add(1)
	go func() {
		defer wg.Done()
		payload := &dto.RefundRequestDTO{PaymentId: paymentId}
		_, err := svc.RefundPayment(payload)
		results <- result{err, "consumer"}
	}()

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
	if mock.getRefundCallCount() != 1 {
		t.Errorf("razorpay refund calls = %d, want exactly 1", mock.getRefundCallCount())
	}
	if got := getPaymentStatus(t, paymentId); got != "REFUNDED" {
		t.Errorf("status = %q, want REFUNDED", got)
	}
}

func TestRefundPayment_RazorpayFailureThenRetry_Success(t *testing.T) {
	truncateAll()

	var callCount int32
	mock := &mockRazorpayClient{
		refundFunc: func(paymentId string, amount int, data map[string]interface{}, extraHeaders map[string]string) (map[string]interface{}, error) {
			n := atomic.AddInt32(&callCount, 1)
			if n == 1 {
				return nil, fmt.Errorf("transient razorpay error")
			}
			return map[string]interface{}{"id": "refund_retry_123"}, nil
		},
	}
	svc := newTestService(mock)

	paymentId := insertTestPayment(t, 8006, 10, "CAPTURED", "order_806", "pay_806", 5000)

	// First attempt: Razorpay fails, payment stays in REFUNDING
	payload := &dto.RefundRequestDTO{PaymentId: paymentId}
	_, err := svc.RefundPayment(payload)
	if err == nil {
		t.Fatal("expected error on first attempt, got nil")
	}
	if got := getPaymentStatus(t, paymentId); got != "REFUNDING" {
		t.Errorf("after first attempt: status = %q, want REFUNDING", got)
	}

	// Backdate updated_at to make the REFUNDING state stale (>15min)
	testDB.Exec("UPDATE payments SET updated_at = DATE_SUB(NOW(), INTERVAL 30 MINUTE) WHERE id = ?", paymentId)

	// Second attempt: ReclaimStaleRefunding allows re-claim from stale REFUNDING, Razorpay succeeds
	result, err := svc.RefundPayment(payload)
	if err != nil {
		t.Fatalf("unexpected error on retry: %v", err)
	}
	if result["refundId"] != "refund_retry_123" {
		t.Errorf("refundId = %v, want refund_retry_123", result["refundId"])
	}
	if got := getPaymentStatus(t, paymentId); got != "REFUNDED" {
		t.Errorf("after retry: status = %q, want REFUNDED", got)
	}
}

func TestRefundPayment_ByBookingId(t *testing.T) {
	truncateAll()
	mock := &mockRazorpayClient{}
	svc := newTestService(mock)

	insertTestPayment(t, 8007, 10, "CAPTURED", "order_807", "pay_807", 5000)

	payload := &dto.RefundRequestDTO{BookingId: 8007}
	result, err := svc.RefundPayment(payload)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result["status"] != "processed" {
		t.Errorf("status = %v, want processed", result["status"])
	}
}

func TestRefundPayment_PaymentNotFound(t *testing.T) {
	truncateAll()
	mock := &mockRazorpayClient{}
	svc := newTestService(mock)

	payload := &dto.RefundRequestDTO{PaymentId: 99999}
	_, err := svc.RefundPayment(payload)
	if err == nil {
		t.Fatal("expected error for non-existent payment, got nil")
	}
}

// --- FetchPaymentsWithStaleStatus Tests ---

func TestFetchPaymentsWithStaleStatus(t *testing.T) {
	truncateAll()
	mock := &mockRazorpayClient{}
	svc := newTestService(mock)

	// Insert stale CREATED payment (> 1hr old)
	old := time.Now().Add(-2 * time.Hour)
	testDB.Exec(
		`INSERT INTO payments (booking_id, user_id, user_email, razorpay_order_id, amount, currency, status, created_at, updated_at)
		 VALUES (9001, 10, 'test@test.com', 'order_stale_1', 1000, 'INR', 'CREATED', ?, ?)`,
		old, old,
	)

	// Insert stale REFUNDING payment (> 15min old)
	oldRefunding := time.Now().Add(-30 * time.Minute)
	testDB.Exec(
		`INSERT INTO payments (booking_id, user_id, user_email, razorpay_order_id, amount, currency, status, created_at, updated_at)
		 VALUES (9002, 10, 'test@test.com', 'order_stale_2', 2000, 'INR', 'REFUNDING', ?, ?)`,
		oldRefunding, oldRefunding,
	)

	payments, err := svc.FetchPaymentsWithStaleStatus()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(payments) != 2 {
		t.Fatalf("expected 2 stale payments, got %d", len(payments))
	}
}


const (
	testKeySecret     = "test_key_secret_for_verify"
	testWebhookSecret = "test_webhook_secret_for_hooks"
)
 
func setPaymentSecrets(t *testing.T) {
	t.Helper()
	os.Setenv("RAZORPAY_KEY_SECRET", testKeySecret)
	os.Setenv("RAZORPAY_WEBHOOK_SECRET", testWebhookSecret)
}
 
func buildWebhookPayload(t *testing.T, event, orderId, paymentId string) []byte {
	t.Helper()
	payload := dto.WebhookPayload{
		Event: event,
		Payload: dto.WebhookPayloadData{
			Payment: dto.WebhookPayment{
				Entity: dto.WebhookPaymentEntity{
					Id:      paymentId,
					OrderId: orderId,
					Amount:  5000,
					Status:  "captured",
				},
			},
		},
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("failed to marshal webhook payload: %v", err)
	}
	return raw
}
 
// --- VerifyPayment ---
 
func TestVerifyPayment_Success(t *testing.T) {
	truncateAll()
	setPaymentSecrets(t)
	mock := &mockRazorpayClient{}
	svc := newTestService(mock)
 
	paymentId := insertTestPayment(t, 9101, 10, "CREATED", "order_v1", "", 5000)
 
	sig := ComputeHmacSha256(fmt.Sprintf("%s|%s", "order_v1", "pay_v1"), testKeySecret)
	payload := &dto.VerifyPaymentRequestDTO{
		RazorpayOrderId:   "order_v1",
		RazorpayPaymentId: "pay_v1",
		RazorpaySignature: sig,
	}
 
	result, err := svc.VerifyPayment(payload)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Status != "CAPTURED" {
		t.Errorf("returned status = %q, want CAPTURED", result.Status)
	}
	if got := getPaymentStatus(t, paymentId); got != "CAPTURED" {
		t.Errorf("db status = %q, want CAPTURED", got)
	}
	if got := countOutboxByType(t, "PAYMENT_CAPTURED"); got != 1 {
		t.Errorf("outbox PAYMENT_CAPTURED count = %d, want 1", got)
	}
}
 
func TestVerifyPayment_SignatureMismatch_MarksFailure(t *testing.T) {
	truncateAll()
	setPaymentSecrets(t)
	mock := &mockRazorpayClient{}
	svc := newTestService(mock)
 
	insertTestPayment(t, 9102, 10, "CREATED", "order_v2", "", 5000)
 
	payload := &dto.VerifyPaymentRequestDTO{
		RazorpayOrderId:   "order_v2",
		RazorpayPaymentId: "pay_v2",
		RazorpaySignature: "not_the_real_signature",
	}
 
	_, err := svc.VerifyPayment(payload)
	if err == nil {
		t.Fatal("expected error for signature mismatch, got nil")
	}
 
	var status string
	testDB.QueryRow("SELECT status FROM payments WHERE razorpay_order_id = 'order_v2'").Scan(&status)
	if status != "FAILED" {
		t.Errorf("status = %q, want FAILED", status)
	}
	if got := countOutboxByType(t, "PAYMENT_CAPTURED"); got != 0 {
		t.Errorf("outbox PAYMENT_CAPTURED count = %d, want 0 (must not capture on bad signature)", got)
	}
}
 
func TestVerifyPayment_AlreadyCaptured_SkipsDuplicateUpdate(t *testing.T) {
	truncateAll()
	setPaymentSecrets(t)
	mock := &mockRazorpayClient{}
	svc := newTestService(mock)
 
	// Simulate: webhook already captured this payment before the FE's verify call arrived.
	insertTestPayment(t, 9103, 10, "CAPTURED", "order_v3", "pay_v3", 5000)
 
	payload := &dto.VerifyPaymentRequestDTO{
		RazorpayOrderId:   "order_v3",
		RazorpayPaymentId: "pay_v3",
		RazorpaySignature: "irrelevant_because_guard_short_circuits_first",
	}
 
	result, err := svc.VerifyPayment(payload)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Status != "CAPTURED" {
		t.Errorf("status = %q, want CAPTURED", result.Status)
	}
	// The whole point: no second outbox event from the FE's redundant verify call.
	if got := countOutboxByType(t, "PAYMENT_CAPTURED"); got != 0 {
		t.Errorf("outbox PAYMENT_CAPTURED count = %d, want 0 (webhook already published it, this call must not)", got)
	}
}
 
// --- HandleWebhook ---
 
func TestHandleWebhook_PaymentCaptured_UpdatesStatus(t *testing.T) {
	truncateAll()
	setPaymentSecrets(t)
	mock := &mockRazorpayClient{}
	svc := newTestService(mock)
 
	insertTestPayment(t, 9201, 10, "CREATED", "order_w1", "", 5000)
 
	body := buildWebhookPayload(t, "payment.captured", "order_w1", "pay_w1")
	sig := ComputeHmacSha256(string(body), testWebhookSecret)
 
	if err := svc.HandleWebhook(body, sig); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got := getPaymentStatus(t, mustPaymentId(t, "order_w1")); got != "CAPTURED" {
		t.Errorf("status = %q, want CAPTURED", got)
	}
	if got := countOutboxByType(t, "PAYMENT_CAPTURED"); got != 1 {
		t.Errorf("outbox PAYMENT_CAPTURED count = %d, want 1", got)
	}
}
 
func TestHandleWebhook_InvalidSignature_ReturnsError(t *testing.T) {
	truncateAll()
	setPaymentSecrets(t)
	mock := &mockRazorpayClient{}
	svc := newTestService(mock)
 
	insertTestPayment(t, 9202, 10, "CREATED", "order_w2", "", 5000)
 
	body := buildWebhookPayload(t, "payment.captured", "order_w2", "pay_w2")
 
	err := svc.HandleWebhook(body, "forged_signature_from_an_attacker")
	if err == nil {
		t.Fatal("expected error for invalid webhook signature, got nil")
	}
	if got := getPaymentStatus(t, mustPaymentId(t, "order_w2")); got != "CREATED" {
		t.Errorf("status = %q, want CREATED (must not update on bad signature)", got)
	}
}
 
func TestHandleWebhook_DuplicateCapturedEvent_Idempotent(t *testing.T) {
	truncateAll()
	setPaymentSecrets(t)
	mock := &mockRazorpayClient{}
	svc := newTestService(mock)
 
	insertTestPayment(t, 9203, 10, "CAPTURED", "order_w3", "pay_w3", 5000)
 
	// Razorpay's at-least-once delivery means this event can legitimately arrive twice.
	body := buildWebhookPayload(t, "payment.captured", "order_w3", "pay_w3")
	sig := ComputeHmacSha256(string(body), testWebhookSecret)
 
	if err := svc.HandleWebhook(body, sig); err != nil {
		t.Fatalf("unexpected error on duplicate webhook: %v", err)
	}
	if got := countOutboxByType(t, "PAYMENT_CAPTURED"); got != 0 {
		t.Errorf("outbox PAYMENT_CAPTURED count = %d, want 0 (payment was already CAPTURED before this call)", got)
	}
}
 
func TestHandleWebhook_PaymentFailed_UpdatesStatus(t *testing.T) {
	truncateAll()
	setPaymentSecrets(t)
	mock := &mockRazorpayClient{}
	svc := newTestService(mock)
 
	insertTestPayment(t, 9204, 10, "CREATED", "order_w4", "", 5000)
 
	body := buildWebhookPayload(t, "payment.failed", "order_w4", "pay_w4")
	sig := ComputeHmacSha256(string(body), testWebhookSecret)
 
	if err := svc.HandleWebhook(body, sig); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got := getPaymentStatus(t, mustPaymentId(t, "order_w4")); got != "FAILED" {
		t.Errorf("status = %q, want FAILED", got)
	}
}
 
func TestHandleWebhook_UnknownOrder_ReturnsError(t *testing.T) {
	truncateAll()
	setPaymentSecrets(t)
	mock := &mockRazorpayClient{}
	svc := newTestService(mock)

	// No matching payment row exists for this order at all.
	body := buildWebhookPayload(t, "payment.captured", "order_does_not_exist", "pay_x")
	sig := ComputeHmacSha256(string(body), testWebhookSecret)

	// Service-level returns error; controller logs it and returns 200 to Razorpay
	err := svc.HandleWebhook(body, sig)
	if err == nil {
		t.Fatal("expected error from service for unknown order, got nil")
	}
}
 
// --- ReconcileWithRazorpay ---
 
func TestReconcile_FindsCapturedRemotely_UpdatesStatus(t *testing.T) {
	truncateAll()
	mock := &mockRazorpayClient{
		fetchOrderPaymentsFunc: func(orderId string) (map[string]interface{}, error) {
			return map[string]interface{}{
				"items": []interface{}{
					map[string]interface{}{"id": "pay_r1", "status": "captured"},
				},
			}, nil
		},
	}
	svc := newTestService(mock)
 
	paymentId := insertTestPayment(t, 9301, 10, "CREATED", "order_r1", "", 5000)
	payment, _ := svc.GetPaymentByBookingId(9301)
 
	if err := svc.(*PaymentServiceImpl).ReconcileWithRazorpay(payment); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got := getPaymentStatus(t, paymentId); got != "CAPTURED" {
		t.Errorf("status = %q, want CAPTURED", got)
	}
}
 
func TestReconcile_FindsFailedRemotely_MarksFailed(t *testing.T) {
	truncateAll()
	mock := &mockRazorpayClient{
		fetchOrderPaymentsFunc: func(orderId string) (map[string]interface{}, error) {
			return map[string]interface{}{
				"items": []interface{}{
					map[string]interface{}{"id": "pay_r2", "status": "failed"},
				},
			}, nil
		},
	}
	svc := newTestService(mock)
 
	paymentId := insertTestPayment(t, 9302, 10, "CREATED", "order_r2", "", 5000)
	payment, _ := svc.GetPaymentByBookingId(9302)
 
	if err := svc.(*PaymentServiceImpl).ReconcileWithRazorpay(payment); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got := getPaymentStatus(t, paymentId); got != "FAILED" {
		t.Errorf("status = %q, want FAILED", got)
	}
}
 
func TestReconcile_NoPaymentAttempts_MarksAbandoned(t *testing.T) {
	truncateAll()
	mock := &mockRazorpayClient{
		fetchOrderPaymentsFunc: func(orderId string) (map[string]interface{}, error) {
			return map[string]interface{}{"items": []interface{}{}}, nil
		},
	}
	svc := newTestService(mock)
 
	paymentId := insertTestPayment(t, 9303, 10, "CREATED", "order_r3", "", 5000)
	payment, _ := svc.GetPaymentByBookingId(9303)
 
	if err := svc.(*PaymentServiceImpl).ReconcileWithRazorpay(payment); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got := getPaymentStatus(t, paymentId); got != "FAILED" {
		t.Errorf("status = %q, want FAILED (abandoned order, no attempts found)", got)
	}
}
 
func TestReconcile_StillPendingRemotely_LeavesUnchanged(t *testing.T) {
	truncateAll()
	mock := &mockRazorpayClient{
		fetchOrderPaymentsFunc: func(orderId string) (map[string]interface{}, error) {
			return map[string]interface{}{
				"items": []interface{}{
					map[string]interface{}{"id": "pay_r4", "status": "created"},
				},
			}, nil
		},
	}
	svc := newTestService(mock)
 
	paymentId := insertTestPayment(t, 9304, 10, "CREATED", "order_r4", "", 5000)
	payment, _ := svc.GetPaymentByBookingId(9304)
 
	if err := svc.(*PaymentServiceImpl).ReconcileWithRazorpay(payment); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// Not resolved yet on Razorpay's side — must be left alone for the next tick, not guessed at.
	if got := getPaymentStatus(t, paymentId); got != "CREATED" {
		t.Errorf("status = %q, want CREATED (still unresolved, must not guess)", got)
	}
}
 
// --- helper ---
 
func mustPaymentId(t *testing.T, orderId string) int64 {
	t.Helper()
	var id int64
	if err := testDB.QueryRow("SELECT id FROM payments WHERE razorpay_order_id = ?", orderId).Scan(&id); err != nil {
		t.Fatalf("failed to look up payment id for order %s: %v", orderId, err)
	}
	return id
}
 
package workers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"goPayment/db/repositories"
	"goPayment/dto"
	"goPayment/pkg/logger"
	"goPayment/services"
	"os"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"

	_ "github.com/go-sql-driver/mysql"
)

var testDB *sql.DB

func TestMain(m *testing.M) {
	logger.Init("PaymentConsumer-Test", "../../logs/payment-consumer-test.log")

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

	if _, err := rootDB.Exec("CREATE DATABASE IF NOT EXISTS payment_consumer_test"); err != nil {
		fmt.Fprintf(os.Stderr, "failed to create test DB: %v\n", err)
		os.Exit(1)
	}
	rootDB.Close()

	testDSN := "root:root@tcp(127.0.0.1:3306)/payment_consumer_test?parseTime=true&loc=Local"
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

func existsProcessedEvent(t *testing.T, eventID string) bool {
	t.Helper()
	var exists bool
	err := testDB.QueryRow("SELECT EXISTS(SELECT 1 FROM processed_events WHERE event_id = ?)", eventID).Scan(&exists)
	if err != nil {
		t.Fatalf("failed to check processed event: %v", err)
	}
	return exists
}

// --- Mock Razorpay Client ---

type mockRazorpayClient struct {
	createOrderFunc func(data map[string]interface{}, extraHeaders map[string]string) (map[string]interface{}, error)
	refundFunc      func(paymentId string, amount int, data map[string]interface{}, extraHeaders map[string]string) (map[string]interface{}, error)
	refundCallCount int32
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

func (m *mockRazorpayClient) getRefundCallCount() int32 {
	return atomic.LoadInt32(&m.refundCallCount)
}

func newTestConsumer(mock services.RazorpayClient) (*BookingConsumer, *mockRazorpayClient) {
	repo := repositories.NewPaymentRepository(testDB)
	svc := services.NewPaymentServiceWithClient(repo, mock)
	return NewBookingConsumer(svc, testDB), mock.(*mockRazorpayClient)
}

func buildEnvelope(eventId, eventType string, payload interface{}) []byte {
	payloadBytes, _ := json.Marshal(payload)
	envelope := BookingEventEnvelope{
		EventId:   eventId,
		EventType: eventType,
		Payload:   payloadBytes,
	}
	body, _ := json.Marshal(envelope)
	return body
}

func buildDelivery(body []byte) amqp.Delivery {
	return amqp.Delivery{Body: body}
}

// --- handleBookingCreated Tests ---

func TestHandleBookingCreated_CreatesOrder(t *testing.T) {
	truncateAll()
	mock := &mockRazorpayClient{}
	consumer, _ := newTestConsumer(mock)

	payload := BookingCreatedPayload{
		BookingId:     1001,
		UserId:        10,
		HotelId:       50,
		RoomId:        1,
		CheckIn:       "2026-08-01",
		CheckOut:      "2026-08-03",
		BookingAmount: 5000,
		TotalGuests:   2,
		UserEmail:     "user@test.com",
		CreatedAt:     time.Now(),
	}

	body := buildEnvelope("evt-create-001", "BOOKING_CREATED", payload)
	consumer.handleMessage(buildDelivery(body))

	var status string
	err := testDB.QueryRow("SELECT status FROM payments WHERE booking_id = 1001").Scan(&status)
	if err != nil {
		t.Fatalf("payment not created: %v", err)
	}
	if status != "CREATED" {
		t.Errorf("status = %q, want CREATED", status)
	}
}

func TestHandleBookingCreated_DuplicateBooking_SkipsOrder(t *testing.T) {
	truncateAll()
	mock := &mockRazorpayClient{}
	consumer, _ := newTestConsumer(mock)

	insertTestPayment(t, 1002, 10, "CAPTURED", "order_existing", "pay_existing", 5000)

	payload := BookingCreatedPayload{
		BookingId:     1002,
		UserId:        10,
		BookingAmount: 5000,
		CreatedAt:     time.Now(),
	}

	body := buildEnvelope("evt-create-002", "BOOKING_CREATED", payload)
	consumer.handleMessage(buildDelivery(body))

	var count int
	testDB.QueryRow("SELECT COUNT(*) FROM payments WHERE booking_id = 1002").Scan(&count)
	if count != 1 {
		t.Errorf("expected 1 payment (no duplicate), got %d", count)
	}
}

func TestHandleBookingCreated_ExpiredBooking_SkipsOrder(t *testing.T) {
	truncateAll()
	mock := &mockRazorpayClient{}
	consumer, _ := newTestConsumer(mock)

	payload := BookingCreatedPayload{
		BookingId:     1003,
		UserId:        10,
		BookingAmount: 5000,
		CreatedAt:     time.Now().Add(-30 * time.Minute),
	}

	body := buildEnvelope("evt-create-003", "BOOKING_CREATED", payload)
	consumer.handleMessage(buildDelivery(body))

	var count int
	testDB.QueryRow("SELECT COUNT(*) FROM payments WHERE booking_id = 1003").Scan(&count)
	if count != 0 {
		t.Errorf("expected 0 payments for expired booking, got %d", count)
	}
}

func TestHandleBookingCreated_MarksEventProcessed(t *testing.T) {
	truncateAll()
	mock := &mockRazorpayClient{}
	consumer, _ := newTestConsumer(mock)

	eventId := "evt-create-processed-001"
	payload := BookingCreatedPayload{
		BookingId:     1004,
		UserId:        10,
		BookingAmount: 5000,
		CreatedAt:     time.Now(),
	}

	body := buildEnvelope(eventId, "BOOKING_CREATED", payload)
	consumer.handleMessage(buildDelivery(body))

	if !existsProcessedEvent(t, eventId) {
		t.Error("expected event to be marked as processed")
	}
}

// --- handleBookingCancelled Tests ---

func TestHandleBookingCancelled_CapturedPayment_Refunds(t *testing.T) {
	truncateAll()
	mock := &mockRazorpayClient{}
	consumer, _ := newTestConsumer(mock)

	paymentId := insertTestPayment(t, 2001, 10, "CAPTURED", "order_201", "pay_201", 5000)

	payload := BookingCancelledPayload{
		BookingId: 2001,
		UserId:    10,
		Reason:    "user_cancelled",
	}

	body := buildEnvelope("evt-cancel-001", "BOOKING_CANCELLED", payload)
	consumer.handleMessage(buildDelivery(body))

	if got := getPaymentStatus(t, paymentId); got != "REFUNDED" {
		t.Errorf("status = %q, want REFUNDED", got)
	}
	if mock.getRefundCallCount() != 1 {
		t.Errorf("razorpay refund calls = %d, want 1", mock.getRefundCallCount())
	}
}

func TestHandleBookingCancelled_NonCapturedPayment_SkipsRefund(t *testing.T) {
	truncateAll()
	mock := &mockRazorpayClient{}
	consumer, _ := newTestConsumer(mock)

	paymentId := insertTestPayment(t, 2002, 10, "CREATED", "order_202", "pay_202", 5000)

	payload := BookingCancelledPayload{
		BookingId: 2002,
		UserId:    10,
	}

	body := buildEnvelope("evt-cancel-002", "BOOKING_CANCELLED", payload)
	consumer.handleMessage(buildDelivery(body))

	if got := getPaymentStatus(t, paymentId); got != "CREATED" {
		t.Errorf("status = %q, want CREATED (unchanged)", got)
	}
	if mock.getRefundCallCount() != 0 {
		t.Errorf("razorpay refund calls = %d, want 0", mock.getRefundCallCount())
	}
}

func TestHandleBookingCancelled_AlreadyRefunded_SkipsRefund(t *testing.T) {
	truncateAll()
	mock := &mockRazorpayClient{}
	consumer, _ := newTestConsumer(mock)

	paymentId := insertTestPayment(t, 2003, 10, "REFUNDED", "order_203", "pay_203", 5000)

	payload := BookingCancelledPayload{
		BookingId: 2003,
		UserId:    10,
	}

	body := buildEnvelope("evt-cancel-003", "BOOKING_CANCELLED", payload)
	consumer.handleMessage(buildDelivery(body))

	if got := getPaymentStatus(t, paymentId); got != "REFUNDED" {
		t.Errorf("status = %q, want REFUNDED (unchanged)", got)
	}
	if mock.getRefundCallCount() != 0 {
		t.Errorf("razorpay refund calls = %d, want 0", mock.getRefundCallCount())
	}
}

func TestHandleBookingCancelled_NoPayment_Skip(t *testing.T) {
	truncateAll()
	mock := &mockRazorpayClient{}
	consumer, _ := newTestConsumer(mock)

	payload := BookingCancelledPayload{
		BookingId: 9999,
		UserId:    10,
	}

	body := buildEnvelope("evt-cancel-004", "BOOKING_CANCELLED", payload)
	consumer.handleMessage(buildDelivery(body))

	if mock.getRefundCallCount() != 0 {
		t.Errorf("razorpay refund calls = %d, want 0", mock.getRefundCallCount())
	}
}

func TestHandleBookingCancelled_RedeliverSameEventId_ExactlyOneRefund(t *testing.T) {
	truncateAll()
	mock := &mockRazorpayClient{}
	consumer, _ := newTestConsumer(mock)

	insertTestPayment(t, 2004, 10, "CAPTURED", "order_204", "pay_204", 5000)

	eventId := "evt-cancel-dedup-001"
	payload := BookingCancelledPayload{
		BookingId: 2004,
		UserId:    10,
	}

	// First delivery
	body := buildEnvelope(eventId, "BOOKING_CANCELLED", payload)
	consumer.handleMessage(buildDelivery(body))

	// Second delivery: same eventId → should be deduped
	consumer.handleMessage(buildDelivery(body))

	if mock.getRefundCallCount() != 1 {
		t.Errorf("razorpay refund calls = %d, want exactly 1", mock.getRefundCallCount())
	}
	if got := countOutboxByType(t, "PAYMENT_REFUNDED"); got != 1 {
		t.Errorf("outbox PAYMENT_REFUNDED count = %d, want 1", got)
	}
}

func TestHandleBookingCancelled_AlreadyRefunding_SkipsRefund(t *testing.T) {
	truncateAll()
	mock := &mockRazorpayClient{}
	consumer, _ := newTestConsumer(mock)

	paymentId := insertTestPayment(t, 2005, 10, "REFUNDING", "order_205", "pay_205", 5000)

	payload := BookingCancelledPayload{
		BookingId: 2005,
		UserId:    10,
	}

	body := buildEnvelope("evt-cancel-005", "BOOKING_CANCELLED", payload)
	consumer.handleMessage(buildDelivery(body))

	if got := getPaymentStatus(t, paymentId); got != "REFUNDING" {
		t.Errorf("status = %q, want REFUNDING (unchanged)", got)
	}
	if mock.getRefundCallCount() != 0 {
		t.Errorf("razorpay refund calls = %d, want 0", mock.getRefundCallCount())
	}
}

// --- Phase 4: E2E Convergence Test ---

func TestRefundRace_HttpVsConsumer_OnlyOneRazorpayCall(t *testing.T) {
	truncateAll()

	var razorpayCalls int32
	mock := &mockRazorpayClient{
		refundFunc: func(paymentId string, amount int, data map[string]interface{}, extraHeaders map[string]string) (map[string]interface{}, error) {
			atomic.AddInt32(&razorpayCalls, 1)
			return map[string]interface{}{"id": "refund_race_123"}, nil
		},
	}

	repo := repositories.NewPaymentRepository(testDB)
	svc := services.NewPaymentServiceWithClient(repo, mock)

	paymentId := insertTestPayment(t, 3001, 10, "CAPTURED", "order_race_1", "pay_race_1", 5000)

	var wg sync.WaitGroup
	type result struct {
		err    error
		source string
	}
	results := make(chan result, 2)

	// Goroutine 1: simulates HTTP /payments/refund
	wg.Add(1)
	go func() {
		defer wg.Done()
		payload := &dto.RefundRequestDTO{PaymentId: paymentId}
		_, err := svc.RefundPayment(payload)
		results <- result{err, "http"}
	}()

	// Goroutine 2: simulates consumer handleBookingCancelled calling RefundPayment
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
			if !strings.Contains(r.err.Error(), "already refunded or not in refundable state") {
				t.Errorf("source=%s: unexpected error: %v", r.source, r.err)
			}
		}
	}

	if succeeded != 1 || failed != 1 {
		t.Errorf("expected 1 success and 1 failure, got %d success and %d failure", succeeded, failed)
	}
	if atomic.LoadInt32(&razorpayCalls) != 1 {
		t.Errorf("razorpay refund calls = %d, want exactly 1", atomic.LoadInt32(&razorpayCalls))
	}
	if got := getPaymentStatus(t, paymentId); got != "REFUNDED" {
		t.Errorf("final status = %q, want REFUNDED", got)
	}
}

func TestRefundRace_ConcurrentClaimRefund_ExactlyOneWins(t *testing.T) {
	truncateAll()

	repo := repositories.NewPaymentRepository(testDB)

	paymentId := insertTestPayment(t, 3002, 10, "CAPTURED", "order_race_2", "pay_race_2", 5000)

	var wg sync.WaitGroup
	var successCount int32

	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			claimed, err := repo.ClaimRefund(paymentId)
			if err != nil {
				t.Errorf("unexpected error: %v", err)
				return
			}
			if claimed {
				atomic.AddInt32(&successCount, 1)
			}
		}()
	}

	wg.Wait()

	if got := atomic.LoadInt32(&successCount); got != 1 {
		t.Errorf("expected exactly 1 successful claim out of 10, got %d", got)
	}
	if got := getPaymentStatus(t, paymentId); got != "REFUNDING" {
		t.Errorf("status = %q, want REFUNDING", got)
	}
}

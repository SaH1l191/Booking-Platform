package repositories

import (
	"crypto/rand"
	"database/sql"
	"encoding/json"
	"fmt"
	"goPayment/models"
	"goPayment/pkg/logger"
)

type PaymentRepository struct {
	db *sql.DB
}

func NewPaymentRepository(db *sql.DB) *PaymentRepository {
	return &PaymentRepository{db: db}
}

func (r *PaymentRepository) CreatePayment(payment *models.Payment) (*models.Payment, error) {

	tx, err := r.db.Begin()
	if err != nil {
		logger.Log.Error("Failed to begin transaction")
		return nil, err
	}
	defer tx.Rollback()
	paymentQuery := `INSERT INTO payments (booking_id, user_id, user_email, razorpay_order_id, amount, currency, status)
		VALUES (?, ?, ?, ?, ?, ?, ?)`
	res, err := tx.Exec(paymentQuery, payment.BookingId, payment.UserId, payment.UserEmail, payment.RazorpayOrderId, payment.Amount, payment.Currency, payment.Status)
	if err != nil {
		logger.Log.Error("Failed to create payment", "error", err)
		return nil, err
	}

	lastInsertID, err := res.LastInsertId()
	if err != nil {
		logger.Log.Error("Failed to get last insert ID", "error", err)
		return nil, err
	}
	payment.Id = lastInsertID
	logger.Log.Info("Payment created successfully", "paymentId", payment.Id)

	if err := tx.Commit(); err != nil {
		logger.Log.Error("Failed to commit transaction", "error", err)
		return nil, err
	}
	return payment, nil
}

func (r *PaymentRepository) GetPaymentById(paymentId int64) (*models.Payment, error) {
	query := `SELECT id, booking_id, user_id, razorpay_order_id, COALESCE(razorpay_payment_id,''), COALESCE(razorpay_signature,''),
		amount, currency, status, refund_amount, COALESCE(failure_reason,''), created_at, updated_at
		FROM payments WHERE id = ?`
	row := r.db.QueryRow(query, paymentId)
	payment := &models.Payment{}
	err := row.Scan(&payment.Id, &payment.BookingId, &payment.UserId, &payment.RazorpayOrderId,
		&payment.RazorpayPaymentId, &payment.RazorpaySignature, &payment.Amount, &payment.Currency,
		&payment.Status, &payment.RefundAmount, &payment.FailureReason, &payment.CreatedAt, &payment.UpdatedAt)
	if err != nil {
		logger.Log.Error("Failed to fetch payment by ID", "error", err, "paymentId", paymentId)
		return nil, err
	}
	return payment, nil
}

func (r *PaymentRepository) GetPaymentByOrderId(orderId string) (*models.Payment, error) {
	query := `SELECT id, booking_id, user_id, razorpay_order_id, COALESCE(razorpay_payment_id,''), COALESCE(razorpay_signature,''),
		amount, currency, status, refund_amount, COALESCE(failure_reason,''), created_at, updated_at
		FROM payments WHERE razorpay_order_id = ?`
	row := r.db.QueryRow(query, orderId)
	payment := &models.Payment{}
	err := row.Scan(&payment.Id, &payment.BookingId, &payment.UserId, &payment.RazorpayOrderId,
		&payment.RazorpayPaymentId, &payment.RazorpaySignature, &payment.Amount, &payment.Currency,
		&payment.Status, &payment.RefundAmount, &payment.FailureReason, &payment.CreatedAt, &payment.UpdatedAt)
	if err != nil {
		logger.Log.Error("Failed to fetch payment by order ID", "error", err, "orderId", orderId)
		return nil, err
	}
	return payment, nil
}

func (r *PaymentRepository) GetPaymentByBookingId(bookingId int64) (*models.Payment, error) {
	query := `SELECT id, booking_id, user_id, razorpay_order_id, COALESCE(razorpay_payment_id,''), COALESCE(razorpay_signature,''),
		amount, currency, status, refund_amount, COALESCE(failure_reason,''), created_at, updated_at
		FROM payments WHERE booking_id = ? ORDER BY created_at DESC LIMIT 1`
	row := r.db.QueryRow(query, bookingId)
	payment := &models.Payment{}
	err := row.Scan(&payment.Id, &payment.BookingId, &payment.UserId, &payment.RazorpayOrderId,
		&payment.RazorpayPaymentId, &payment.RazorpaySignature, &payment.Amount, &payment.Currency,
		&payment.Status, &payment.RefundAmount, &payment.FailureReason, &payment.CreatedAt, &payment.UpdatedAt)
	if err != nil {
		logger.Log.Error("Failed to fetch payment by booking ID", "error", err, "bookingId", bookingId)
		return nil, err
	}
	return payment, nil
}

func (r *PaymentRepository) UpdatePaymentStatus(paymentId int64, status string, razorpayPaymentId string, razorpaySignature string) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := `UPDATE payments SET status = ?, razorpay_payment_id = ?, razorpay_signature = ?, updated_at = NOW() WHERE id = ?`
	_, err = tx.Exec(query, status, razorpayPaymentId, razorpaySignature, paymentId)
	if err != nil {
		logger.Log.Error("Failed to update payment status", "error", err, "paymentId", paymentId, "status", status)
		return err
	}

	var bookingId, userId int64
	var userEmail, currency string
	var amount int
	err = tx.QueryRow(`SELECT booking_id, user_id, COALESCE(user_email, ''), amount, currency FROM payments WHERE id = ?`, paymentId).Scan(&bookingId, &userId, &userEmail, &amount, &currency)
	if err != nil {
		logger.Log.Error("Failed to fetch payment details for outbox", "error", err, "paymentId", paymentId)
		return err
	}

	eventID := generateUUID()
	payloadData, _ := json.Marshal(map[string]interface{}{
		"paymentId": paymentId,
		"bookingId": bookingId,
		"userId":    userId,
		"userEmail": userEmail,
		"amount":    amount,
		"currency":  currency,
		"status":    status,
	})
	_, err = tx.Exec(`INSERT INTO outbox (event_id, event_type, payload) VALUES (?, ?, ?)`, eventID, "PAYMENT_"+status, payloadData)
	if err != nil {
		logger.Log.Error("Failed to insert outbox event", "error", err)
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}
	logger.Log.Info("Payment status updated", "paymentId", paymentId, "status", status)
	return nil
}

func (r *PaymentRepository) UpdatePaymentFailure(paymentId int64, failureReason string) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := `UPDATE payments SET status = 'FAILED', failure_reason = ?, updated_at = NOW() WHERE id = ?`
	_, err = tx.Exec(query, failureReason, paymentId)
	if err != nil {
		logger.Log.Error("Failed to update payment failure", "error", err, "paymentId", paymentId)
		return err
	}

	var bookingId, userId int64
	var userEmail, currency string
	var amount int
	err = tx.QueryRow(`SELECT booking_id, user_id, COALESCE(user_email, ''), amount, currency FROM payments WHERE id = ?`, paymentId).Scan(&bookingId, &userId, &userEmail, &amount, &currency)
	if err != nil {
		logger.Log.Error("Failed to fetch payment details for outbox", "error", err, "paymentId", paymentId)
		return err
	}

	eventID := generateUUID()
	payloadData, _ := json.Marshal(map[string]interface{}{
		"paymentId":     paymentId,
		"bookingId":     bookingId,
		"userId":        userId,
		"userEmail":     userEmail,
		"amount":        amount,
		"currency":      currency,
		"status":        "FAILED",
		"failureReason": failureReason,
	})
	_, err = tx.Exec(`INSERT INTO outbox (event_id, event_type, payload) VALUES (?, ?, ?)`, eventID, "PAYMENT_FAILED", payloadData)
	if err != nil {
		logger.Log.Error("Failed to insert outbox event", "error", err)
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}
	logger.Log.Info("Payment marked as failed", "paymentId", paymentId)
	return nil
}
//PAYMENT_REFUNDED status 
func (r *PaymentRepository) UpdatePaymentRefund(paymentId int64, refundAmount int, status string) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := `UPDATE payments SET refund_amount = ?, status = ?, updated_at = NOW() WHERE id = ?`
	_, err = tx.Exec(query, refundAmount, status, paymentId)
	if err != nil {
		logger.Log.Error("Failed to update payment refund", "error", err, "paymentId", paymentId)
		return err
	}

	var bookingId, userId int64
	var userEmail, currency string
	var amount int
	err = tx.QueryRow(`SELECT booking_id, user_id, COALESCE(user_email, ''), amount, currency FROM payments WHERE id = ?`, paymentId).Scan(&bookingId, &userId, &userEmail, &amount, &currency)
	if err != nil {
		logger.Log.Error("Failed to fetch payment details for outbox", "error", err, "paymentId", paymentId)
		return err
	}

	eventID := generateUUID()
	payloadData, _ := json.Marshal(map[string]interface{}{
		"paymentId":    paymentId,
		"bookingId":    bookingId,
		"userId":       userId,
		"userEmail":    userEmail,
		"amount":       amount,
		"currency":     currency,
		"refundAmount": refundAmount,
		"status":       status,
	})
	_, err = tx.Exec(`INSERT INTO outbox (event_id, event_type, payload) VALUES (?, ?, ?)`, eventID, "PAYMENT_"+status, payloadData)
	if err != nil {
		logger.Log.Error("Failed to insert outbox event", "error", err)
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}
	logger.Log.Info("Payment refund updated", "paymentId", paymentId, "refundAmount", refundAmount, "status", status)
	return nil
}

func generateUUID() string {
	b := make([]byte, 16)
	rand.Read(b)
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}

func (r *PaymentRepository) GetStalePayments() ([]*models.Payment, error) {
	query := `SELECT id, booking_id, user_id, razorpay_order_id, COALESCE(razorpay_payment_id,''), COALESCE(razorpay_signature,''),
		amount, currency, status, refund_amount, COALESCE(failure_reason,''), created_at, updated_at
		FROM payments WHERE status = 'CREATED' AND created_at < DATE_SUB(NOW(), INTERVAL 1 HOUR)`
	rows, err := r.db.Query(query)
	if err != nil {
		logger.Log.Error("Failed to fetch stale payments", "error", err)
		return nil, err
	}
	defer rows.Close()

	var payments []*models.Payment
	for rows.Next() {
		payment := &models.Payment{}
		if err := rows.Scan(&payment.Id, &payment.BookingId, &payment.UserId, &payment.RazorpayOrderId,
			&payment.RazorpayPaymentId, &payment.RazorpaySignature, &payment.Amount, &payment.Currency,
			&payment.Status, &payment.RefundAmount, &payment.FailureReason, &payment.CreatedAt, &payment.UpdatedAt); err != nil {
			logger.Log.Error("Failed to scan stale payment row", "error", err)
			return nil, err
		}
		payments = append(payments, payment)
	}
	if err := rows.Err(); err != nil {
		logger.Log.Error("Error iterating stale payment rows", "error", err)
		return nil, err
	}
	return payments, nil
}

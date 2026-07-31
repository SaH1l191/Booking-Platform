package repositories

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"goPayment/models"
	"goPayment/pkg/logger"
	"time"

	"github.com/google/uuid"
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
		return nil, fmt.Errorf("get payment by id %d: %w", paymentId, err)
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
		return nil, fmt.Errorf("get payment by order id %s: %w", orderId, err)
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
		return nil, fmt.Errorf("get payment by booking id %d: %w", bookingId, err)
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
	payloadData, marshalErr := json.Marshal(map[string]interface{}{
		"paymentId": paymentId,
		"bookingId": bookingId,
		"userId":    userId,
		"userEmail": userEmail,
		"amount":    amount,
		"currency":  currency,
		"status":    status,
	})
	if marshalErr != nil {
		logger.Log.Error("Failed to marshal outbox payload", "error", marshalErr, "paymentId", paymentId)
		return marshalErr
	}
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
	payloadData, marshalErr := json.Marshal(map[string]interface{}{
		"paymentId":     paymentId,
		"bookingId":     bookingId,
		"userId":        userId,
		"userEmail":     userEmail,
		"amount":        amount,
		"currency":      currency,
		"status":        "FAILED",
		"failureReason": failureReason,
	})
	if marshalErr != nil {
		logger.Log.Error("Failed to marshal outbox payload", "error", marshalErr, "paymentId", paymentId)
		return marshalErr
	}
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
	payloadData, marshalErr := json.Marshal(map[string]interface{}{
		"paymentId":    paymentId,
		"bookingId":    bookingId,
		"userId":       userId,
		"userEmail":    userEmail,
		"amount":       amount,
		"currency":     currency,
		"refundAmount": refundAmount,
		"status":       status,
	})
	if marshalErr != nil {
		logger.Log.Error("Failed to marshal outbox payload", "error", marshalErr, "paymentId", paymentId)
		return marshalErr
	}
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

func (r *PaymentRepository) ClaimRefund(paymentId int64) (bool, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return false, err
	}
	defer tx.Rollback()

	var currentStatus string
	err = tx.QueryRow(`SELECT status FROM payments WHERE id = ? FOR UPDATE`, paymentId).Scan(&currentStatus)
	if err != nil {
		return false, err
	}
	if currentStatus != "CAPTURED" {
		return false, nil
	}

	_, err = tx.Exec(`UPDATE payments SET status = 'REFUNDING', updated_at = NOW() WHERE id = ?`, paymentId)
	if err != nil {
		return false, err
	}
	return true, tx.Commit()
}

func (r *PaymentRepository) ReclaimStaleRefunding(paymentId int64, staleThreshold time.Duration) (bool, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return false, err
	}
	defer tx.Rollback()

	var currentStatus string
	err = tx.QueryRow(`SELECT status FROM payments WHERE id = ? FOR UPDATE`, paymentId).Scan(&currentStatus)
	if err != nil {
		return false, err
	}
	if currentStatus != "REFUNDING" {
		return false, nil
	}

	var updatedAt time.Time
	err = tx.QueryRow(`SELECT updated_at FROM payments WHERE id = ?`, paymentId).Scan(&updatedAt)
	if err != nil {
		return false, err
	}
	if time.Since(updatedAt) < staleThreshold {
		return false, nil
	}

	_, err = tx.Exec(`UPDATE payments SET status = 'REFUNDING', updated_at = NOW() WHERE id = ?`, paymentId)
	if err != nil {
		return false, err
	}
	return true, tx.Commit()
}

func (r *PaymentRepository) FinalizeRefund(paymentId int64, refundAmount int) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	result, err := tx.Exec(`UPDATE payments SET status = 'REFUNDED', refund_amount = ?, updated_at = NOW() WHERE id = ? AND status = 'REFUNDING'`, refundAmount, paymentId)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return tx.Commit()
	}

	var bookingId, userId int64
	var userEmail, currency string
	var amount int
	err = tx.QueryRow(`SELECT booking_id, user_id, COALESCE(user_email,''), amount, currency FROM payments WHERE id = ?`, paymentId).
		Scan(&bookingId, &userId, &userEmail, &amount, &currency)
	if err != nil {
		return err
	}

	payloadData, _ := json.Marshal(map[string]interface{}{
		"paymentId": paymentId, "bookingId": bookingId, "userId": userId,
		"userEmail": userEmail, "amount": amount, "currency": currency,
		"refundAmount": refundAmount, "status": "REFUNDED",
	})
	_, err = tx.Exec(`INSERT INTO outbox (event_id, event_type, payload) VALUES (?, ?, ?)`,
		generateUUID(), "PAYMENT_REFUNDED", payloadData)
	if err != nil {
		return err
	}
	return tx.Commit()
}

func generateUUID() string {
	return uuid.NewString()
}

func (r *PaymentRepository) GetStalePayments() ([]*models.Payment, error) {
	query := `SELECT id, booking_id, user_id, razorpay_order_id, COALESCE(razorpay_payment_id,''), COALESCE(razorpay_signature,''),
		amount, currency, status, refund_amount, COALESCE(failure_reason,''), created_at, updated_at
		FROM payments
		WHERE (status = 'CREATED' AND created_at < DATE_SUB(NOW(), INTERVAL 1 HOUR))
		   OR (status = 'REFUNDING' AND updated_at < DATE_SUB(NOW(), INTERVAL 15 MINUTE))
		LIMIT 100`
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

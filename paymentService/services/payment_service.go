package services

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"github.com/razorpay/razorpay-go"
	"goPayment/config/env"
	"goPayment/dto"
	"goPayment/models"
	"goPayment/pkg/logger"
	db "goPayment/db/repositories"
)

type PaymentService interface {
	CreateOrder(userId int64, payload *dto.CreateOrderRequestDTO) (map[string]interface{}, error)
	VerifyPayment(payload *dto.VerifyPaymentRequestDTO) (*models.Payment, error)
	RefundPayment(payload *dto.RefundRequestDTO) (map[string]interface{}, error)
	GetPaymentByBookingId(bookingId int64) (*models.Payment, error)
	HandleWebhook(payload []byte, signature string) error
	FetchPaymentsWithStaleStatus() ([]*models.Payment, error)
}

type PaymentServiceImpl struct {
	paymentRepo    *db.PaymentRepository
	razorpayClient *razorpay.Client
}

func NewPaymentService(paymentRepo *db.PaymentRepository) PaymentService {
	keyId := env.GetEnv("RAZORPAY_KEY_ID", "")
	keySecret := env.GetEnv("RAZORPAY_KEY_SECRET", "")
	client := razorpay.NewClient(keyId, keySecret)
	return &PaymentServiceImpl{
		paymentRepo:    paymentRepo,
		razorpayClient: client,
	}
}

func (s *PaymentServiceImpl) CreateOrder(userId int64, payload *dto.CreateOrderRequestDTO) (map[string]interface{}, error) {
	logger.Log.Info("Creating Razorpay order", "bookingId", payload.BookingId, "amount", payload.Amount)

	// TODO: Validate booking exists and amount matches (call BookingService)

	orderData := map[string]interface{}{
		"amount":   payload.Amount,
		"currency": "INR",
		"receipt":  fmt.Sprintf("booking_%d", payload.BookingId),
		"notes": map[string]interface{}{
			"bookingId": payload.BookingId,
			"userId":    userId,
		},
	}
	order, err := s.razorpayClient.Order.Create(orderData, nil)
	if err != nil {
		logger.Log.Error("Failed to create Razorpay order", "error", err)
		return nil, err
	}

	orderId, _ := order["id"].(string)

	payment := &models.Payment{
		BookingId:       payload.BookingId,
		UserId:          userId,
		RazorpayOrderId: orderId,
		Amount:          payload.Amount,
		Currency:        "INR",
		Status:          "CREATED",
	}
	savedPayment, err := s.paymentRepo.CreatePayment(payment)
	if err != nil {
		logger.Log.Error("Failed to save payment record", "error", err)
		return nil, err
	}

	result := map[string]interface{}{
		"orderId":  orderId,
		"amount":   savedPayment.Amount,
		"currency": savedPayment.Currency,
		"keyId":    env.GetEnv("RAZORPAY_KEY_ID", ""),
	}

	logger.Log.Info("Razorpay order created", "orderId", orderId, "paymentId", savedPayment.Id)
	logger.Log.Info("CreateOrder result", "result", result)
	return result, nil
}

func (s *PaymentServiceImpl) VerifyPayment(payload *dto.VerifyPaymentRequestDTO) (*models.Payment, error) {
	logger.Log.Info("Verifying payment signature", "orderId", payload.RazorpayOrderId, "paymentId", payload.RazorpayPaymentId)

	// Fetch payment record
	payment, err := s.paymentRepo.GetPaymentByOrderId(payload.RazorpayOrderId)
	if err != nil {
		logger.Log.Error("Payment not found for order", "orderId", payload.RazorpayOrderId, "error", err)
		return nil, err
	}

	// Verify HMAC signature
	expectedSignature := ComputeHmacSha256(
		fmt.Sprintf("%s|%s", payload.RazorpayOrderId, payload.RazorpayPaymentId),env.GetEnv("RAZORPAY_KEY_SECRET", ""),
	)
	if expectedSignature != payload.RazorpaySignature {
		logger.Log.Warn("Payment signature mismatch", "orderId", payload.RazorpayOrderId)
		s.paymentRepo.UpdatePaymentFailure(payment.Id, "Signature verification failed")
		return nil, fmt.Errorf("invalid payment signature")
	}

	// Update payment record
	err = s.paymentRepo.UpdatePaymentStatus(payment.Id, "CAPTURED", payload.RazorpayPaymentId, payload.RazorpaySignature)
	if err != nil {
		logger.Log.Error("Failed to update payment status", "error", err)
		return nil, err
	}

	// TODO: Call BookingService to confirm booking
	// PATCH /bookings/confirm/{bookingId}

	payment.Status = "CAPTURED"
	payment.RazorpayPaymentId = payload.RazorpayPaymentId
	payment.RazorpaySignature = payload.RazorpaySignature

	logger.Log.Info("Payment verified successfully", "paymentId", payment.Id)
	return payment, nil
}

func (s *PaymentServiceImpl) RefundPayment(payload *dto.RefundRequestDTO) (map[string]interface{}, error) {
	logger.Log.Info("Processing refund", "paymentId", payload.PaymentId, "amount", payload.Amount)

	payment, err := s.paymentRepo.GetPaymentById(payload.PaymentId)
	if err != nil {
		logger.Log.Error("Payment not found", "paymentId", payload.PaymentId, "error", err)
		return nil, err
	}

	refundAmount := payment.Amount
	if payload.Amount != nil {
		refundAmount = *payload.Amount
	}

	notes := map[string]interface{}{
		"reason": "booking_cancelled",
	}

	refund, err := s.razorpayClient.Payment.Refund(payment.RazorpayPaymentId, refundAmount, notes, nil)
	if err != nil {
		logger.Log.Error("Failed to create Razorpay refund", "error", err)
		return nil, err
	}

	refundId, _ := refund["id"].(string)
	newRefundAmount := payment.RefundAmount
	if payload.Amount != nil {
		newRefundAmount += *payload.Amount
	} else {
		newRefundAmount = payment.Amount
	}

	status := "REFUNDED"
	if newRefundAmount < payment.Amount {
		status = "PARTIAL_REFUNDED"
	}
	s.paymentRepo.UpdatePaymentRefund(payment.Id, newRefundAmount, status)

	result := map[string]interface{}{
		"refundId": refundId,
		"status":   "processed",
	}

	logger.Log.Info("Refund processed", "paymentId", payload.PaymentId, "refundId", refundId)
	return result, nil
}

func (s *PaymentServiceImpl) GetPaymentByBookingId(bookingId int64) (*models.Payment, error) {
	logger.Log.Info("Fetching payment by booking ID", "bookingId", bookingId)
	return s.paymentRepo.GetPaymentByBookingId(bookingId)
}

func (s *PaymentServiceImpl) HandleWebhook(rawBody []byte, signature string) error {
	logger.Log.Info("Processing webhook event")

	// Verify webhook signature
	webhookSecret := env.GetEnv("RAZORPAY_WEBHOOK_SECRET", "")
	if webhookSecret != "" {
		expectedSig := ComputeHmacSha256(string(rawBody), webhookSecret)
		if expectedSig != signature {
			logger.Log.Warn("Invalid webhook signature")
			return fmt.Errorf("invalid webhook signature")
		}
	}

	// Parse webhook payload
	var webhookPayload dto.WebhookPayload
	if err := json.Unmarshal(rawBody, &webhookPayload); err != nil {
		logger.Log.Error("Failed to parse webhook payload", "error", err)
		return fmt.Errorf("invalid webhook payload: %w", err)
	}

	switch webhookPayload.Event {
	case "payment.captured":
		logger.Log.Info("Payment captured via webhook", "orderId", webhookPayload.Payload.Payment.Entity.OrderId)
		// TODO: Update payment status and confirm booking
	case "payment.failed":
		logger.Log.Info("Payment failed via webhook", "orderId", webhookPayload.Payload.Payment.Entity.OrderId)
		// TODO: Update payment status and release room hold
	case "refund.processed":
		logger.Log.Info("Refund processed via webhook")
		// TODO: Update refund status
	default:
		logger.Log.Info("Unhandled webhook event", "event", webhookPayload.Event)
	}

	logger.Log.Info("Webhook event processed", "event", webhookPayload.Event)
	return nil
}

func (s *PaymentServiceImpl) FetchPaymentsWithStaleStatus() ([]*models.Payment, error) {
	logger.Log.Info("Fetching stale payments for reconciliation")
	return s.paymentRepo.GetStalePayments()
}

func ComputeHmacSha256(message string, secret string) string {
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(message))
	return hex.EncodeToString(h.Sum(nil))
}

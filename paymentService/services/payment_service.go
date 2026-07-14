package services

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"goPayment/config/env"
	db "goPayment/db/repositories"
	"goPayment/dto"
	"goPayment/models"
	"goPayment/pkg/logger"
	"time"

	"github.com/razorpay/razorpay-go"
)

type PaymentService interface {
	CreateOrder(userId int64, userEmail string, payload *dto.CreateOrderRequestDTO) (map[string]interface{}, error)
	VerifyPayment(payload *dto.VerifyPaymentRequestDTO) (*models.Payment, error)
	RefundPayment(payload *dto.RefundRequestDTO) (map[string]interface{}, error)
	GetPaymentByBookingId(bookingId int64) (*models.Payment, error)
	HandleWebhook(payload []byte, signature string) error
	FetchPaymentsWithStaleStatus() ([]*models.Payment, error)
	GetRazorpayKeyId() string
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

func (s *PaymentServiceImpl) CreateOrder(userId int64, userEmail string, payload *dto.CreateOrderRequestDTO) (map[string]interface{}, error) {
	logger.Log.Info("Creating Razorpay order", "bookingId", payload.BookingId, "amount", payload.Amount)

	orderData := map[string]interface{}{
		"amount":   payload.Amount,
		"currency": "INR",
		"expire_by": time.Now().Add(10 * time.Minute).Unix(),
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
		UserEmail:       userEmail,
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


//Fix: VerifyPayment should check booking.expiresAt before confirming
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

	payment.Status = "CAPTURED"
	payment.RazorpayPaymentId = payload.RazorpayPaymentId
	payment.RazorpaySignature = payload.RazorpaySignature

	logger.Log.Info("Payment verified successfully", "paymentId", payment.Id)
	return payment, nil
}

func (s *PaymentServiceImpl) RefundPayment(payload *dto.RefundRequestDTO) (map[string]interface{}, error) {
	logger.Log.Info("Processing refund", "paymentId", payload.PaymentId, "bookingId", payload.BookingId)

	var payment *models.Payment
	var err error

	if payload.PaymentId > 0 {
		payment, err = s.paymentRepo.GetPaymentById(payload.PaymentId)
	} else {
		payment, err = s.paymentRepo.GetPaymentByBookingId(payload.BookingId)
	}

	if err != nil {
		logger.Log.Error("Payment not found", "paymentId", payload.PaymentId, "bookingId", payload.BookingId, "error", err)
		return nil, err
	}

	notes := map[string]interface{}{
		"reason": "booking_cancelled",
	}

	refund, err := s.razorpayClient.Payment.Refund(payment.RazorpayPaymentId, payment.Amount, notes, nil)
	if err != nil {
		logger.Log.Error("Failed to create Razorpay refund", "error", err)
		return nil, err
	}

	refundId, _ := refund["id"].(string)
	s.paymentRepo.UpdatePaymentRefund(payment.Id, payment.Amount, "REFUNDED")

	result := map[string]interface{}{
		"refundId": refundId,
		"status":   "processed",
	}

	logger.Log.Info("Refund processed", "paymentId", payload.PaymentId, "bookingId", payload.BookingId, "refundId", refundId)
	return result, nil
}

func (s *PaymentServiceImpl) GetPaymentByBookingId(bookingId int64) (*models.Payment, error) {
	logger.Log.Info("Fetching payment by booking ID", "bookingId", bookingId)
	return s.paymentRepo.GetPaymentByBookingId(bookingId)
}

func (s *PaymentServiceImpl) HandleWebhook(rawBody []byte, signature string) error {
	logger.Log.Info("Processing webhook event")

	webhookSecret := env.GetEnv("RAZORPAY_WEBHOOK_SECRET", "")
	if webhookSecret != "" {
		expectedSig := ComputeHmacSha256(string(rawBody), webhookSecret)
		if expectedSig != signature {
			logger.Log.Warn("Invalid webhook signature")
			return fmt.Errorf("invalid webhook signature")
		}
	}

	var webhookPayload dto.WebhookPayload
	if err := json.Unmarshal(rawBody, &webhookPayload); err != nil {
		logger.Log.Error("Failed to parse webhook payload", "error", err)
		return fmt.Errorf("invalid webhook payload: %w", err)
	}

	switch webhookPayload.Event {
	case "payment.captured":
		orderId := webhookPayload.Payload.Payment.Entity.OrderId
		paymentId := webhookPayload.Payload.Payment.Entity.Id
		logger.Log.Info("Payment captured via webhook", "orderId", orderId, "paymentId", paymentId)

		payment, err := s.paymentRepo.GetPaymentByOrderId(orderId)
		if err != nil {
			logger.Log.Warn("Payment not found for webhook order", "orderId", orderId)
			return nil
		}

		if payment.Status == "CAPTURED" {
			logger.Log.Info("Payment already captured, skipping duplicate webhook", "orderId", orderId)
			return nil
		}

		if payment.Status != "CREATED" {
			logger.Log.Warn("Payment in unexpected status for capture webhook", "orderId", orderId, "status", payment.Status)
			return nil
		}

		err = s.paymentRepo.UpdatePaymentStatus(payment.Id, "CAPTURED", paymentId, "")
		if err != nil {
			logger.Log.Error("Failed to update payment status from webhook", "error", err)
			return err
		}

	case "payment.failed":
		orderId := webhookPayload.Payload.Payment.Entity.OrderId
		logger.Log.Info("Payment failed via webhook", "orderId", orderId)

		payment, err := s.paymentRepo.GetPaymentByOrderId(orderId)
		if err != nil {
			logger.Log.Warn("Payment not found for webhook order", "orderId", orderId)
			return nil
		}

		if payment.Status == "FAILED" {
			logger.Log.Info("Payment already failed, skipping duplicate webhook", "orderId", orderId)
			return nil
		}

		if payment.Status != "CREATED" {
			logger.Log.Warn("Payment in unexpected status for failure webhook", "orderId", orderId, "status", payment.Status)
			return nil
		}

		err = s.paymentRepo.UpdatePaymentFailure(payment.Id, "Failed via webhook")
		if err != nil {
			logger.Log.Error("Failed to update payment failure from webhook", "error", err)
			return err
		}

	case "refund.processed":
		logger.Log.Info("Refund processed via webhook")
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

func (s *PaymentServiceImpl) GetRazorpayKeyId() string {
	return env.GetEnv("RAZORPAY_KEY_ID", "")
}

func ComputeHmacSha256(message string, secret string) string {
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(message))
	return hex.EncodeToString(h.Sum(nil))
}

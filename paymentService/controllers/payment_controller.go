package controllers

import (
	"database/sql"
	"errors"
	"fmt"
	"goPayment/dto"
	"goPayment/services"
	"goPayment/utils"
	"io"
	"net/http"
	"strconv"
	"github.com/go-chi/chi"
)

type PaymentController struct {
	PaymentService services.PaymentService
}

func NewPaymentController(paymentService services.PaymentService) *PaymentController {
	return &PaymentController{PaymentService: paymentService}
}

func (pc *PaymentController) CreateOrder(w http.ResponseWriter, r *http.Request) {
	payload, ok := r.Context().Value("payload").(dto.CreateOrderRequestDTO)
	if !ok {
		utils.WriteJsonErrorResponse(w, http.StatusBadRequest, "Invalid request payload", fmt.Errorf("invalid payload type"))
		return
	}
	userIDStr, ok := r.Context().Value("userID").(string)
	if !ok || userIDStr == "" {
		utils.WriteJsonErrorResponse(w, http.StatusUnauthorized, "Invalid user context", fmt.Errorf("missing user ID"))
		return
	}
	userEmail, ok := r.Context().Value("email").(string)
	if !ok {
		userEmail = ""
	}

	userId, err := strconv.ParseInt(userIDStr, 10, 64)
	if err != nil {
		utils.WriteJsonErrorResponse(w, http.StatusBadRequest, "Invalid user ID", err)
		return
	}

	fmt.Println("Creating order", "userId", userId, "bookingId", payload.BookingId)

	result, err := pc.PaymentService.CreateOrder(userId, userEmail, &payload)
	if err != nil {
		utils.WriteJsonErrorResponse(w, http.StatusInternalServerError, "Failed to create order", err)
		return
	}

	utils.WriteJsonSuccessResponse(w, http.StatusOK, "Order created successfully", result)
}

func (pc *PaymentController) VerifyPayment(w http.ResponseWriter, r *http.Request) {
	payload := r.Context().Value("payload").(dto.VerifyPaymentRequestDTO)

	fmt.Println("Verifying payment", "orderId", payload.RazorpayOrderId)

	payment, err := pc.PaymentService.VerifyPayment(&payload)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			utils.WriteJsonErrorResponse(w, http.StatusNotFound, "Payment not found", err)
		} else {
			utils.WriteJsonErrorResponse(w, http.StatusInternalServerError, "Payment verification failed", err)
		}
		return
	}

	utils.WriteJsonSuccessResponse(w, http.StatusOK, "Payment verified successfully", map[string]interface{}{
		"paymentId": payment.Id,
		"status":    payment.Status,
	})
}

func (pc *PaymentController) RefundPayment(w http.ResponseWriter, r *http.Request) {
	payload := r.Context().Value("payload").(dto.RefundRequestDTO)

	fmt.Println("Refunding payment", "paymentId", payload.PaymentId)

	result, err := pc.PaymentService.RefundPayment(&payload)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			utils.WriteJsonErrorResponse(w, http.StatusNotFound, "Payment not found", err)
		} else {
			utils.WriteJsonErrorResponse(w, http.StatusInternalServerError, "Refund failed", err)
		}
		return
	}

	utils.WriteJsonSuccessResponse(w, http.StatusOK, "Refund processed successfully", result)
}

func (pc *PaymentController) GetPaymentByBookingId(w http.ResponseWriter, r *http.Request) {
	bookingIdParam := chi.URLParam(r, "bookingId")
	bookingId, err := strconv.ParseInt(bookingIdParam, 10, 64)
	if err != nil {
		utils.WriteJsonErrorResponse(w, http.StatusBadRequest, "Invalid booking ID", fmt.Errorf("invalid booking ID format"))
		return
	}

	fmt.Println("Fetching payment by booking ID", "bookingId", bookingId)

	payment, err := pc.PaymentService.GetPaymentByBookingId(bookingId)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			utils.WriteJsonErrorResponse(w, http.StatusNotFound, "Payment not found", err)
		} else {
			utils.WriteJsonErrorResponse(w, http.StatusInternalServerError, "Failed to fetch payment", err)
		}
		return
	}

	result := map[string]interface{}{
		"id":                payment.Id,
		"bookingId":         payment.BookingId,
		"userId":            payment.UserId,
		"razorpayOrderId":   payment.RazorpayOrderId,
		"razorpayPaymentId": payment.RazorpayPaymentId,
		"amount":            payment.Amount,
		"currency":          payment.Currency,
		"status":            payment.Status,
		"createdAt":         payment.CreatedAt,
		"updatedAt":         payment.UpdatedAt,
		"keyId":             pc.PaymentService.GetRazorpayKeyId(),
	}

	utils.WriteJsonSuccessResponse(w, http.StatusOK, "Payment fetched successfully", result)
}

func (pc *PaymentController) HandleWebhook(w http.ResponseWriter, r *http.Request) {
	rawBody, err := io.ReadAll(r.Body)
	if err != nil {
		utils.WriteJsonErrorResponse(w, http.StatusBadRequest, "Failed to read webhook body", err)
		return
	}
	defer r.Body.Close()

	signature := r.Header.Get("X-Razorpay-Signature")

	fmt.Println("Webhook received")

	err = pc.PaymentService.HandleWebhook(rawBody, signature)
	if err != nil {
		utils.WriteJsonErrorResponse(w, http.StatusBadRequest, "Webhook processing failed", err)
		return
	}

	// Always return 200 to Razorpay
	utils.WriteJsonSuccessResponse(w, http.StatusOK, "Webhook processed", nil)
}

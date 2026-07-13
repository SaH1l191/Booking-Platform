package dto

import (
	"github.com/go-ozzo/ozzo-validation/v4"
)

type CreateOrderRequestDTO struct {
	BookingId int64 `json:"bookingId"`
	Amount    int   `json:"amount"`
}

func (dto *CreateOrderRequestDTO) Validate() error {
	return validation.ValidateStruct(dto,
		validation.Field(&dto.BookingId, validation.Required),
		validation.Field(&dto.Amount, validation.Required, validation.Min(1)),
	)
}

type VerifyPaymentRequestDTO struct {
	RazorpayOrderId   string `json:"razorpay_order_id"`
	RazorpayPaymentId string `json:"razorpay_payment_id"`
	RazorpaySignature string `json:"razorpay_signature"`
	BookingId         int64  `json:"bookingId"`
}

func (dto *VerifyPaymentRequestDTO) Validate() error {
	return validation.ValidateStruct(dto,
		validation.Field(&dto.RazorpayOrderId, validation.Required),
		validation.Field(&dto.RazorpayPaymentId, validation.Required),
		validation.Field(&dto.RazorpaySignature, validation.Required),
		validation.Field(&dto.BookingId, validation.Required),
	)
}

type RefundRequestDTO struct {
	PaymentId int64 `json:"paymentId"`
}

func (dto *RefundRequestDTO) Validate() error {
	return validation.ValidateStruct(dto,
		validation.Field(&dto.PaymentId, validation.Required),
	)
}

type WebhookPayload struct {
	Event   string            `json:"event"`
	Payload WebhookPayloadData `json:"payload"`
}

type WebhookPayloadData struct {
	Payment WebhookPayment `json:"payment"`
}

type WebhookPayment struct {
	Entity WebhookPaymentEntity `json:"entity"`
}

type WebhookPaymentEntity struct {
	Id        string `json:"id"`
	OrderId   string `json:"order_id"`
	Amount    int    `json:"amount"`
	Status    string `json:"status"`
}

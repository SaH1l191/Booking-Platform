package models

import "time"

type Payment struct {
	Id                int64
	BookingId         int64
	UserId            int64
	UserEmail         string
	RazorpayOrderId   string
	RazorpayPaymentId string
	RazorpaySignature string
	Amount            int
	Currency          string
	Status            string
	RefundAmount      int
	FailureReason     string
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

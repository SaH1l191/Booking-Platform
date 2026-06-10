package models

type Payment struct {
	Id                int64
	BookingId         int64
	UserId            int64
	RazorpayOrderId   string
	RazorpayPaymentId string
	RazorpaySignature string
	Amount            int
	Currency          string
	Status            string
	RefundAmount      int
	FailureReason     string
	CreatedAt         string
	UpdatedAt         string
}

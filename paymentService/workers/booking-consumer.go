package workers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"goPayment/config/rabbitmq"
	"goPayment/dto"
	"goPayment/pkg/logger"
	"goPayment/services"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

func isEventProcessed(db *sql.DB, eventId string) (bool, error) {
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM processed_events WHERE event_id = ?)", eventId).Scan(&exists)
	return exists, err
}

func markEventProcessed(db *sql.DB, eventId string) error {
	_, err := db.Exec("INSERT IGNORE INTO processed_events (event_id) VALUES (?)", eventId)
	return err
}

const bookingExchange = "booking_events_exchange"

type BookingEventEnvelope struct {
	EventId   string          `json:"eventId"`
	EventType string          `json:"eventType"`
	Payload   json.RawMessage `json:"payload"`
}

type BookingCreatedPayload struct {
	BookingId     int64     `json:"bookingId"`
	UserId        int64     `json:"userId"`
	HotelId       int64     `json:"hotelId"`
	RoomId        int64     `json:"roomId"`
	CheckIn       string    `json:"checkIn"`
	CheckOut      string    `json:"checkOut"`
	BookingAmount int       `json:"bookingAmount"`
	TotalGuests   int       `json:"totalGuests"`
	UserEmail     string    `json:"userEmail"`
	CreatedAt     time.Time `json:"createdAt"`
}

type BookingCancelledPayload struct {
	BookingId int64  `json:"bookingId"`
	UserId    int64  `json:"userId"`
	HotelId   int64  `json:"hotelId"`
	RoomId    int64  `json:"roomId"`
	UserEmail string `json:"userEmail"`
	Status    string `json:"status"`
	Reason    string `json:"reason"`
}

type RefundRequestedPayload struct {
	BookingId int64  `json:"bookingId"`
	Reason    string `json:"reason"`
}

type BookingConsumer struct {
	paymentService services.PaymentService
	db             *sql.DB
}

func NewBookingConsumer(paymentService services.PaymentService, db *sql.DB) *BookingConsumer {
	return &BookingConsumer{paymentService: paymentService, db: db}
}

func (c *BookingConsumer) Start() error {
	ch := rabbitmq.Channel

	if err := ch.ExchangeDeclare(bookingExchange, "fanout", true, false, false, false, nil); err != nil {
		return fmt.Errorf("failed to declare exchange: %w", err)
	}

	queueName := "payment-service-booking-events"
	if _, err := ch.QueueDeclare(queueName, true, false, false, false, nil); err != nil {
		return fmt.Errorf("failed to declare queue: %w", err)
	}

	if err := ch.QueueBind(queueName, "", bookingExchange, false, nil); err != nil {
		return fmt.Errorf("failed to bind queue: %w", err)
	}

	msgs, err := ch.Consume(queueName, "", false, false, false, false, nil)
	if err != nil {
		return fmt.Errorf("failed to register consumer: %w", err)
	}

	go c.consume(msgs)

	logger.Log.Info("Booking consumer started", "queue", queueName, "exchange", bookingExchange)
	return nil
}

func (c *BookingConsumer) consume(msgs <-chan amqp.Delivery) {
	for msg := range msgs {
		c.handleMessage(msg)
	}
}

func (c *BookingConsumer) handleMessage(msg amqp.Delivery) {
	var envelope BookingEventEnvelope
	if err := json.Unmarshal(msg.Body, &envelope); err != nil {
		logger.Log.Error("Failed to unmarshal booking event envelope", "error", err)
		msg.Nack(false, false)
		return
	}

	if envelope.EventId != "" {
		exists, err := isEventProcessed(c.db, envelope.EventId)
		if err != nil {
			logger.Log.Error("Failed to check processed event", "error", err, "eventId", envelope.EventId)
			msg.Nack(false, true)
			return
		}
		if exists {
			logger.Log.Info("Event already processed, skipping", "eventId", envelope.EventId, "eventType", envelope.EventType)
			msg.Ack(false)
			return
		}
	}

	switch envelope.EventType {
	case "BOOKING_CREATED":
		c.handleBookingCreated(msg, envelope)
	case "BOOKING_CANCELLED":
		c.handleBookingCancelled(msg, envelope)
	case "REFUND_REQUESTED":
		c.handleRefundRequested(msg, envelope)
	default:
		logger.Log.Info("Ignoring unhandled booking event", "eventType", envelope.EventType)
		msg.Ack(false)
	}
}

func (c *BookingConsumer) handleBookingCreated(msg amqp.Delivery, envelope BookingEventEnvelope) {
	var event BookingCreatedPayload
	if err := json.Unmarshal(envelope.Payload, &event); err != nil {
		logger.Log.Error("Failed to unmarshal booking-created payload", "error", err)
		msg.Nack(false, false)
		return
	}

	logger.Log.Info("Received booking-created event", "bookingId", event.BookingId)

	existingPayment, err := c.paymentService.GetPaymentByBookingId(event.BookingId)
	if err == nil && existingPayment != nil {
		logger.Log.Info("Payment already exists for booking, skipping duplicate order creation",
			"bookingId", event.BookingId, "existingPaymentId", existingPayment.Id, "status", existingPayment.Status)
		markEventProcessed(c.db, envelope.EventId)
		msg.Ack(false)
		return
	}

	//queue fails , booking expired so bookingcreated event should not create order ( although later handled )
	if !event.CreatedAt.IsZero() && time.Now().After(event.CreatedAt.Add(15*time.Minute)) {
		logger.Log.Info("Booking already expired, skipping order creation",
			"bookingId", event.BookingId, "createdAt", event.CreatedAt)
		markEventProcessed(c.db, envelope.EventId)
		msg.Ack(false)
		return
	}

	createOrderDTO := &dto.CreateOrderRequestDTO{
		BookingId: event.BookingId,
		Amount:    event.BookingAmount,
	}

	result, err := c.paymentService.CreateOrder(event.UserId, event.UserEmail, createOrderDTO)
	if err != nil {
		logger.Log.Error("Failed to create order from booking event", "bookingId", event.BookingId, "error", err)
		msg.Nack(false, true)
		return
	}

	logger.Log.Info("Order created from booking-created event",
		"bookingId", event.BookingId,
		"orderId", result["orderId"],
	)

	markEventProcessed(c.db, envelope.EventId)
	msg.Ack(false) //remove msg permenently
}

func (c *BookingConsumer) handleBookingCancelled(msg amqp.Delivery, envelope BookingEventEnvelope) {
	var event BookingCancelledPayload
	if err := json.Unmarshal(envelope.Payload, &event); err != nil {
		logger.Log.Error("Failed to unmarshal booking-cancelled payload", "error", err)
		msg.Nack(false, false)
		return
	}

	logger.Log.Info("Received booking-cancelled event", "bookingId", event.BookingId, "reason", event.Reason)

	payment, err := c.paymentService.GetPaymentByBookingId(event.BookingId)
	if err != nil {
		logger.Log.Info("No payment found for cancelled booking, skipping refund", "bookingId", event.BookingId)
		markEventProcessed(c.db, envelope.EventId)
		msg.Ack(false)
		return
	}

	if payment.Status != "CAPTURED" {
		logger.Log.Info("Payment not in CAPTURED state, skipping refund", "bookingId", event.BookingId, "paymentStatus", payment.Status)
		markEventProcessed(c.db, envelope.EventId)
		msg.Ack(false)
		return
	}

	refundDTO := &dto.RefundRequestDTO{
		PaymentId: payment.Id,
	}

	//updates status , inserts PAYMENT_REFUNDED in outbox (emits indirectly ) 
	_, err = c.paymentService.RefundPayment(refundDTO)
	if err != nil {
		logger.Log.Error("Failed to process refund for cancelled booking", "bookingId", event.BookingId, "error", err)
		msg.Nack(false, true)
		return
	}

	logger.Log.Info("Refund initiated for cancelled booking", "bookingId", event.BookingId, "paymentId", payment.Id)
	markEventProcessed(c.db, envelope.EventId)
	msg.Ack(false)
}

func (c *BookingConsumer) handleRefundRequested(msg amqp.Delivery, envelope BookingEventEnvelope) {
	var event RefundRequestedPayload
	if err := json.Unmarshal(envelope.Payload, &event); err != nil {
		logger.Log.Error("Failed to unmarshal refund-requested payload", "error", err)
		msg.Nack(false, false)
		return
	}

	logger.Log.Info("Received refund-requested event", "bookingId", event.BookingId, "reason", event.Reason)

	payment, err := c.paymentService.GetPaymentByBookingId(event.BookingId)
	if err != nil {
		logger.Log.Info("No payment found for refund request, skipping", "bookingId", event.BookingId)
		markEventProcessed(c.db, envelope.EventId)
		msg.Ack(false)
		return
	}

	if payment.Status != "CAPTURED" {
		logger.Log.Info("Payment not in CAPTURED state, skipping refund", "bookingId", event.BookingId, "paymentStatus", payment.Status)
		markEventProcessed(c.db, envelope.EventId)
		msg.Ack(false)
		return
	}

	refundDTO := &dto.RefundRequestDTO{
		PaymentId: payment.Id,
	}

	_, err = c.paymentService.RefundPayment(refundDTO)
	if err != nil {
		logger.Log.Error("Failed to process refund for refund-requested event", "bookingId", event.BookingId, "error", err)
		msg.Nack(false, true)
		return
	}

	logger.Log.Info("Refund initiated for refund-requested event", "bookingId", event.BookingId, "paymentId", payment.Id)
	markEventProcessed(c.db, envelope.EventId)
	msg.Ack(false)
}

package workers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"ReviewService/config/env"
	"ReviewService/pkg/logger"
	amqp "github.com/rabbitmq/amqp091-go"
)

const bookingExchange = "booking_events_exchange"

type BookingEventEnvelope struct {
	EventId   string          `json:"eventId"`
	EventType string          `json:"eventType"`
	Payload   json.RawMessage `json:"payload"`
}

type BookingStayCompletedPayload struct {
	BookingId int64  `json:"bookingId"`
	UserId    int64  `json:"userId"`
	HotelId   int64  `json:"hotelId"`
	RoomId    int64  `json:"roomId"`
}

type BookingConsumer struct {
	db *sql.DB
}

func NewBookingConsumer(db *sql.DB) *BookingConsumer {
	return &BookingConsumer{db: db}
}

func (c *BookingConsumer) Start() error {
	rabbitmqURL := env.GetEnv("RABBITMQ_URL")
	conn, err := amqp.Dial(rabbitmqURL)
	if err != nil {
		return fmt.Errorf("failed to connect to RabbitMQ: %w", err)
	}

	ch, err := conn.Channel()
	if err != nil {
		return fmt.Errorf("failed to open channel: %w", err)
	}

	if err := ch.ExchangeDeclare(bookingExchange, "fanout", true, false, false, false, nil); err != nil {
		return fmt.Errorf("failed to declare exchange: %w", err)
	}

	queueName := "review-service-booking-events"
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

	logger.Log.Info("Review booking consumer started", "queue", queueName, "exchange", bookingExchange)
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

	//atleast 1  dedup ops 
	if envelope.EventId != "" {
		var exists bool
		err := c.db.QueryRow("SELECT EXISTS(SELECT 1 FROM processed_events WHERE event_id = ?)", envelope.EventId).Scan(&exists)
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
	case "BOOKING_STAY_COMPLETED":
		c.handleStayCompleted(msg, envelope)
	default:
		logger.Log.Info("Ignoring unhandled booking event", "eventType", envelope.EventType)
		msg.Ack(false)
	}
}

//processed_events table guarentees ateast 1  and de-dup 
func (c *BookingConsumer) handleStayCompleted(msg amqp.Delivery, envelope BookingEventEnvelope) {
	var event BookingStayCompletedPayload
	if err := json.Unmarshal(envelope.Payload, &event); err != nil {
		logger.Log.Error("Failed to unmarshal stay-completed payload", "error", err)
		msg.Nack(false, false)
		return
	}

	logger.Log.Info("Received stay-completed event", "bookingId", event.BookingId, "userId", event.UserId)


	//review eligibility check - row exists or not ? 
	var exists bool
	err := c.db.QueryRow("SELECT EXISTS(SELECT 1 FROM review_eligibility WHERE booking_id = ?)", event.BookingId).Scan(&exists)
	if err != nil { //some db error : retry later 
		logger.Log.Error("Failed to check existing eligibility", "error", err, "bookingId", event.BookingId)
		msg.Nack(false, true)
		return
	}

	if exists {
		// Already eligible, but need this eventId to de dup later in case queu failed and 
		//it retreis again this event id 
		logger.Log.Info("Already eligible, skipping", "bookingId", event.BookingId)
		_, _ = c.db.Exec("INSERT IGNORE INTO processed_events (event_id) VALUES (?)", envelope.EventId)
		msg.Ack(false)
		return
	}

	query := `INSERT INTO review_eligibility (booking_id, user_id, hotel_id, room_id, eligible)
		VALUES (?, ?, ?, ?, TRUE)`
	_, err = c.db.Exec(query, event.BookingId, event.UserId, event.HotelId, event.RoomId)
	if err != nil {
		logger.Log.Error("Failed to upsert review eligibility", "error", err, "bookingId", event.BookingId)
		msg.Nack(false, true)
		return
	}

	logger.Log.Info("Review eligibility upserted", "bookingId", event.BookingId, "userId", event.UserId)
	_, _ = c.db.Exec("INSERT IGNORE INTO processed_events (event_id) VALUES (?)", envelope.EventId)
	msg.Ack(false)
}

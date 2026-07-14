package workers

import (
	"database/sql"
	"encoding/json"
	"goPayment/config/rabbitmq"
	"goPayment/pkg/logger"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

const outboxPollInterval = 5 * time.Second

type OutboxEvent struct {
	Id        int64
	EventType string
	Payload   []byte
}

type OutboxPublisher struct {
	db *sql.DB
}

func NewOutboxPublisher(db *sql.DB) *OutboxPublisher {
	return &OutboxPublisher{db: db}
}

func (w *OutboxPublisher) Start() {
	go w.poll()
	logger.Log.Info("Outbox publisher started")
}

func (w *OutboxPublisher) poll() {
	ticker := time.NewTicker(outboxPollInterval)
	defer ticker.Stop()

	for range ticker.C {
		w.processPendingEvents()
	}
}

func (w *OutboxPublisher) processPendingEvents() {
	tx, err := w.db.Begin()
	if err != nil {
		logger.Log.Error("Failed to begin outbox transaction", "error", err)
		return
	}
	defer tx.Rollback()

	rows, err := tx.Query(`SELECT id, event_type, payload FROM outbox WHERE published = FALSE ORDER BY id ASC LIMIT 50 FOR UPDATE SKIP LOCKED`)
	if err != nil {
		logger.Log.Error("Failed to query outbox", "error", err)
		return
	}

	var events []OutboxEvent
	for rows.Next() {
		var e OutboxEvent
		if err := rows.Scan(&e.Id, &e.EventType, &e.Payload); err != nil {
			logger.Log.Error("Failed to scan outbox row", "error", err)
			continue
		}
		events = append(events, e)
	}
	rows.Close()

	if len(events) == 0 {
		tx.Rollback()
		return
	}

	ch := rabbitmq.Channel
	exchangeName := "payment_events_exchange"

	err = ch.ExchangeDeclare(exchangeName, "fanout", true, false, false, false, nil)
	if err != nil {
		logger.Log.Error("Failed to declare outbox exchange", "error", err)
		return
	}

	for _, event := range events {
		body := map[string]interface{}{
			"eventType": event.EventType,
			"payload":   json.RawMessage(event.Payload),
		}
		bodyBytes, _ := json.Marshal(body)

		err := ch.Publish(exchangeName, "", false, false, amqp.Publishing{
			ContentType: "application/json",
			Body:        bodyBytes,
		})
		if err != nil {
			logger.Log.Error("Failed to publish outbox event", "error", err, "eventId", event.Id)
			continue
		}

		_, err = tx.Exec(`UPDATE outbox SET published = TRUE WHERE id = ?`, event.Id)
		if err != nil {
			logger.Log.Error("Failed to mark outbox event as published", "error", err, "eventId", event.Id)
			continue
		}
		
		logger.Log.Info("Outbox event published", "eventId", event.Id, "eventType", event.EventType)
	}

	if err := tx.Commit(); err != nil {
		logger.Log.Error("Failed to commit outbox transaction", "error", err)
	}
}

func (w *OutboxPublisher) Stop() {
	logger.Log.Info("Outbox publisher stopped")
}

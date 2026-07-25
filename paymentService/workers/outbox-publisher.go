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
	EventId   string
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


// payment doesnt have cron job to stale the already created razerpay order , 
//current flow -> after window of 15min booking hold, user makes payment -> if confirm -> payment success -> immediate refund ( user confused but integrity ensured)
//fix -> payment cron job to stale the razerpay order after 15min window of booking hold, if user makes payment after 15min window -> payment failed ( user informed about stale order)

func (w *OutboxPublisher) processPendingEvents() {
	tx, err := w.db.Begin()
	if err != nil {
		logger.Log.Error("Failed to begin outbox transaction", "error", err)
		return
	}

	rows, err := tx.Query(`SELECT id, COALESCE(event_id, ''), event_type, payload FROM outbox WHERE published = FALSE ORDER BY id ASC LIMIT 50 FOR UPDATE SKIP LOCKED`)
	if err != nil {
		logger.Log.Error("Failed to query outbox", "error", err)
		tx.Rollback()
		return
	}

	var events []OutboxEvent
	for rows.Next() {
		var e OutboxEvent
		if err := rows.Scan(&e.Id, &e.EventId, &e.EventType, &e.Payload); err != nil {
			logger.Log.Error("Failed to scan outbox row", "error", err)
			continue
		}
		events = append(events, e)
	}
	if err := rows.Err(); err != nil {
		logger.Log.Error("Failed to iterate outbox rows", "error", err)
		rows.Close()
		tx.Rollback()
		return
	}
	rows.Close()
	tx.Commit() // release locks immediately

	if len(events) == 0 {
		return
	}

	ch := rabbitmq.Channel
	exchangeName := "payment_events_exchange"

	err = ch.ExchangeDeclare(exchangeName, "fanout", true, false, false, false, nil)
	if err != nil {
		logger.Log.Error("Failed to declare outbox exchange", "error", err)
		return
	}

	var publishedIDs []int64
	for _, event := range events {
		body := map[string]interface{}{
			"eventId":   event.EventId,
			"eventType": event.EventType,
			"payload":   json.RawMessage(event.Payload),
		}
		bodyBytes, err := json.Marshal(body)
		if err != nil {
			logger.Log.Error("Failed to marshal outbox event body", "error", err, "eventId", event.Id)
			continue
		}

		err = ch.Publish(exchangeName, "", false, false, amqp.Publishing{
			ContentType: "application/json",
			Body:        bodyBytes,
		})
		if err != nil {
			logger.Log.Error("Failed to publish outbox event", "error", err, "eventId", event.Id)
			continue
		}

		publishedIDs = append(publishedIDs, event.Id)
		logger.Log.Info("Outbox event published", "eventId", event.Id, "eventType", event.EventType)
	}

	if len(publishedIDs) > 0 {
		updateTx, err := w.db.Begin()
		if err != nil {
			logger.Log.Error("Failed to begin update transaction", "error", err)
			return
		}
		for _, id := range publishedIDs {
			_, err := updateTx.Exec(`UPDATE outbox SET published = TRUE WHERE id = ?`, id)
			if err != nil {
				logger.Log.Error("Failed to mark outbox event as published", "error", err, "eventId", id)
			}
		}
		if err := updateTx.Commit(); err != nil {
			logger.Log.Error("Failed to commit update transaction", "error", err)
		}
	}
}

func (w *OutboxPublisher) Stop() {
	logger.Log.Info("Outbox publisher stopped")
}

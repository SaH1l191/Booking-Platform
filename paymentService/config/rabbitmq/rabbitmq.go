package rabbitmq

import (
	"fmt"
	"goPayment/config/env"
	"goPayment/pkg/logger"

	amqp "github.com/rabbitmq/amqp091-go"
)

var Conn *amqp.Connection
var Channel *amqp.Channel

func Connect() error {
	url := env.GetEnv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672")

	var err error
	Conn, err = amqp.Dial(url)
	if err != nil {
		return fmt.Errorf("failed to connect to RabbitMQ: %w", err)
	}

	Channel, err = Conn.Channel()
	if err != nil {
		return fmt.Errorf("failed to open RabbitMQ channel: %w", err)
	}

	logger.Log.Info("RabbitMQ connection established", "url", url)
	return nil
}

func Close() {
	if Channel != nil {
		Channel.Close()
	}
	if Conn != nil {
		Conn.Close()
	}
}

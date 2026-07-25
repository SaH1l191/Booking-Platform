module goPayment

go 1.26.1

require (
	github.com/go-chi/chi v1.5.5
	github.com/go-ozzo/ozzo-validation/v4 v4.3.0
	github.com/go-sql-driver/mysql v1.10.0
	github.com/joho/godotenv v1.5.1
	github.com/prometheus/client_golang v1.23.2
	github.com/rabbitmq/amqp091-go v1.11.0
	github.com/razorpay/razorpay-go v1.4.1
)

require (
	filippo.io/edwards25519 v1.2.0 // indirect
	github.com/beorn7/perks v1.0.1 // indirect
	github.com/cespare/xxhash/v2 v2.3.0 // indirect
	github.com/google/uuid v1.6.0 // indirect
	github.com/kr/text v0.2.0 // indirect
	github.com/munnerz/goautoneg v0.0.0-20191010083416-a7dc8b61c822 // indirect
	github.com/prometheus/client_model v0.6.2 // indirect
	github.com/prometheus/common v0.66.1 // indirect
	github.com/prometheus/procfs v0.16.1 // indirect
	go.yaml.in/yaml/v2 v2.4.2 // indirect
	golang.org/x/sys v0.35.0 // indirect
	google.golang.org/protobuf v1.36.8 // indirect
)

replace go.yaml.in/yaml/v2 v2.4.2 => gopkg.in/yaml.v2 v2.4.0

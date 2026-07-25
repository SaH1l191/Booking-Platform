package app

import (
	"context"
	"database/sql"
	"fmt"
	config "goPayment/config/db"
	"goPayment/config/env"
	"goPayment/controllers"
	"goPayment/db/repositories"
	"goPayment/pkg/logger"
	rabbitmqconfig "goPayment/config/rabbitmq"
	"goPayment/router"
	"goPayment/services"
	"goPayment/workers"
	"net/http"
	"time"
)

type App struct {
	Context  context.Context
	database *sql.DB
	server   *http.Server

	// repositories
	PaymentRepo *repositories.PaymentRepository

	// services
	PaymentService services.PaymentService

	// controllers
	PaymentController *controllers.PaymentController

	// workers
	bookingConsumer *workers.BookingConsumer
	outboxPublisher *workers.OutboxPublisher
}

func New(ctx context.Context) (*App, error) {
	return &App{
		Context: ctx,
	}, nil
}

func (a *App) Start(ctx context.Context) error {
	logger.Log.Info("Starting application")

	err := env.Load()
	if err != nil {
		logger.Log.Error("Failed to load environment variables", "error", err)
		return fmt.Errorf("failed to load environment variables: %w", err)
	}

	logger.Log.Info("Connecting to database")
	db, err := config.SetupDB()
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}
	a.database = db
	logger.Log.Info("Database connection established")

	logger.Log.Info("Connecting to RabbitMQ")
	if err := rabbitmqconfig.Connect(); err != nil {
		return fmt.Errorf("failed to connect to RabbitMQ: %w", err)
	}

	// Repositories
	logger.Log.Info("Initializing repositories")
	a.PaymentRepo = repositories.NewPaymentRepository(db)
	logger.Log.Info("Repositories initialized")

	// Services
	logger.Log.Info("Initializing services")
	a.PaymentService = services.NewPaymentService(a.PaymentRepo)
	logger.Log.Info("Services initialized")

	// Controllers
	logger.Log.Info("Initializing controllers")
	a.PaymentController = controllers.NewPaymentController(a.PaymentService)
	logger.Log.Info("Controllers initialized")

	// Start booking event consumer
	a.bookingConsumer = workers.NewBookingConsumer(a.PaymentService, db)
	if err := a.bookingConsumer.Start(); err != nil {
		return fmt.Errorf("failed to start booking consumer: %w", err)
	}

	// Start outbox publisher
	a.outboxPublisher = workers.NewOutboxPublisher(db)
	a.outboxPublisher.Start()

	// Router
	paymentRouter := router.NewPaymentRouter(a.PaymentController)
	chiRouter := router.SetupRouter(paymentRouter)

	port := env.GetEnv("PORT")
	addr := ":" + port

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		r.Body = http.MaxBytesReader(w, r.Body, 10<<20)
		chiRouter.ServeHTTP(w, r)
	})

	a.server = &http.Server{
		Addr:              addr,
		Handler:           handler,
		ReadTimeout:       5 * time.Second,
		ReadHeaderTimeout: 10 * time.Second,
		WriteTimeout:      10 * time.Second,
	}

	logger.Log.Info("Payment service started successfully", "addr", addr)

	go func() {
		if err := a.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Log.Error("Server error", "error", err)
		}
	}()

	return nil
}

func (a *App) Stop(ctx context.Context) error {
	logger.Log.Info("Application shutdown initiated")

	if a.server != nil {
		shutdownCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
		defer cancel()
		if err := a.server.Shutdown(shutdownCtx); err != nil {
			logger.Log.Error("Failed to shutdown server", "error", err)
		}
	}

	if a.database != nil {
		logger.Log.Info("Closing database connection")
		if err := a.database.Close(); err != nil {
			logger.Log.Error("Failed to close database connection", "error", err)
			return err
		}
		logger.Log.Info("Database connection closed")
	}

	rabbitmqconfig.Close()
	logger.Log.Info("Payment service shutdown complete")
	return nil
}

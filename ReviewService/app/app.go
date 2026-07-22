package app

import (
	"ReviewService/config/db"
	"ReviewService/config/env"
	"ReviewService/controllers"
	rr "ReviewService/db/repositories"
	"ReviewService/pkg/logger"
	"ReviewService/router"
	"ReviewService/services"
	"ReviewService/workers"
	"context"
	"database/sql"
	"fmt"
	"net/http" 
	"time" 
)

type Application struct {
	Context  context.Context
	database *sql.DB
	server   *http.Server
}

func NewApplication(ctx context.Context) (*Application, error) {
	return &Application{
		Context: ctx,
	}, nil
}

func (app *Application) Start() error {
	logger.Log.Info("Starting Review Service")

	if err := env.Load(); err != nil {
		logger.Log.Error("Failed to load environment variables", "error", err)
		return fmt.Errorf("error loading environment variables: %w", err)
	}

	logger.Log.Info("Connecting to database")
	db, err := db.SetupDB()
	if err != nil {
		return fmt.Errorf("error connecting to database: %w", err)
	}
	app.database = db
	logger.Log.Info("Database connection established")

	repo := rr.NewReviewRepository(app.database)
	reviewService := services.NewReviewService(repo)
	reviewController := controllers.NewReviewController(reviewService)
 
	reviewRouter := router.NewReviewRouter(reviewController)

	r := router.SetupRouter(reviewRouter)

	// Start booking event consumer for review eligibility
	bookingConsumer := workers.NewBookingConsumer(app.database)
	if err := bookingConsumer.Start(); err != nil {
		logger.Log.Error("Failed to start booking consumer", "error", err)
	}

	app.server = &http.Server{
		Addr:         ":" + env.GetEnv("PORT", "3004"),
		Handler:      r,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	logger.Log.Info("Review service started successfully", "addr", app.server.Addr)

	go func() {
		if err := app.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Log.Error("Server error", "error", err)
		}
	}()

	return nil
}

func (app *Application) Stop(ctx context.Context) error {
	logger.Log.Info("Stopping Review Service")

	if app.server != nil {
		shutdownCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
		defer cancel()
		if err := app.server.Shutdown(shutdownCtx); err != nil {
			logger.Log.Error("Failed to shutdown HTTP server", "error", err)
		}
	}

	logger.Log.Info("Review service shutdown complete")
	return nil

}

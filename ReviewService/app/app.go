package app

import (
	"ReviewService/config/db"
	"ReviewService/config/env"
	"ReviewService/pkg/logger"
	// "ReviewService/router"
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
	logger.Logger.Info("Starting Review Service")

	if err := env.Load(); err != nil {
		logger.Logger.Error("Failed to load environment variables", "error", err)
		return fmt.Errorf("error loading environment variables: %w", err)
	}

	logger.Logger.Info("Connecting to database")
	db, err := db.SetupDB()
	if err != nil {
		return fmt.Errorf("error connecting to database: %w", err)
	}
	app.database = db
	logger.Logger.Info("Database connection established")

	// r := router.NewRouter()

	app.server = &http.Server{
		Addr:    ":"+env.GetEnv("PORT", "3004"),
		Handler: nil,
		ReadTimeout: 5 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout: 120 * time.Second,
	}



	return nil
}

func (app *Application) Stop(ctx context.Context) error {
	logger.Logger.Info("Stopping Review Service")

	if app.server != nil {
		shutdownCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
		defer cancel()
		if err := app.server.Shutdown(shutdownCtx); err != nil {
			logger.Logger.Error("Failed to shutdown HTTP server", "error", err)
		}
	}

	logger.Logger.Info("Review service shutdown complete")
	return nil

}

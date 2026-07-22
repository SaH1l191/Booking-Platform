package main

import (
	"context"
	"goAuth/app"
	"goAuth/pkg/logger"
	"os"
	"os/signal"
	"syscall"
)

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	logger.Init("AuthService", getEnv("LOG_PATH", "../logs")+"/auth-service.log")
	application, err := app.New(ctx)
	if err != nil {
		logger.Log.Error("Failed to initialize application", "error", err)
		os.Exit(1)
	}

	err = application.Start(ctx)
	if err != nil {
		logger.Log.Error("Failed to start application", "error", err)
		os.Exit(1)
	}

	<-ctx.Done()

	err = application.Stop(context.Background())
	if err != nil {
		logger.Log.Error("Failed to stop application", "error", err)
		os.Exit(1)
	}
}

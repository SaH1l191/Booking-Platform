package main

import (
	"ReviewService/app"
	"ReviewService/pkg/logger"
	"context"
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
	logger.Init("ReviewService", getEnv("LOG_PATH", "../logs")+"/review-service.log")
	application, err := app.NewApplication(ctx)
	if err != nil {
		logger.Log.Error("Failed to start Review Service", "error", err)
		os.Exit(1)
	}

	err = application.Start()
	if err != nil {
		logger.Log.Error("Failed to start Review Service", "error", err)
		os.Exit(1)
	}

	<-ctx.Done()

	err = application.Stop(context.Background())
	if err != nil {
		logger.Log.Error("Failed to stop Review Service", "error", err)
		os.Exit(1)
	}
}

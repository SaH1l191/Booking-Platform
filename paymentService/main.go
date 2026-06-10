package main

import (
	"context"
	"goPayment/app"
	"goPayment/pkg/logger"
	"os"
	"os/signal"
	"syscall"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	logger.Init("PaymentService", "C:/Users/aspha/OneDrive/Desktop/Booking-Platform-Complete/Booking-Platform/logs/payment-service.log")
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

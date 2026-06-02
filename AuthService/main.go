package main

import (
	"context"
	"goAuth/app"
	"goAuth/pkg/logger"
	"os"
	"os/signal"
	"syscall"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	application, err := app.New(ctx)
	if err != nil {
		logger.Logger.Error("Failed to initialize application", "error", err)
		os.Exit(1)
	}

	err = application.Start(ctx)
	if err != nil {
		logger.Logger.Error("Failed to start application", "error", err)
		os.Exit(1)
	}

	<-ctx.Done()

	err = application.Stop(context.Background())
	if err != nil {
		logger.Logger.Error("Failed to stop application", "error", err)
		os.Exit(1)
	}
}

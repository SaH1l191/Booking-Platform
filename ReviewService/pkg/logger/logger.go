package logger

import (
	"log/slog"
	"os"
)

var Log *slog.Logger

func Init(serviceName string) {
	Log = slog.New(
		slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
			Level: slog.LevelInfo,
		}),
	).With(
		slog.String("service", serviceName),
	)
}

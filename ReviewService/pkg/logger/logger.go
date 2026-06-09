package logger

import (
	"io"
	"log/slog"
	"os"
	"time"
)

var Log *slog.Logger

func Init(serviceName string, logFilePath string) {
	file, err := os.OpenFile(logFilePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		panic("failed to open log file: " + err.Error())
	}

	multiWriter := io.MultiWriter(os.Stdout, file)

	Log = slog.New(
		slog.NewJSONHandler(multiWriter, &slog.HandlerOptions{
			Level: slog.LevelInfo,
			ReplaceAttr: func(groups []string, a slog.Attr) slog.Attr {
				if a.Key == slog.TimeKey {
					if t, ok := a.Value.Any().(time.Time); ok {
						a.Value = slog.StringValue(t.Format("2006-01-02 15:04:05"))
					}
				}
				return a
			},
		}),
	).With(
		slog.String("service", serviceName),
	)
}

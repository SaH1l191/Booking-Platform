package logger

import (
	"context"
	"fmt"
	"log/slog"
)

type PrettyHandler struct {
	level slog.Leveler
}

func NewPrettyHandler() slog.Handler {
	return &PrettyHandler{
		level: slog.LevelInfo,
	}
}

func (h *PrettyHandler) Enabled(ctx context.Context, level slog.Level) bool {
	return level >= h.level.Level()
}

func (h *PrettyHandler) Handle(ctx context.Context, r slog.Record) error {
	ts := r.Time.Format("2006-01-02 15:04:05")
	level := r.Level.String()

	fmt.Printf("%s [%s]: %s", ts, level, r.Message)

	r.Attrs(func(a slog.Attr) bool {
		fmt.Printf(" %s=%v", a.Key, a.Value.Any())
		return true
	})

	fmt.Println()
	return nil
}

func (h *PrettyHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	return h
}

func (h *PrettyHandler) WithGroup(name string) slog.Handler {
	return h
}

var Logger = slog.New(NewPrettyHandler())

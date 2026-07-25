package config

import (
	"database/sql"
	"goPayment/config/env"
	"goPayment/pkg/logger"
	"time"

	"github.com/go-sql-driver/mysql"
)

func SetupDB() (*sql.DB, error) {
	cfg := mysql.NewConfig()

	cfg.User = env.GetEnv("DB_USER")
	cfg.Passwd = env.GetEnv("DB_PASSWORD")
	cfg.Net = env.GetEnv("DB_NET")
	cfg.Addr = env.GetEnv("DB_ADDR")
	cfg.DBName = env.GetEnv("DB_NAME")
	cfg.ParseTime = true

	logger.Log.Info("Connecting to database", "host", cfg.Addr, "dbName", cfg.DBName)

	db, err := sql.Open("mysql", cfg.FormatDSN())
	if err != nil {
		logger.Log.Error("Failed to open database", "error", err)
		return nil, err
	}

	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(30 * time.Minute)
	db.SetConnMaxIdleTime(10 * time.Minute)

	if err := db.Ping(); err != nil {
		logger.Log.Error("Failed to ping database", "error", err)
		return nil, err
	}
	logger.Log.Info("Database connected successfully")
	return db, nil
}

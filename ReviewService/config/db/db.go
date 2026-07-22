package db

import (
	"ReviewService/config/env"
	"ReviewService/pkg/logger"
	"database/sql"
	"fmt"
	"time"
	"github.com/go-sql-driver/mysql"
)

func SetupDB() (*sql.DB, error) {   
	cfg := mysql.NewConfig()

	cfg.User = env.GetEnv("DB_USER", "root")
	cfg.Passwd = env.GetEnv("DB_PASSWORD", "root")
	cfg.Net = env.GetEnv("DB_NET", "tcp")
	cfg.Addr = env.GetEnv("DB_ADDR", "127.0.0.1:3306")
	cfg.DBName = env.GetEnv("DB_NAME", "review_service")

	logger.Log.Info("Connecting to database", "host", cfg.Addr, "dbName", cfg.DBName)

	db, err := sql.Open("mysql", cfg.FormatDSN())
	if err != nil {
		logger.Log.Error("Failed to connect to database", "error", err)
		panic(fmt.Sprintf("Error connecting to database: %v", err))
	}

	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(30 * time.Minute)
	db.SetConnMaxIdleTime(10 * time.Minute)

	if err := db.Ping(); err != nil {
		logger.Log.Error("Failed to ping database", "error", err)
		panic(fmt.Sprintf("Error pinging database: %v", err))
	}
	logger.Log.Info("Successfully connected to database")
	return db, nil
}

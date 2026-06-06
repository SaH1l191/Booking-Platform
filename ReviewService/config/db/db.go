package db

import (
	"ReviewService/config/env"
	"ReviewService/pkg/logger"
	"database/sql"
	"fmt"
	"github.com/go-sql-driver/mysql"
)

func SetupDB() (*sql.DB, error) {
	cfg := mysql.Config{
		User:   env.GetEnv("DB_USER", "root"),
		Passwd: env.GetEnv("DB_PASSWORD", "root"),
		Net:    "tcp",
		Addr:   env.GetEnv("DB_ADDR", "127.0.0.1:3306"),
		DBName: env.GetEnv("DB_NAME", "review_service"),
	}

	db, err := sql.Open("mysql", cfg.FormatDSN())
	if err != nil {
		logger.Logger.Error("Failed to connect to database", "error", err)
		panic(fmt.Sprintf("Error connecting to database: %v", err))
	}
	if err := db.Ping(); err != nil {
		logger.Logger.Error("Failed to ping database", "error", err)
		panic(fmt.Sprintf("Error pinging database: %v", err))
	}
	logger.Logger.Info("Successfully connected to database")
	return db, nil
}

package config

import (
	"database/sql"
	"goAuth/config/env"
	"goAuth/pkg/logger"

	"github.com/go-sql-driver/mysql"
)

func SetupDB() (*sql.DB, error) {
	cfg := mysql.NewConfig()

	cfg.User = env.GetEnv("DB_USER", "root")
	cfg.Passwd = env.GetEnv("DB_PASSWORD", "root")
	cfg.Net = env.GetEnv("DB_NET", "tcp")
	cfg.Addr = env.GetEnv("DB_ADDR", "127.0.0.1:3306")
	cfg.DBName = env.GetEnv("DB_NAME", "auth_db")

	logger.Log.Info("Connecting to database", "host", cfg.Addr, "dbName", cfg.DBName)

	db, err := sql.Open("mysql", cfg.FormatDSN())
	if err != nil {
		logger.Log.Error("Failed to open database", "error", err)
		return nil, err
	}

	if err := db.Ping(); err != nil {
		logger.Log.Error("Failed to ping database", "error", err)
		return nil, err
	}
	logger.Log.Info("Database connected successfully")
	return db, nil
}

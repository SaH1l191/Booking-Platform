package config

import (
	"database/sql"
	"fmt"
	"goPayment/config/env"
	"goPayment/pkg/logger"
	"time"

	"github.com/go-sql-driver/mysql"
)

func SetupDB() (*sql.DB, error) {
	dbName := env.GetEnv("DB_NAME")

	// Try connecting with the target database first
	db, err := connectToDB(dbName)
	if err == nil {
		return db, nil
	}

	// Database might not exist — connect without database and create it
	logger.Log.Info("Database not found, attempting to create", "dbName", dbName)
	rootDB, err := connectToDB("")
	if err != nil {
		return nil, fmt.Errorf("failed to connect to MySQL without database: %w", err)
	}

	_, err = rootDB.Exec(fmt.Sprintf("CREATE DATABASE IF NOT EXISTS `%s`", dbName))
	if err != nil {
		rootDB.Close()
		return nil, fmt.Errorf("failed to create database %s: %w", dbName, err)
	}
	rootDB.Close()

	logger.Log.Info("Database created successfully", "dbName", dbName)

	// Now connect to the newly created database
	return connectToDB(dbName)
}

func connectToDB(dbName string) (*sql.DB, error) {
	cfg := mysql.NewConfig()

	cfg.User = env.GetEnv("DB_USER")
	cfg.Passwd = env.GetEnv("DB_PASSWORD")
	cfg.Net = env.GetEnv("DB_NET")
	cfg.Addr = env.GetEnv("DB_ADDR")
	cfg.DBName = dbName
	cfg.ParseTime = true

	dsn := cfg.FormatDSN()
	if dbName == "" {
		// Connect without database name for root operations
		dsn = fmt.Sprintf("%s:%s@%s(%s)/", cfg.User, cfg.Passwd, cfg.Net, cfg.Addr)
	}

	logger.Log.Info("Connecting to database", "host", cfg.Addr, "dbName", dbName)

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, err
	}

	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(30 * time.Minute)
	db.SetConnMaxIdleTime(10 * time.Minute)

	if err := db.Ping(); err != nil {
		db.Close()
		return nil, err
	}

	if dbName != "" {
		logger.Log.Info("Database connected successfully")
	}
	return db, nil
}

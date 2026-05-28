package config

import (
	"database/sql"
	"fmt"
	"goAuth/config/env"
	
	"github.com/go-sql-driver/mysql"
)

func SetupDB() (*sql.DB, error) {
	cfg := mysql.NewConfig()

	cfg.User = env.GetEnv("DB_USER", "root")
	cfg.Passwd = env.GetEnv("DB_PASSWORD", "root")
	cfg.Net = env.GetEnv("DB_NET", "tcp")
	cfg.Addr = env.GetEnv("DB_ADDR", "127.0.0.1:3306")
	cfg.DBName = env.GetEnv("DB_NAME", "auth_db")

	fmt.Printf("Connecting to database with config: %+v\n", cfg)

	db, err := sql.Open("mysql", cfg.FormatDSN())
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, err
	}
	fmt.Println("Database connected! ")
	return db, nil
}

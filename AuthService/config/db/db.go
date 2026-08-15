package config

import (
	"database/sql"
	"fmt"
	"goAuth/config/env"
	"goAuth/pkg/logger"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/go-sql-driver/mysql"
)

func SetupDB() (*sql.DB, error) {
	dbName := env.GetEnv("DB_NAME")

	db, err := connectToDB(dbName)
	if err == nil {
		return db, nil
	}

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
	return connectToDB(dbName)
}

func RunMigrations(db *sql.DB) error {
	_, currentFile, _, _ := runtime.Caller(0)
	migrationsDir := filepath.Join(filepath.Dir(currentFile), "..", "db", "migrations")

	glob := filepath.Join(migrationsDir, "*.sql")
	files, err := filepath.Glob(glob)
	if err != nil {
		return fmt.Errorf("failed to list migration files: %w", err)
	}

	for _, file := range files {
		content, err := os.ReadFile(file)
		if err != nil {
			return fmt.Errorf("failed to read migration file %s: %w", file, err)
		}
		sqlContent := strings.TrimSpace(string(content))
		if sqlContent == "" {
			continue
		}

		sqlContent = stripGooseDirectives(sqlContent)
		if sqlContent == "" {
			continue
		}

		if _, err := db.Exec(sqlContent); err != nil {
			logger.Log.Warn("Migration query warning (may already be applied)", "file", filepath.Base(file), "error", err)
		} else {
			logger.Log.Info("Migration applied", "file", filepath.Base(file))
		}
	}
	return nil
}

func RunSeeds(db *sql.DB) error {
	_, currentFile, _, _ := runtime.Caller(0)
	seedsDir := filepath.Join(filepath.Dir(currentFile), "..", "db", "seeds")

	if _, err := os.Stat(seedsDir); os.IsNotExist(err) {
		logger.Log.Info("No seeds directory found, skipping seeds")
		return nil
	}

	glob := filepath.Join(seedsDir, "*.sql")
	files, err := filepath.Glob(glob)
	if err != nil {
		return fmt.Errorf("failed to list seed files: %w", err)
	}

	if len(files) == 0 {
		logger.Log.Info("No seed files found")
		return nil
	}

	for _, file := range files {
		content, err := os.ReadFile(file)
		if err != nil {
			return fmt.Errorf("failed to read seed file %s: %w", file, err)
		}
		sqlContent := strings.TrimSpace(string(content))
		if sqlContent == "" {
			continue
		}

		sqlContent = stripGooseDirectives(sqlContent)
		if sqlContent == "" {
			continue
		}

		if _, err := db.Exec(sqlContent); err != nil {
			logger.Log.Warn("Seed query warning (may already be applied)", "file", filepath.Base(file), "error", err)
		} else {
			logger.Log.Info("Seed applied", "file", filepath.Base(file))
		}
	}
	return nil
}

func stripGooseDirectives(sql string) string {
	lines := strings.Split(sql, "\n")
	var result []string
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "-- +goose Down") {
			break
		}
		if strings.HasPrefix(trimmed, "-- +goose") {
			continue
		}
		result = append(result, line)
	}
	return strings.TrimSpace(strings.Join(result, "\n"))
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

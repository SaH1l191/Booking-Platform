package connections

import (
	"context"
	"database/sql"
	"fmt"
	"goAuth/config/env"
	"time"
)

func NewDatabasePool(ctx context.Context) (*sql.DB, error) {

	dsn := fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=disable",
		env.GetEnv("DB_USER", "root"),
		env.GetEnv("DB_PASSWORD", "password"),
		env.GetEnv("DB_HOST", "mysql"),
		env.GetEnv("DB_PORT", "3306"),
		env.GetEnv("DB_NAME", "auth_db"),
	)

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, err
	}

	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(30 * time.Minute)
	db.SetConnMaxIdleTime(10 * time.Minute)

	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := db.PingContext(pingCtx); err != nil {
		db.Close()
		return nil, err
	}
	return db, nil
}

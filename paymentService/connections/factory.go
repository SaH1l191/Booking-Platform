package connections

import (
	"context"
	"database/sql"
	"fmt"
	"goPayment/config/env"
	"time"
)

func NewDatabasePool(ctx context.Context) (*sql.DB, error) {
	dsn := fmt.Sprintf(
		"%s:%s@%s(%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		env.GetEnv("DB_USER", "root"),
		env.GetEnv("DB_PASSWORD", "root"),
		env.GetEnv("DB_NET", "tcp"),
		env.GetEnv("DB_ADDR", "127.0.0.1:3306"),
		env.GetEnv("DB_NAME", "payment_db"),
	)

	db, err := sql.Open("mysql", dsn)
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

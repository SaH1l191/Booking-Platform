package env

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

func Load() error {
	err := godotenv.Load()
	if err != nil {
		return fmt.Errorf("error loading .env file: %w", err)
	}
	return nil
}

func GetEnv(key string ) string {
	value := os.Getenv(key)
	return value
}
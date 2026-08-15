package app

import (
	"context"
	"database/sql"
	"fmt"
	config "goPayment/config/db"
	"goPayment/config/env"
	"goPayment/controllers"
	"goPayment/db/repositories"
	"goPayment/pkg/logger"
	rabbitmqconfig "goPayment/config/rabbitmq"
	"goPayment/router"
	"goPayment/services"
	"goPayment/workers"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

type App struct {
	Context  context.Context
	database *sql.DB
	server   *http.Server

	// repositories
	PaymentRepo *repositories.PaymentRepository

	// services
	PaymentService services.PaymentService

	// controllers
	PaymentController *controllers.PaymentController

	// workers
	bookingConsumer *workers.BookingConsumer
	outboxPublisher *workers.OutboxPublisher
}

func New(ctx context.Context) (*App, error) {
	return &App{
		Context: ctx,
	}, nil
}

func (a *App) Start(ctx context.Context) error {
	logger.Log.Info("Starting application")

	err := env.Load()
	if err != nil {
		logger.Log.Error("Failed to load environment variables", "error", err)
		return fmt.Errorf("failed to load environment variables: %w", err)
	}

	logger.Log.Info("Connecting to database")
	db, err := config.SetupDB()
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}
	a.database = db
	logger.Log.Info("Database connection established")

	// Run database migrations before starting services
	logger.Log.Info("Running database migrations")
	if err := runMigrations(db); err != nil {
		logger.Log.Error("Failed to run database migrations", "error", err)
		return fmt.Errorf("failed to run database migrations: %w", err)
	}
	logger.Log.Info("Database migrations completed")

	// Run database seeds
	logger.Log.Info("Running database seeds")
	if err := runSeeds(db); err != nil {
		logger.Log.Error("Failed to run database seeds", "error", err)
		return fmt.Errorf("failed to run database seeds: %w", err)
	}
	logger.Log.Info("Database seeds completed")

	logger.Log.Info("Connecting to RabbitMQ")
	if err := rabbitmqconfig.Connect(); err != nil {
		return fmt.Errorf("failed to connect to RabbitMQ: %w", err)
	}

	// Repositories
	logger.Log.Info("Initializing repositories")
	a.PaymentRepo = repositories.NewPaymentRepository(db)
	logger.Log.Info("Repositories initialized")

	// Services
	logger.Log.Info("Initializing services")
	a.PaymentService = services.NewPaymentService(a.PaymentRepo)
	logger.Log.Info("Services initialized")

	// Controllers
	logger.Log.Info("Initializing controllers")
	a.PaymentController = controllers.NewPaymentController(a.PaymentService)
	logger.Log.Info("Controllers initialized")

	// Start booking event consumer
	a.bookingConsumer = workers.NewBookingConsumer(a.PaymentService, db)
	if err := a.bookingConsumer.Start(); err != nil {
		return fmt.Errorf("failed to start booking consumer: %w", err)
	}

	// Start outbox publisher
	a.outboxPublisher = workers.NewOutboxPublisher(db)
	a.outboxPublisher.Start()

	reconciliationWorker := workers.NewReconciliationWorker(a.PaymentService)
	reconciliationWorker.Start()


	// Router
	paymentRouter := router.NewPaymentRouter(a.PaymentController)
	chiRouter := router.SetupRouter(paymentRouter)

	port := env.GetEnv("PORT")
	addr := ":" + port

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		r.Body = http.MaxBytesReader(w, r.Body, 10<<20)
		chiRouter.ServeHTTP(w, r)
	})

	a.server = &http.Server{
		Addr:              addr,
		Handler:           handler,
		ReadTimeout:       5 * time.Second,
		ReadHeaderTimeout: 10 * time.Second,
		WriteTimeout:      10 * time.Second,
	}

	logger.Log.Info("Payment service started successfully", "addr", addr)

	go func() {
		if err := a.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Log.Error("Server error", "error", err)
		}
	}()

	return nil
}

func (a *App) Stop(ctx context.Context) error {
	logger.Log.Info("Application shutdown initiated")

	if a.server != nil {
		shutdownCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
		defer cancel()
		if err := a.server.Shutdown(shutdownCtx); err != nil {
			logger.Log.Error("Failed to shutdown server", "error", err)
		}
	}

	if a.database != nil {
		logger.Log.Info("Closing database connection")
		if err := a.database.Close(); err != nil {
			logger.Log.Error("Failed to close database connection", "error", err)
			return err
		}
		logger.Log.Info("Database connection closed")
	}

	rabbitmqconfig.Close()
	logger.Log.Info("Payment service shutdown complete")
	return nil
}

func runMigrations(db *sql.DB) error {
	_, currentFile, _, _ := runtime.Caller(0)
	migrationsDir := filepath.Join(filepath.Dir(currentFile), "..", "db", "migrations")

	dbUser := env.GetEnv("DB_USER")
	dbPass := env.GetEnv("DB_PASSWORD")
	dbAddr := env.GetEnv("DB_ADDR")
	dbName := env.GetEnv("DB_NAME")

	dsn := fmt.Sprintf("%s:%s@tcp(%s)/%s", dbUser, dbPass, dbAddr, dbName)

	cmd := exec.Command("goose", "-dir", migrationsDir, "mysql", dsn, "up")
	output, err := cmd.CombinedOutput()
	if err != nil {
		logger.Log.Warn("goose command failed, falling back to direct SQL execution", "error", err, "output", string(output))
		return runMigrationsDirect(db, migrationsDir)
	}
	logger.Log.Info("Goose migrations completed", "output", strings.TrimSpace(string(output)))
	return nil
}

func runMigrationsDirect(db *sql.DB, migrationsDir string) error {
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

		statements := splitStatements(sqlContent)
		applied := 0
		for _, stmt := range statements {
			stmt = strings.TrimSpace(stmt)
			if stmt == "" {
				continue
			}
			if _, err := db.Exec(stmt); err != nil {
				logger.Log.Warn("Migration statement warning (may already be applied)", "file", filepath.Base(file), "error", err)
			} else {
				applied++
			}
		}
		if applied > 0 {
			logger.Log.Info("Migration applied", "file", filepath.Base(file), "statements", applied)
		}
	}
	return nil
}

func splitStatements(sql string) []string {
	var statements []string
	var current strings.Builder
	lines := strings.Split(sql, "\n")
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == ";" {
			statements = append(statements, current.String())
			current.Reset()
			continue
		}
		if strings.HasSuffix(trimmed, ";") {
			current.WriteString(line)
			statements = append(statements, current.String())
			current.Reset()
			continue
		}
		current.WriteString(line)
		current.WriteString("\n")
	}
	if s := strings.TrimSpace(current.String()); s != "" {
		statements = append(statements, s)
	}
	return statements
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

func runSeeds(db *sql.DB) error {
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

		statements := splitStatements(sqlContent)
		for _, stmt := range statements {
			stmt = strings.TrimSpace(stmt)
			if stmt == "" {
				continue
			}
			if _, err := db.Exec(stmt); err != nil {
				logger.Log.Warn("Seed statement warning (may already be applied)", "file", filepath.Base(file), "error", err)
			}
		}
		logger.Log.Info("Seed applied", "file", filepath.Base(file))
	}
	return nil
}

package app

import (
	"context"
	"database/sql"
	"fmt"
	config "goAuth/config/db"
	"goAuth/config/env"
	"goAuth/controllers"
	repo "goAuth/db/repositories"
	"goAuth/pkg/logger"
	"goAuth/router"
	"goAuth/services"
	"net/http"  
	"time"
)

type App struct {
	Context  context.Context
	database *sql.DB
	server   *http.Server

	// repositories
	UserRepo           repo.UserRepository
	RoleRepo           repo.RoleRepository
	RolePermissionRepo repo.RolePermissionRepository
	UserRoleRepo       repo.UserRoleRepository

	// services
	UserService services.UserService
	RoleService services.RoleService

	// controllers
	UserController *controllers.UserController
	RoleController *controllers.RoleController
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

	// Database
	logger.Log.Info("Connecting to database")
	db, err := config.SetupDB()
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}
	a.database = db
	logger.Log.Info("Database connection established")

	// Run migrations
	logger.Log.Info("Running database migrations")
	if err := config.RunMigrations(db); err != nil {
		logger.Log.Error("Failed to run database migrations", "error", err)
		return fmt.Errorf("failed to run database migrations: %w", err)
	}
	logger.Log.Info("Database migrations completed")

	// Run seeds
	logger.Log.Info("Running database seeds")
	if err := config.RunSeeds(db); err != nil {
		logger.Log.Error("Failed to run database seeds", "error", err)
		return fmt.Errorf("failed to run database seeds: %w", err)
	}
	logger.Log.Info("Database seeds completed")

	// Repositories
	logger.Log.Info("Initializing repositories")
	a.UserRepo = repo.NewUserRepository(db)
	a.RoleRepo = repo.NewRoleRepository(db)
	a.RolePermissionRepo = repo.NewRolePermissionRepository(db)
	a.UserRoleRepo = repo.NewUserRoleRepository(db)
	logger.Log.Info("Repositories initialized")

	// Services
	logger.Log.Info("Initializing services")
	a.UserService = services.NewUserServiceImpl(a.UserRepo)
	a.RoleService = services.NewRoleService(a.RoleRepo, a.RolePermissionRepo, a.UserRoleRepo)
	logger.Log.Info("Services initialized")

	// Controllers
	logger.Log.Info("Initializing controllers")
	a.UserController = controllers.NewUserController(a.UserService)
	a.RoleController = controllers.NewRoleController(a.RoleService)
	logger.Log.Info("Controllers initialized")

	// Router
	userRouter := router.NewUserRouter(a.UserController)
	roleRouter := router.NewRoleRouter(a.RoleController)

	chiRouter := router.SetupRouter(userRouter, roleRouter)

	port := env.GetEnv("PORT")
	addr := ":" + port

	
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		r.Body = http.MaxBytesReader(w, r.Body, 10<<20) // 10 MB limit
		chiRouter.ServeHTTP(w, r)
	})

	a.server = &http.Server{
		Addr:              addr,
		Handler:           handler,
		ReadTimeout:       5 * time.Second,
		ReadHeaderTimeout: 10 * time.Second,
		WriteTimeout:      10 * time.Second,
	}

	logger.Log.Info("Auth service started successfully", "addr", addr)

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
	logger.Log.Info("Auth service shutdown complete")
	return nil
}

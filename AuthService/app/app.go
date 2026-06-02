package app

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"time"
	config "goAuth/config/db"
	"goAuth/config/env"
	"goAuth/controllers"
	repo "goAuth/db/repositories"
	"goAuth/pkg/logger"
	"goAuth/router"
	"goAuth/services"
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
	logger.Logger.Info("Starting application")

	err := env.Load()
	if err != nil {
		logger.Logger.Error("Failed to load environment variables", "error", err)
		return fmt.Errorf("failed to load environment variables: %w", err)
	}

	// Database
	logger.Logger.Info("Connecting to database")
	db, err := config.SetupDB()
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}
	a.database = db
	logger.Logger.Info("Database connection established")

	// Repositories
	logger.Logger.Info("Initializing repositories")
	a.UserRepo = repo.NewUserRepository(db)
	a.RoleRepo = repo.NewRoleRepository(db)
	a.RolePermissionRepo = repo.NewRolePermissionRepository(db)
	a.UserRoleRepo = repo.NewUserRoleRepository(db)
	logger.Logger.Info("Repositories initialized")

	// Services
	logger.Logger.Info("Initializing services")
	a.UserService = services.NewUserServiceImpl(a.UserRepo)
	a.RoleService = services.NewRoleService(a.RoleRepo, a.RolePermissionRepo, a.UserRoleRepo)
	logger.Logger.Info("Services initialized")

	// Controllers
	logger.Logger.Info("Initializing controllers")
	a.UserController = controllers.NewUserController(a.UserService)
	a.RoleController = controllers.NewRoleController(a.RoleService)
	logger.Logger.Info("Controllers initialized")

	// Router
	userRouter := router.NewUserRouter(a.UserController)
	roleRouter := router.NewRoleRouter(a.RoleController)

	chiRouter := router.SetupRouter(userRouter, roleRouter)

	port := env.GetEnv("PORT", "8080")
	addr := ":" + port

	a.server = &http.Server{
		Addr:         addr,
		Handler:      chiRouter,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	logger.Logger.Info("Auth service started successfully", "addr", addr)

	go func() {
		if err := a.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Logger.Error("Server error", "error", err)
		}
	}()

	return nil
}

func (a *App) Stop(ctx context.Context) error {
	logger.Logger.Info("Application shutdown initiated")

	if a.server != nil {
		shutdownCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
		defer cancel()
		if err := a.server.Shutdown(shutdownCtx); err != nil {
			logger.Logger.Error("Failed to shutdown server", "error", err)
		}
	}

	if a.database != nil {
		logger.Logger.Info("Closing database connection")
		if err := a.database.Close(); err != nil {
			logger.Logger.Error("Failed to close database connection", "error", err)
			return err
		}
		logger.Logger.Info("Database connection closed")
	}
	logger.Logger.Info("Auth service shutdown complete")
	return nil
}

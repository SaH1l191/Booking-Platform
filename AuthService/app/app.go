package app

import (
	"fmt"
	config "goAuth/config/db"
	"goAuth/config/env"
	"goAuth/controllers"
	repo "goAuth/db/repositories"
	"goAuth/router"
	"goAuth/services"
	"net/http"
	"time"
)

type App struct {
	Config *Config
	// Store db.Storage
}
type Config struct {
	Addr string
}

func NewConfig() *Config {
	port := env.GetEnv("PORT", ":8080")
	return &Config{Addr: ":" + port}
}

func NewApp(cf *Config) *App {
	return &App{Config: cf}
}

func (app *App) Run() error {

	db, err := config.SetupDB()
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	ur := repo.NewUserRepository(db)
	us := services.NewUserServiceImpl(ur)
	uc := controllers.NewUserController(us)

	roleRepo := repo.NewRoleRepository(db)
	rolePermRepo := repo.NewRolePermissionRepository(db)
	userRoleRepo := repo.NewUserRoleRepository(db)

	roleService := services.NewRoleService(roleRepo, rolePermRepo, userRoleRepo)

	roleController := controllers.NewRoleController(roleService)

	userRouter := router.NewUserRouter(uc)
	roleRouter := router.NewRoleRouter(roleController)

	server := &http.Server{
		Addr:         app.Config.Addr,
		Handler:      router.SetupRouter(userRouter, roleRouter),
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
	}
	fmt.Printf("Starting server on %s\n", app.Config.Addr)
	err = server.ListenAndServe()
	fmt.Println("ListenAndServe returned:", err)
	return err
}

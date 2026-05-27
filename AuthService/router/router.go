package router

import (
	"github.com/go-chi/chi"
	"github.com/go-chi/chi/middleware"
)

type Route interface {
	Register(*chi.Mux)
}

func SetupRouter(UserRouter Route) *chi.Mux {
	chiRouter := chi.NewRouter()
	chiRouter.Use(middleware.Logger) // built in logger middleware

	UserRouter.Register(chiRouter)

	return chiRouter
}

package router

import (
	"github.com/go-chi/chi"
	"github.com/go-chi/chi/middleware"
)

type Route interface {
	Register(r chi.Router)
}

func SetupRouter(UserRouter Route,pingRouter Route) chi.Router {
	chiRouter := chi.NewRouter()
	chiRouter.Use(middleware.Logger) // built in logger middleware

	UserRouter.Register(chiRouter)
	pingRouter.Register(chiRouter)

	return chiRouter
}

package router

import (
	// "goAuth/middlewares"  
	"github.com/go-chi/chi"
	"github.com/go-chi/chi/middleware"
)

type Route interface {
	Register(r chi.Router)
}

func SetupRouter(UserRouter Route, RoleRouter Route) chi.Router {
	chiRouter := chi.NewRouter()
	chiRouter.Use(middleware.Logger) // built in logger middleware
	// chiRouter.Use(middlewares.RequestValidator)
	// chiRouter.Use(middlewares.RateLimitMiddleware)
	UserRouter.Register(chiRouter) 
	RoleRouter.Register(chiRouter)
	return chiRouter
}

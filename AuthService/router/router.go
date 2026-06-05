package router

import (
	// "goAuth/middlewares"
	"goAuth/middlewares"
	"goAuth/utils"

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

	//Api-Gateway proxy routes

	//localhost:3000/api/v1/hotels/* -> localhost:3001/api/v1/hotels/*
	chiRouter.Route("/api/v1/hotels", func(r chi.Router) {
		r.Use(middlewares.JWTAuthMiddleware)
		r.Handle("/*", utils.ProxyToService("http://localhost:3001", "/"))
	})

	//localhost:3000/api/v1/rooms/* -> localhost:3001/api/v1/rooms/*
	chiRouter.Route("/api/v1/rooms", func(r chi.Router) {
		r.Use(middlewares.JWTAuthMiddleware)
		r.Handle("/*", utils.ProxyToService("http://localhost:3001", "/"))
	})

	//localhost:3000/api/v1/roomCategories/* -> localhost:3001/api/v1/roomCategories/*
	chiRouter.Route("/api/v1/roomCategories", func(r chi.Router) {
		r.Use(middlewares.JWTAuthMiddleware)
		r.Handle("/*", utils.ProxyToService("http://localhost:3001", "/"))
	})

	//localhost:3000/api/v1/bookings/* -> localhost:3002/api/v1/bookings/*
	chiRouter.Route("/api/v1/bookings", func(r chi.Router) {
		r.Use(middlewares.JWTAuthMiddleware)
		r.Handle("/*", utils.ProxyToService("http://localhost:3002", "/"))
	})

	return chiRouter
}

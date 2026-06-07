package router

import (
	// "goAuth/config/env"
	"goAuth/middlewares"
	"goAuth/utils"
	"net/http"

	"github.com/go-chi/chi"
	"github.com/go-chi/chi/middleware"
	"github.com/rs/cors"
)

type Route interface {
	Register(r chi.Router)
}

func SetupRouter(UserRouter Route, RoleRouter Route) chi.Router {
	chiRouter := chi.NewRouter()

	chiRouter.Use(middlewares.SecureHeaders)

	chiRouter.Use(cors.New(cors.Options{
		AllowedOrigins: []string{
			"http://localhost:4000",
		},
		AllowedMethods: []string{
			http.MethodGet,
			http.MethodPost,
			http.MethodPut,
			http.MethodDelete,
			http.MethodOptions,
		},
		AllowCredentials: true,
		AllowedHeaders: []string{
			"Authorization",
			"Content-Type",
			"X-User-ID",
			"X-User-Email",
			"X-User-Role",
		},
	}).Handler)

	chiRouter.Use(middleware.Logger) // built in logger middleware
	// chiRouter.Use(middlewares.RequestValidator)

	UserRouter.Register(chiRouter)
	RoleRouter.Register(chiRouter)

	//Api-Gateway proxy routes
	// hotelServiceURL := env.GetEnv("HOTEL_SERVICE_URL", "http://localhost:3001")
	// bookingServiceURL := env.GetEnv("BOOKING_SERVICE_URL", "http://localhost:3002")
	// reviewServiceURL := env.GetEnv("REVIEW_SERVICE_URL", "http://localhost:3003")

	chiRouter.Route("/api/v1/hotels", func(r chi.Router) {
		// r.Use(middlewares.RateLimitMiddleware(10))
		r.Use(middlewares.JWTAuthMiddleware)
		r.Handle("/*", utils.ProxyToService("http://localhost:3001", "/"))
	})

	chiRouter.Route("/api/v1/rooms", func(r chi.Router) {
		// r.Use(middlewares.RateLimitMiddleware(20))
		r.Use(middlewares.JWTAuthMiddleware)
		r.Handle("/*", utils.ProxyToService("http://localhost:3001", "/"))
	})

	chiRouter.Route("/api/v1/roomCategories", func(r chi.Router) {
		// r.Use(middlewares.RateLimitMiddleware(20))
		r.Use(middlewares.JWTAuthMiddleware)
		r.Handle("/*", utils.ProxyToService("http://localhost:3001", "/"))
	})

	chiRouter.Route("/api/v1/bookings", func(r chi.Router) {
		// r.Use(middlewares.RateLimitMiddleware(20))
		r.Use(middlewares.JWTAuthMiddleware)
		r.Handle("/*", utils.ProxyToService("http://localhost:3002", "/"))
	})

	chiRouter.Route("/api/v1/review", func(r chi.Router) {
		// r.Use(middlewares.RateLimitMiddleware(5))
		r.Use(middlewares.JWTAuthMiddleware)
		r.Handle("/*", utils.ProxyToService("http://localhost:3003", "/"))
	})

	return chiRouter
}

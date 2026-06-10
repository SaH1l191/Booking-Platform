package router

import (
	"github.com/go-chi/chi"
	"goAuth/controllers"
	"goAuth/middlewares"
)

type UserRouter struct {
	userController *controllers.UserController
}

func NewUserRouter(userController *controllers.UserController) *UserRouter {
	return &UserRouter{userController: userController}
}

func (ur *UserRouter) Register(chiRouter chi.Router) {
	chiRouter.Route("/users", func(r chi.Router) {

		// Public routes - no auth
		r.Group(func(auth chi.Router) {
			// auth.Use(middlewares.RateLimitMiddleware(5))

			auth.With(middlewares.CreateUserRequestValidator).
				Post("/signup", ur.userController.CreateUser)

			auth.With(middlewares.LoginUserRequestValidator).
				Post("/login", ur.userController.LoginUser)

			auth.Post("/refresh", ur.userController.RefreshToken)
			auth.Get("/refresh", ur.userController.RefreshToken)

			auth.Post("/logout", ur.userController.LogoutUser)
		})

		// Protected routes - JWT required
		r.Group(func(protected chi.Router) {
			// protected.Use(middlewares.RateLimitMiddleware(10))
			protected.Use(middlewares.JWTAuthMiddleware)

			protected.With(middlewares.RequirePermission("user:read")).Get("/{id}", ur.userController.GetUserByID)
			protected.With(middlewares.RequirePermission("user:delete")).Delete("/{id}", ur.userController.DeleteUser)
			protected.Post("/logout", ur.userController.LogoutUser)
		})

		r.With(middlewares.JWTAuthMiddleware, middlewares.RequirePermission("user:read")).Get("/", ur.userController.GetAllUsers)
	})
}

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

		r.Group(func(auth chi.Router) {
			auth.Use(middlewares.RateLimitMiddleware(5))

			auth.With(middlewares.CreateUserRequestValidator).
				Post("/signup", ur.userController.CreateUser)

			auth.With(middlewares.LoginUserRequestValidator).
				Post("/login", ur.userController.LoginUser)

			auth.Post("/refresh", ur.userController.RefreshToken)
			auth.Get("/refresh", ur.userController.RefreshToken)

			auth.Post("/logout", ur.userController.LogoutUser)
		})

		r.Group(func(protected chi.Router) {
			protected.Use(middlewares.RateLimitMiddleware(10))
			protected.Use(middlewares.JWTAuthMiddleware)

			protected.Get("/{id}", ur.userController.GetUserByID)
			protected.Delete("/{id}", ur.userController.DeleteUser)
			protected.Post("/logout", ur.userController.LogoutUser)
		})

		r.Get("/", ur.userController.GetAllUsers)

		// r.With(middlewares.JWTAuthMiddleware).Get("/{id}", ur.userController.GetUserByID)
		// r.With(middlewares.CreateUserRequestValidator).Post("/signup", ur.userController.CreateUser)
		// r.With(middlewares.LoginUserRequestValidator).Post("/login", ur.userController.LoginUser)

		// r.With(middlewares.JWTAuthMiddleware).Delete("/{id}", ur.userController.DeleteUser)
		// // Logout clears cookies (no auth required)
		// r.Post("/logout", ur.userController.LogoutUser)
		// r.Get("/", ur.userController.GetAllUsers)
		// // Allow both POST and GET for token refresh
		// r.Post("/refresh", ur.userController.RefreshToken)
		// r.Get("/refresh", ur.userController.RefreshToken)
		// r.With(middlewares.JWTAuthMiddleware).Post("/logout",ur.userController.LogoutUser)
	})
}

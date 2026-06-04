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
		r.With(middlewares.JWTAuthMiddleware).Get("/{id}", ur.userController.GetUserByID)
		r.With(middlewares.CreateUserRequestValidator).Post("/signup", ur.userController.CreateUser)
		r.With(middlewares.LoginUserRequestValidator).Post("/login", ur.userController.LoginUser)
		 
		r.With(middlewares.JWTAuthMiddleware).Delete("/{id}", ur.userController.DeleteUser)
		// Logout clears cookies (no auth required)
		r.Post("/logout", ur.userController.LogoutUser)
		r.Get("/", ur.userController.GetAllUsers)
		// Allow both POST and GET for token refresh
		r.Post("/refresh", ur.userController.RefreshToken)
		r.Get("/refresh", ur.userController.RefreshToken)
		r.With(middlewares.JWTAuthMiddleware).Post("/logout",ur.userController.LogoutUser)
	})
}

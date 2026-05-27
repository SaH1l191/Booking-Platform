package router

import (
	"goAuth/controllers"

	"github.com/go-chi/chi"
)

type UserRouter struct {
	userController controllers.UserController
}

func NewUserRouter(userController controllers.UserController) *UserRouter {
	return &UserRouter{userController: userController}
}

func (ur *UserRouter) Register(chiRouter *chi.Mux) {
	chiRouter.Get("/users/{id}", ur.userController.GetUserByID)
	chiRouter.Post("/users", ur.userController.CreateUser)
	chiRouter.Put("/users/{id}", ur.userController.LoginUser)
	// chiRouter.Delete("/users/{id}", ur.userController.DeleteUser)
}

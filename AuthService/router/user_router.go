package router

import (
	"github.com/go-chi/chi"
	"goAuth/controllers"
)

type UserRouter struct {
	userController *controllers.UserController
}

func NewUserRouter(userController *controllers.UserController) *UserRouter {
	return &UserRouter{userController: userController}
}

func (ur *UserRouter) Register(chiRouter chi.Router) {
	chiRouter.Route("/users", func(r chi.Router) {
		r.Get("/{id}", ur.userController.GetUserByID)
		r.Post("/signup", ur.userController.CreateUser)
		r.Post("/login", ur.userController.LoginUser)
		// r.Delete("/users/{id}", ur.userController.DeleteUser)
	})

}

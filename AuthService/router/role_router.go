package router

import (
	"goAuth/controllers"
	"goAuth/middlewares"

	"github.com/go-chi/chi"
)

type RoleRouter struct {
	roleController *controllers.RoleController
}

func NewRoleRouter(_roleController *controllers.RoleController) *RoleRouter {
	return &RoleRouter{
		roleController: _roleController,
	}
}

func (rr *RoleRouter) Register(r chi.Router) {

	r.Route("/roles", func(r chi.Router) {
		r.Get("/{id}", rr.roleController.GetRoleById)
		r.Get("/", rr.roleController.GetAllRoles)
		r.With(middlewares.CreateRoleRequestValidator).Post("/", rr.roleController.CreateRole)
		r.With(middlewares.UpdateRoleRequestValidator).Put("/{id}", rr.roleController.UpdateRole)
		r.Delete("/{id}", rr.roleController.DeleteRole)

		// Role permissions operations
		r.Get("/{id}/permissions", rr.roleController.GetRolePermissions)
		r.With(middlewares.AssignPermissionRequestValidator).Post("/{id}/permissions", rr.roleController.AssignPermissionToRole)
		r.With(middlewares.RemovePermissionRequestValidator).Delete("/{id}/permissions", rr.roleController.RemovePermissionFromRole)
		r.Get("/role-permissions", rr.roleController.GetAllRolePermissions)
		r.With(middlewares.JWTAuthMiddleware, middlewares.RequireAllRoles("admin")).Post("/{userId}/assign/{roleId}", rr.roleController.AssignRoleToUser)
	})

}

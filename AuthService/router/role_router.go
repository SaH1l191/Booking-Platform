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
	
		r.Group(func(auth chi.Router) {
			auth.Use(middlewares.JWTAuthMiddleware)

			// Read operations - any authenticated user can read roles
			auth.With(middlewares.RequirePermission("role:read")).Get("/{id}", rr.roleController.GetRoleById)
			auth.With(middlewares.RequirePermission("role:read")).Get("/", rr.roleController.GetAllRoles)
			auth.With(middlewares.RequirePermission("role:read")).Get("/{id}/permissions", rr.roleController.GetRolePermissions)
			auth.With(middlewares.RequirePermission("role:read")).Get("/role-permissions", rr.roleController.GetAllRolePermissions)

			// Write operations - require specific permissions
			auth.With(middlewares.RequirePermission("role:create")).With(middlewares.CreateRoleRequestValidator).Post("/", rr.roleController.CreateRole)
			auth.With(middlewares.RequirePermission("role:update")).With(middlewares.UpdateRoleRequestValidator).Put("/{id}", rr.roleController.UpdateRole)
			auth.With(middlewares.RequirePermission("role:delete")).Delete("/{id}", rr.roleController.DeleteRole)

			// Permission management - requires role:assign
			auth.With(middlewares.RequirePermission("role:assign")).With(middlewares.AssignPermissionRequestValidator).Post("/{id}/permissions", rr.roleController.AssignPermissionToRole)
			auth.With(middlewares.RequirePermission("role:assign")).With(middlewares.RemovePermissionRequestValidator).Delete("/{id}/permissions", rr.roleController.RemovePermissionFromRole)
			auth.With(middlewares.RequirePermission("role:assign")).Post("/{userId}/assign/{roleId}", rr.roleController.AssignRoleToUser)
		})
	})

}

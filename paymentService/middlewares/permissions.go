package middlewares

import (
	"goPayment/pkg/logger"
	"net/http"
)

// RolePermissions =>  [role] : [permission1,permission2....]
var RolePermissions = map[string][]string{
	"admin": {"*"},
	"hotel_manager": {
		"hotel:create",
		"hotel:read",
		"hotel:update",
		"hotel:delete",
		"room:create",
		"room:read",
		"room:update",
		"room:delete",
		"user:read",
		"booking:read",
		"booking:read-by-hotel",
		"payment:read",
		"payment:create",
		"review:read",
	},
	"customer": {
		"hotel:read",
		"room:read",
		"user:read",
		"booking:create",
		"booking:read",
		"booking:confirm",
		"booking:cancel",
		"review:create",
		"review:read",
		"review:delete",
		"payment:read",
		"payment:create",
	},
}


func RequirePermission(requiredPerm string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			rolesRaw := r.Context().Value("roles")
			roles, ok := rolesRaw.([]string)
			if !ok {
				http.Error(w, "Unauthorized: no roles in context", http.StatusUnauthorized)
				return
			}
			logger.Log.Info("Checking permissions for user", "requiredPermission", requiredPerm, "userRoles", roles)

			for _, role := range roles {
				permissions, exists := RolePermissions[role]
				if !exists {
					continue
				}
				for _, p := range permissions {
					if p == "*" || p == requiredPerm {
						logger.Log.Info("Permission granted", "userRoles", roles, "requiredPermission", requiredPerm)
						next.ServeHTTP(w, r)
						return
					}
				}
			}

			http.Error(w, "Forbidden: missing required permission", http.StatusForbidden)
		})
	}
}

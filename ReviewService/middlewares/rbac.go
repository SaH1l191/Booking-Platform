package middlewares

import (
	"net/http"
)

var RolePermissions = map[string][]string{
	"admin": {"*"},
	"hotel_manager": {
		"review:read",
	},
	"customer": {
		"review:create",
		"review:read",
		"review:delete",
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

			for _, role := range roles {
				permissions, exists := RolePermissions[role]
				if !exists {
					continue
				}
				for _, p := range permissions {
					if p == "*" || p == requiredPerm {
						next.ServeHTTP(w, r)
						return
					}
				}
			}

			http.Error(w, "Forbidden: missing required permission", http.StatusForbidden)
		})
	}
}

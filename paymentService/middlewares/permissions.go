package middlewares

var RolePermissions = map[string][]string{
	"admin": {"*"},
	"hotel_manager": {
		"payment:read",
	},
	"customer": {
		"payment:create",
		"payment:read",
	},
}

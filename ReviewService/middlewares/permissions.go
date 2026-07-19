//  RolePermissionsByRole is never referenced (rbac.go defines its own RolePermissions map)
package middlewares
//
// // RolePermissionsByRole =>  [role] : [permission1,permission2....]
// var RolePermissionsByRole = map[string][]string{
// 	"admin": {"*"},
// 	"hotel_manager": {
// 		"hotel:create",
// 		"hotel:read",
// 		"hotel:update",
// 		"hotel:delete",
// 		"room:create",
// 		"room:read",
// 		"room:update",
// 		"room:delete",
// 		"booking:read",
// 		"payment:read",
// 		"payment:create",
// 		"review:read",
// 		"review:create",
// 	},
// 	"customer": {
// 		"hotel:read",
// 		"room:read",
// 		"booking:create",
// 		"booking:read",
// 		"booking:confirm",
// 		"booking:cancel",
// 		"review:create",
// 		"review:read",
// 		"review:delete",
// 		"payment:read",
// 		"payment:create",
// 		"payment:delete",
// 	},
// }
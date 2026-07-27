export const RolePermissions: Record<string, string[]> = {
  admin: ["*"],
  hotel_manager: [
    "booking:read",
    "booking:read-by-hotel",
    "booking:cancel",
  ],
  customer: [
    "booking:create",
    "booking:read",
    "booking:confirm",
    "booking:cancel",
  ],
};

// // RolePermissions =>  [role] : [permission1,permission2....]
// var RolePermissions = map[string][]string{
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
// 	},
// }

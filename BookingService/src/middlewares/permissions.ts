export const RolePermissions: Record<string, string[]> = {
  admin: ["*"],
  hotel_manager: [
    "booking:read",
  ],
  customer: [
    "booking:create",
    "booking:read",
    "booking:confirm",
    "booking:cancel",
  ],
};

-- +goose Up
-- Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin';

-- Hotel Manager permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hotel_manager'
AND p.name IN (
    'profile:read', 'profile:write',
    'hotel:read', 'hotel:write', 'hotel:delete',
    'booking:read', 'booking:write',
    'review:read',
    'role:read'
);

-- Customer permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'customer'
AND p.name IN (
    'auth:login', 'auth:register',
    'profile:read', 'profile:write',
    'hotel:read',
    'booking:read', 'booking:write', 'booking:delete',
    'review:read', 'review:write'
);

-- +goose Down
-- Rollback: Remove all role_permissions for these specific roles
DELETE FROM role_permissions
WHERE role_id IN (SELECT id FROM roles WHERE name IN ('admin', 'hotel_manager', 'customer'));   
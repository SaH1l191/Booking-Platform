-- +goose Up
-- Seed default roles
INSERT  IGNORE INTO roles (name, description) VALUES
    ('admin', 'Full system access'),
    ('hotel_manager', 'Manages hotels, rooms and bookings'),
    ('customer', 'Regular customer who makes bookings');

-- Seed permissions (resource:action format)
INSERT  IGNORE INTO permissions (name, resource, action) VALUES
    ('role:create', 'role', 'create'),
    ('role:read', 'role', 'read'),
    ('role:update', 'role', 'update'),
    ('role:delete', 'role', 'delete'),
    ('role:assign', 'role', 'assign'),
    ('hotel:create', 'hotel', 'create'),
    ('hotel:read', 'hotel', 'read'),
    ('hotel:update', 'hotel', 'update'),
    ('hotel:delete', 'hotel', 'delete'),
    ('room:create', 'room', 'create'),
    ('room:read', 'room', 'read'),
    ('room:update', 'room', 'update'),
    ('room:delete', 'room', 'delete'),
    ('booking:create', 'booking', 'create'),
    ('booking:read', 'booking', 'read'),
    ('booking:cancel', 'booking', 'cancel'),
    ('booking:confirm', 'booking', 'confirm'),
    ('review:create', 'review', 'create'),
    ('review:read', 'review', 'read'),
    ('review:delete', 'review', 'delete'),
    ('user:read', 'user', 'read'),
    ('user:delete', 'user', 'delete');


INSERT  IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin';

INSERT  IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hotel_manager'
AND p.resource IN ('hotel', 'room');


INSERT  IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hotel_manager'
AND p.resource IN ('booking', 'review');


-- Assign basic read permissions to customer
INSERT  IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'customer'
AND p.action = 'read';

-- +goose Down
DELETE FROM role_permissions;
DELETE FROM permissions;
DELETE FROM roles;

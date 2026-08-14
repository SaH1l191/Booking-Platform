-- +goose Up
-- Drop duplicate id indexes (SERIAL creates both PRIMARY KEY and explicit id index)
ALTER TABLE users DROP INDEX IF EXISTS id;
ALTER TABLE roles DROP INDEX IF EXISTS id;
ALTER TABLE user_roles DROP INDEX IF EXISTS id;
ALTER TABLE role_permissions DROP INDEX IF EXISTS id;
ALTER TABLE permissions DROP INDEX IF EXISTS id;

--  composite index -faster RBAC permission checks
CREATE INDEX IF NOT EXISTS idx_role_permission ON role_permissions (role_id, permission_id);

-- +goose Down
DROP INDEX IF EXISTS idx_role_permission ON role_permissions;

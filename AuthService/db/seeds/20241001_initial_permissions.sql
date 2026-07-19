-- Permissions (resource/action based)

-- +goose Up
-- Permissions (resource/action based)
INSERT INTO permissions (name, description, resource, action) VALUES
  ('auth:login',      'Permission to login',                    'auth', 'login'),
  ('auth:register',   'Permission to register account',         'auth', 'register'),
  ('profile:read',    'Permission to read profile data',        'profile', 'read'),
  ('profile:write',   'Permission to update profile data',      'profile', 'write'),
  ('hotel:read',      'Permission to read hotel data',          'hotel', 'read'),
  ('hotel:write',     'Permission to create/update hotels',     'hotel', 'write'),
  ('hotel:delete',    'Permission to delete hotels',            'hotel', 'delete'),
  ('booking:read',    'Permission to read booking data',        'booking', 'read'),
  ('booking:write',   'Permission to create/update bookings',   'booking', 'write'),
  ('booking:delete',  'Permission to cancel/delete bookings',   'booking', 'delete'),
  ('review:read',     'Permission to read reviews',             'review', 'read'),
  ('review:write',    'Permission to create/update reviews',    'review', 'write'),
  ('review:delete',   'Permission to delete reviews',           'review', 'delete'),
  ('role:read',       'Permission to read role data',           'role', 'read'),
  ('role:manage',     'Permission to manage roles',             'role', 'manage');

-- +goose Down
-- Rollback: Delete the specific permissions added above
DELETE FROM permissions WHERE resource IN ('auth', 'profile', 'hotel', 'booking', 'review', 'role');   

-- INSERT INTO permissions (name, description, resource, action) VALUES
--   ('user:read',   'Permission to read user data',        'user', 'read'),
--   ('user:write',  'Permission to write user data',       'user', 'write'),
--   ('user:delete', 'Permission to delete user data',      'user', 'delete'),
--   ('role:read',   'Permission to read role data',        'role', 'read'),
--   ('role:write',  'Permission to write role data',       'role', 'write'),
--   ('role:delete', 'Permission to delete role data',      'role', 'delete'),
--   ('role:manage', 'Permission to manage roles',          'role', 'manage'),
--   ('permission:read',   'Permission to read permissions',  'permission', 'read'),
--   ('permission:write',  'Permission to write permissions', 'permission', 'write'),
--   ('permission:delete', 'Permission to delete permissions','permission', 'delete'),
--   ('permission:manage', 'Permission to manage permissions','permission', 'manage'),
--   ('booking:read',   'Permission to read booking data',   'booking', 'read'),
--   ('booking:write',  'Permission to write booking data',  'booking', 'write'),
--   ('booking:delete', 'Permission to delete booking data', 'booking', 'delete'),
--   ('report:read',    'Permission to read reports',        'report', 'read'),
--   ('report:write',   'Permission to write reports',       'report', 'write'),
--   ('analytics:read', 'Permission to read analytics',     'analytics', 'read');
 

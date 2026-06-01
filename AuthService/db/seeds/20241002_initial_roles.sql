-- -- Roles
-- INSERT INTO roles (name, description) VALUES
--   ('admin', 'Administrator with full access'),
--   ('user', 'Regular user with limited access'),
--   ('moderator', 'Moderator with elevated privileges'),
--   ('guest', 'Read‑only guest'),
--   ('editor', 'Can edit content'),
--   ('viewer', 'Can view content'),
--   ('analyst', 'Can analyze data'),
--   ('support', 'Support staff with limited write'),
--   ('manager', 'Manager with full control');


INSERT INTO roles (name, description) VALUES
  ('admin', 'Administrator with full access'),
  ('hotel_manager', 'Manages hotels, rooms and bookings'),
  ('customer', 'Regular customer who makes bookings');
  
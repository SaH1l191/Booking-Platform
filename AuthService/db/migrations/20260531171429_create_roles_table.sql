-- +goose Up
SELECT 'up SQL query';
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
-- +goose Down
SELECT 'down SQL query';
DROP TABLE IF EXISTS roles;




-- INSERT INTO roles (name, description) VALUES
-- ('admin', 'Administrator with full access'),
-- ('user', 'Regular user with limited access'),
-- ('moderator', 'Moderator with elevated privileges');

-- +goose Up
ALTER TABLE payments ADD COLUMN user_email VARCHAR(255) DEFAULT '' AFTER user_id;

-- +goose Down
ALTER TABLE payments DROP COLUMN user_email;

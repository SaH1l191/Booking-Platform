-- +goose Up

ALTER TABLE users DROP COLUMN avatar;
ALTER TABLE users DROP COLUMN bio;
ALTER TABLE users DROP COLUMN phone_number;
ALTER TABLE users DROP COLUMN date_of_birth;
ALTER TABLE users DROP COLUMN gender;
ALTER TABLE users DROP COLUMN nationality;
-- +goose Down  
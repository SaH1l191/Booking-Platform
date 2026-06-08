-- +goose Up
RENAME TABLE review_service TO reviews;

-- +goose Down
RENAME TABLE reviews TO review_service;

-- +goose Up
CREATE TABLE review_eligibility (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    booking_id BIGINT NOT NULL UNIQUE,
    user_id BIGINT NOT NULL,
    hotel_id BIGINT NOT NULL,
    room_id BIGINT NOT NULL,
    eligible BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_review_eligibility_user_hotel_room ON review_eligibility(user_id, hotel_id, room_id);

-- +goose Down
DROP TABLE review_eligibility;

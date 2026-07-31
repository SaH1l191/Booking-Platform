-- +goose Up
ALTER TABLE reviews
  ADD UNIQUE INDEX idx_reviews_active_booking (
    (CASE WHEN deleted_at IS NULL THEN booking_id END)
  );
--  prevents race condition for concurrrent review on same booking
-- +goose Down
ALTER TABLE reviews DROP INDEX idx_reviews_active_booking;


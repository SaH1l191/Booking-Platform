-- +goose Up
CREATE TABLE IF NOT EXISTS processed_events (
    event_id VARCHAR(36) PRIMARY KEY,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE outbox ADD COLUMN event_id VARCHAR(36) NOT NULL AFTER id,
ADD UNIQUE INDEX idx_outbox_event_id (event_id);

-- +goose Down
DROP TABLE IF EXISTS processed_events;
ALTER TABLE outbox DROP INDEX idx_outbox_event_id,
DROP COLUMN event_id;

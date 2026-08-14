-- +goose Up
-- Add index for outbox publisher (avoids full PK scan on published = FALSE)
CREATE INDEX IF NOT EXISTS idx_outbox_published_id ON outbox (published, id);

-- +goose Down
DROP INDEX IF EXISTS idx_outbox_published_id ON outbox;

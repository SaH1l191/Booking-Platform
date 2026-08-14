-- +goose Up
-- Drop useless low-cardinality index (almost all rows have deleted_at = NULL)
ALTER TABLE reviews DROP INDEX IF EXISTS idx_deleted_at;

-- +goose Down
CREATE INDEX idx_deleted_at ON reviews (deleted_at);

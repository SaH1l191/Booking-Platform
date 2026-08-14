#!/bin/bash
set -e

DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-root}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"

MYSQL="mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD --batch --skip-column-names"

strip_goose() {
    sed '/^-- +goose Down$/,$d' "$1" | grep -v '^-- +goose'
}

run_sql_dir() {
    local db="$1"
    local dir="$2"
    for f in $(ls -1 "$dir"/*.sql 2>/dev/null | sort); do
        local content
        content=$(strip_goose "$f")
        [ -z "$content" ] && continue
        echo "$content" | $MYSQL "$db" 2>/dev/null && echo "    [ok] $(basename $f)" || echo "    [skip] $(basename $f)"
    done
}

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=========================================="
echo "  Booking Platform - Full Setup"
echo "=========================================="

echo ""
echo "[1/7] Creating databases..."
$MYSQL -e "
CREATE DATABASE IF NOT EXISTS auth_db;
CREATE DATABASE IF NOT EXISTS airbnb_development;
CREATE DATABASE IF NOT EXISTS airbnb_development1;
CREATE DATABASE IF NOT EXISTS payment_db;
CREATE DATABASE IF NOT EXISTS review_service;
" 2>/dev/null
echo "  Done"

echo ""
echo "[2/7] AuthService..."
echo "  Migrations:"
run_sql_dir "auth_db" "$SCRIPT_DIR/AuthService/db/migrations"
echo "  Seeds:"
run_sql_dir "auth_db" "$SCRIPT_DIR/AuthService/db/seeds"

echo ""
echo "[3/7] hotelService..."
cd "$SCRIPT_DIR/hotelService"
npx sequelize-cli db:migrate 2>&1 | grep -E "migrat" || true
npx sequelize-cli db:seed:all 2>&1 | grep -E "seed" || true
cd "$SCRIPT_DIR"
echo "  Done"

echo ""
echo "[4/7] BookingService..."
cd "$SCRIPT_DIR/BookingService"
npx prisma migrate deploy 2>&1 | grep -E "Applying|successfully" || true
npx prisma generate 2>&1 | grep -E "Generated" || true
npx prisma db seed 2>&1 | grep -E "Created|seed" || true
cd "$SCRIPT_DIR"
echo "  Done"

echo ""
echo "[5/7] PaymentService..."
echo "  Migrations:"
run_sql_dir "payment_db" "$SCRIPT_DIR/paymentService/db/migrations"
echo "  Seeds:"
run_sql_dir "payment_db" "$SCRIPT_DIR/paymentService/db/seeds"

echo ""
echo "[6/7] ReviewService..."
echo "  Migrations:"
run_sql_dir "review_service" "$SCRIPT_DIR/ReviewService/db/migrations"
echo "  Seeds:"
run_sql_dir "review_service" "$SCRIPT_DIR/ReviewService/db/seeds"

echo ""
echo "[7/7] NotificationService..."
$MYSQL airbnb_development -e "
CREATE TABLE IF NOT EXISTS processed_events (
    event_id VARCHAR(36) PRIMARY KEY,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);" 2>/dev/null
echo "  processed_events table ensured"

echo ""
echo "=========================================="
echo "  Setup complete!"
echo "=========================================="

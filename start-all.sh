#!/usr/bin/env bash
# Start all services in separate terminals

echo "Starting all services..."

if command -v gnome-terminal >/dev/null 2>&1; then
    TERM_CMD="gnome-terminal -- bash -c"
    TERM_FLAGS=""
elif command -v konsole >/dev/null 2>&1; then
    TERM_CMD="konsole --noclose -e bash -c"
    TERM_FLAGS=""
elif command -v xterm >/dev/null 2>&1; then
    TERM_CMD="xterm -e bash -c"
    TERM_FLAGS=""
else
    echo "No supported terminal emulator found (gnome-terminal, konsole, xterm)."
    echo "Installing konsole (KDE default, CachyOS):"
    sudo pacman -S konsole
    TERM_CMD="konsole --noclose -e bash -c"
    TERM_FLAGS=""
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

run_in_terminal() {
    local title="$1"
    local cmd="$2"
    $TERM_CMD "$cmd" $TERM_FLAGS &
    sleep 1
}

# Frontend - Next.js
run_in_terminal "Frontend" "cd '$SCRIPT_DIR/frontend' && npm run dev"

# AuthService - Go
run_in_terminal "AuthService" "cd '$SCRIPT_DIR/AuthService' && go run main.go"

# HotelService - Node.js
run_in_terminal "HotelService" "cd '$SCRIPT_DIR/hotelService' && npm run dev"

# BookingService - Node.js
run_in_terminal "BookingService" "cd '$SCRIPT_DIR/BookingService' && npm run dev"

# NotificationService - Node.js
run_in_terminal "NotificationService" "cd '$SCRIPT_DIR/NotificationService' && npm run dev"

# ReviewService - Go
run_in_terminal "ReviewService" "cd '$SCRIPT_DIR/ReviewService' && go run main.go"

# PaymentService - Go
run_in_terminal "PaymentService" "cd '$SCRIPT_DIR/paymentService' && go run main.go"

echo "All services started!"

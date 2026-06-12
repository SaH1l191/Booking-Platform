@echo off
REM Start all services in separate terminals

echo Starting all services...

REM Frontend - Next.js
start "Frontend" cmd /k "cd frontend && npm run dev"

REM AuthService - Go
start "AuthService" cmd /k "cd AuthService && air"

REM HotelService - Node.js
start "HotelService" cmd /k "cd hotelService && npm run dev"

REM BookingService - Node.js
start "BookingService" cmd /k "cd BookingService && npm run dev"

REM NotificationService - Node.js
start "NotificationService" cmd /k "cd NotificationService && npm run dev"

REM ReviewService - Go
start "ReviewService" cmd /k "cd ReviewService && air"

REM PaymentService - Go
start "PaymentService" cmd /k "cd paymentService && air"

echo All services started!
pause

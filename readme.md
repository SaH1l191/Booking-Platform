# StayEase — Hotel Booking Platform

A full-stack microservices-based hotel booking platform with asynchronous event-driven communication, distributed locking, payment integration, and centralized observability.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | Next.js, Zustand, Tailwind CSS v4 | SSR/CSR hybrid, lightweight state management, utility-first styling |
| **Booking Service** | Node.js, TypeScript, Prisma ORM | Type-safe DB access, auto-generated migrations for the booking domain |
| **Payment Service** | Go, Chi router, raw SQL | High-throughput payment processing, Go's concurrency for webhook handling |
| **Auth Service** | Go, Chi router, JWT | Stateless auth, Go's performance for token operations |
| **Hotel Service** | Node.js, TypeScript, Sequelize |ORM for hotel/room/category models with validation |
| **Review Service** | Go, Chi router | Lightweight CRUD, Go standard for read-heavy services |
| **Notification Service** | Node.js, TypeScript, Nodemailer, Handlebars | Template-based emails, async event consumption |
| **Message Broker** | RabbitMQ | Durable queues, fanout exchanges for pub/sub across services |
| **Cache / Locking** | Redis, Redlock | Distributed lock for concurrent booking, availability cache |
| **Database** | MySQL 8.0 | Each service owns its own database (database-per-service pattern) |
| **Observability** | Prometheus, Grafana, Loki, Promtail | Metrics scraping, dashboards, centralized log aggregation |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Frontend (Next.js)                         │
│   Hotels · Bookings · Payments · Reviews · Admin · Hotel Manager    │
└────────────────────────────────┬────────────────────────────────────┘
                                 │ HTTP
                    ┌────────────┴────────────┐
                    │     API Gateway / BFF     │
                    │   (AuthService routing)   │
                    └──┬─────┬─────┬─────┬─────┘
                       │     │     │     │
          ┌────────────┘     │     │     └────────────┐
          │                  │     │                  │
   ┌──────▼──────┐  ┌───────▼──┐  │  ┌───────────────▼──────┐
   │    Auth      │  │  Hotel   │  │  │      Review          │
   │   Service    │  │ Service  │  │  │      Service         │
   │   (Go)       │  │ (Node)   │  │  │      (Go)            │
   └──────────────┘  └──────────┘  │  └──────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
             ┌──────▼──────┐            ┌─────────▼─────────┐
             │   Booking   │◄──────────►│     Payment       │
             │   Service   │  RabbitMQ  │     Service       │
             │   (Node)    │◄──────────►│     (Go)          │
             └──────┬──────┘  events    └────────┬──────────┘
                    │                            │
                    │         ┌──────────────────┘
                    │         │
             ┌──────▼─────────▼──────┐
             │  Notification Service  │
             │       (Node.js)        │
             └────────────────────────┘

         ┌──────────┐  ┌──────────┐  ┌──────────┐
         │  Redis   │  │  MySQL   │  │ RabbitMQ │
         │ (cache + │  │ (per-svc │  │ (fanout  │
         │  lock)   │  │   DBs)   │  │ exchanges│
         └──────────┘  └──────────┘  └──────────┘

         ┌──────────────────────────────────────┐
         │         Observability Stack           │
         │  Prometheus → Grafana                 │
         │  Loki ← Promtail (log aggregation)   │
         └──────────────────────────────────────┘
```

### Service Communication

Services communicate via **RabbitMQ fanout exchanges**, ensuring every subscriber receives every message (pub/sub), not competing for messages (competing consumers).

```
                          ┌─────────────────────────────┐
                          │    booking_events_exchange   │
                          │         (fanout)            │
                          └──────┬──────────┬───────────┘
                                 │          │
                    ┌────────────┘          └────────────┐
                    │                                   │
    ┌───────────────▼───────────────┐   ┌───────────────▼───────────────┐
    │ booking-service-booking-events │   │ notification-service-booking   │
    │     (own queue, own consumer)  │   │     -events (own queue)        │
    └───────────────────────────────┘   └───────────────────────────────┘

                          ┌─────────────────────────────┐
                          │   payment_events_exchange    │
                          │         (fanout)            │
                          └──────┬──────────┬───────────┘
                                 │          │
                    ┌────────────┘          └────────────┐
                    │                                   │
    ┌───────────────▼───────────────┐   ┌───────────────▼───────────────┐
    │ booking-service-payment-events │   │ notification-service-payment   │
    │     (own queue, own consumer)  │   │     -events (own queue)        │
    └───────────────────────────────┘   └───────────────────────────────┘
```

Each service declares its own queue bound to the exchange. When a message is published, RabbitMQ delivers a **copy** to every bound queue. This prevents one slow consumer from blocking another.

---

## Booking Flow

```
 User clicks "Reserve"
        │
        ▼
 BookingService.createBooking()
        │
        ├─ 1. Acquire Redlock on hotel:{id}:room:{id} (8s TTL)
        ├─ 2. Conflict check (overlapping dates, PENDING/CONFIRMED)
        ├─ 3. Create booking (status=PENDING, expiresAt=NOW+15min)
        ├─ 4. Generate idempotency key
        ├─ 5. Write BOOKING_CREATED to outbox ──► Atomic transaction
        └─ 6. Release lock
                    │
                    ▼ (outbox publisher polls every 5s)
         ┌──────────────────────┐
         │ booking_events_       │
         │ exchange (fanout)    │
         └──────────┬───────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
 PaymentService           NotificationService
 BookingConsumer          (ignores BOOKING_CREATED)
        │
        ├─ Create Razorpay order
        ├─ Save payment (status=CREATED)
        └─ Write PAYMENT_CREATED to outbox
                    │
                    ▼ (outbox publisher)
         ┌──────────────────────┐
         │ payment_events_       │
         │ exchange (fanout)    │
         └──────────────────────┘
                    │
                    ▼
        User completes Razorpay checkout
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
  Razorpay Webhook        Frontend verifyPayment()
        │                       │
        └───────────┬───────────┘
                    ▼
 PaymentService updates payment to CAPTURED
 Writes PAYMENT_CAPTURED to outbox
                    │
                    ▼ (outbox publisher)
         ┌──────────────────────┐
         │ payment_events_       │
         │ exchange (fanout)    │
         └──────────┬───────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
 BookingService           NotificationService
 handlePaymentCaptured()  handlePaymentCaptured()
        │                       │
        ├─ Update booking →      ├─ Send payment confirmation
        │  CONFIRMED             │  email
        ├─ Finalize idempotency
        │  key
        ├─ Write BOOKING_CONFIRMED
        │  to outbox
        └─ Update Redis cache
```

---

## Services

### AuthService (Go, port 3000)

JWT-based authentication with role-based access control (RBAC).

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/users/signup` | POST | Public | Register user |
| `/users/login` | POST | Public | Login, returns access + refresh tokens |
| `/users/refresh` | GET/POST | Refresh token | Rotate tokens |
| `/users/logout` | POST | JWT | Invalidate session |
| `/{id}` | GET | `user:read` | Get user by ID |
| `/` | GET | `user:read` | List all users |
| `/{id}` | DELETE | `user:delete` | Delete user |

**Roles:** `admin` (full access), `hotel_manager` (read bookings), `customer` (create/read/cancel bookings)

---

### HotelService (Node.js, port 3001)

Manages hotels, rooms, and room categories with Zod validation.

| Resource | Endpoints | Permissions |
|----------|-----------|-------------|
| Hotels | CRUD + `GET /:id/rooms` | `hotel:create`, `hotel:read`, `hotel:update`, `hotel:delete` |
| Rooms | CRUD + `GET /hotel/:hotelId` | `room:create`, `room:read`, `room:update`, `room:delete` |
| Categories | CRUD | `category:create`, `category:read`, `category:update`, `category:delete` |

---

### BookingService (Node.js, port 3002)

Core booking logic with distributed locking and idempotency.

| Endpoint | Method | Permission | Description |
|----------|--------|-----------|-------------|
| `/api/v1/bookings/` | POST | `booking:create` | Create booking (Redlock + outbox) |
| `/api/v1/bookings/me` | GET | `booking:read` | User's bookings |
| `/api/v1/bookings/hotel/:hotelId` | GET | `booking:read` | Bookings for a hotel |
| `/api/v1/bookings/:id` | GET | `booking:read` | Booking by ID |
| `/api/v1/bookings/cancel/:id` | PATCH | `booking:cancel` | Cancel booking |
| `/api/v1/bookings/availability` | GET | `booking:read` | Check room availability |
| `/metrics` | GET | Public | Prometheus metrics |

**Workers:**
- **Outbox Publisher** — polls every 5s, publishes unpublished outbox events to `booking_events_exchange`
- **Payment Event Consumer** — listens for `PAYMENT_CAPTURED` / `PAYMENT_FAILED` / `PAYMENT_REFUNDED`, updates booking status, finalizes idempotency key, updates Redis availability cache
- **Expiry Cron** — every 60s, expires PENDING bookings past `expiresAt` (excluding those with active payments)
- **Reconciliation Cron** — every 120s, cross-DB check for CAPTURED payments where booking is still PENDING (covers lost events)

---

### PaymentService (Go, port 3005)

Razorpay integration with transactional outbox pattern.

| Endpoint | Method | Permission | Description |
|----------|--------|-----------|-------------|
| `/payments/create-order` | POST | `payment:create` | Create Razorpay order |
| `/payments/verify` | POST | `payment:create` | Verify HMAC signature, capture payment |
| `/payments/refund` | POST | `payment:create` | Partial/full refund via Razorpay API |
| `/payments/booking/:bookingId` | GET | `payment:read` | Payment by booking ID |
| `/payments/webhook` | POST | Public (HMAC verified) | Razorpay webhook handler |
| `/metrics` | GET | Public | Prometheus metrics |

**Workers:**
- **Booking Consumer** — listens for `BOOKING_CREATED` (creates Razorpay order), `BOOKING_CANCELLED` (refunds if captured)
- **Outbox Publisher** — polls every 5s, publishes to `payment_events_exchange`

**Webhook security:** HMAC-SHA256 signature verification against `RAZORPAY_WEBHOOK_SECRET`. Idempotent processing — skips if payment already CAPTURED/FAILED.

---

### NotificationService (Node.js, port 5000)

Event-driven email notifications via Nodemailer + Handlebars templates.

| Worker | Exchange | Own Queue | Handles |
|--------|----------|-----------|---------|
| Booking Notification | `booking_events_exchange` | `notification-service-booking-events` | `BOOKING_CONFIRMED`, `BOOKING_CANCELLED`, `BOOKING_EXPIRED` |
| Payment Notification | `payment_events_exchange` | `notification-service-payment-events` | `PAYMENT_CAPTURED`, `PAYMENT_FAILED`, `PAYMENT_REFUNDED` |
| Email Worker | — | `email_queue` | Generic template-based emails |

**Email templates:** `confirm-booking.hbs`, `booking-expired.hbs`, `payment-confirmation.hbs`, `welcome.hbs`

---

### ReviewService (Go, port 3003)

| Endpoint | Method | Permission | Description |
|----------|--------|-----------|-------------|
| `/reviews/` | GET | `review:read` | List all reviews |
| `/reviews/` | POST | `review:create` | Create review |
| `/reviews/:id` | GET | `review:read` | Get review by ID |
| `/reviews/:id` | PUT | `review:create` | Update review |
| `/reviews/:id` | DELETE | `review:delete` | Delete review |
| `/reviews/user/:id` | GET | `review:read` | Reviews by user |
| `/reviews/hotels/:id` | GET | `review:read` | Reviews by hotel |
| `/reviews/booking/:id` | GET | `review:read` | Reviews by booking |

---

## Frontend (Next.js)

| Page | Description |
|------|-------------|
| `/` | Homepage with search panel (location, dates, guests) |
| `/hotels` | Browse hotels with filtering |
| `/hotels/:id` | Hotel detail with image gallery, room selection, DayPicker calendar, map, reviews, booking sidebar |
| `/bookings` | User bookings with status filters, Pay Now for PENDING, review modal for CONFIRMED+expired |
| `/login` | Login |
| `/signup` | Registration |
| `/admin` | Admin bookings panel |
| `/hotel` | Hotel manager bookings panel |
| `/experiences` | Experiences page |

**State management:** Zustand stores for auth, bookings, hotels, rooms, room categories, reviews, payment.

---

## Key Architectural Decisions

### 1. Transactional Outbox Pattern
Events are never published directly to RabbitMQ. Instead, they are written to an `outbox` table in the same database transaction as the business operation. A background publisher polls the outbox and delivers to RabbitMQ. This guarantees **at-least-once delivery** without distributed transactions.

### 2. Fanout Exchanges (not competing consumers)
Each service declares its own queue bound to a fanout exchange. Every subscriber gets a copy of every message. This prevents one slow consumer (e.g., sending emails) from blocking another (e.g., confirming bookings).

### 3. Redlock for Concurrent Booking Protection
A Redis-based distributed lock (Redlock algorithm, 8s TTL) prevents two users from simultaneously booking the same room for overlapping dates. The lock is acquired before the DB transaction and released in a `finally` block.

### 4. Idempotency Keys
Each booking gets a UUID v4 idempotency key. The key is finalized (set to `true`) when the booking is confirmed or expired. This prevents duplicate processing on retries.

### 5. Booking Expiry with Payment Awareness
PENDING bookings expire after 15 minutes. The expiry cron excludes bookings that have a `CREATED` payment in the PaymentService database — preventing expiry of bookings where the user is mid-checkout.

### 6. Reconciliation Cron
A cross-DB reconciliation cron runs every 120s. It finds CAPTURED payments where the booking is still PENDING (meaning the `PAYMENT_CAPTURED` event was lost) and force-confirms those bookings. This is the safety net for event delivery failures.

### 7. Database-per-Service
Each service owns its own MySQL database. Services never cross-query each other's databases. The reconciliation cron is the only exception — it uses cross-DB joins specifically because it's a recovery mechanism.

### 8. JWT with Refresh Token Rotation
Access tokens are short-lived. Refresh tokens are rotated on every `/refresh` call. The frontend stores tokens in localStorage and uses axios interceptors for automatic token refresh on 401 responses.

### 9. RBAC with Permission Strings
Roles (`admin`, `hotel_manager`, `customer`) map to permission strings (`booking:create`, `payment:read`, etc.). Each endpoint declares its required permission. The middleware checks if the user's roles include the required permission.

### 10. Prometheus Metrics + Structured Logging
BookingService exposes HTTP request duration histograms and request counters via `prom-client`. All services use structured JSON logging. Loki + Promtail aggregate logs from all services. Grafana provides dashboards for both metrics and logs.

---

## Infrastructure

| Service | Port | Purpose |
|---------|------|---------|
| Redis | 6379 | Distributed locking (Redlock), availability cache |
| RabbitMQ | 5672 / 15672 (management) | Async event communication between services |
| MySQL | 3306 | Database per service |
| Prometheus | 9090 | Metrics scraping from all services |
| Grafana | 3010 | Dashboards for metrics and logs |
| Loki | 3100 | Log aggregation |
| Promtail | — | Log shipping from service logs to Loki |

---

## Running the Project

### Prerequisites
- Node.js 18+
- Go 1.21+
- MySQL 8.0
- Redis 7
- RabbitMQ 3 (with management plugin)

### Start Infrastructure
```bash
docker compose up -d
```

### Start Each Service
```bash
# AuthService
cd AuthService && go run main.go

# HotelService
cd hotelService && npm install && npm run dev

# BookingService
cd BookingService && npm install && npx prisma db push && npm run dev

# PaymentService
cd paymentService && go run main.go

# NotificationService
cd NotificationService && npm install && npm run dev

# ReviewService
cd ReviewService && go run main.go

# Frontend
cd frontend && npm install && npm run dev
```

### Ports
| Service | Port |
|---------|------|
| Frontend | 3000 |
| AuthService | 3000 |
| HotelService | 3001 |
| BookingService | 3002 |
| ReviewService | 3003 |
| NotificationService | 5000 |
| PaymentService | 3005 |

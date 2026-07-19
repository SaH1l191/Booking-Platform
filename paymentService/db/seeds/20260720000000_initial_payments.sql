-- +goose Up

-- Payments: one per booking (bookings 1-28), covering all statuses
-- user_email matches AuthService users (alice@example.com through zack@example.com)
INSERT INTO payments (booking_id, user_id, user_email, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, currency, status, refund_amount, failure_reason, created_at, updated_at) VALUES
  -- CAPTURED payments (successful, matching CONFIRMED bookings)
  (1,  2,  'alice@example.com',    'order_7a8b9c0d1e2f3g4h', 'pay_9x8y7z6w5v4u3t2s', 'sig_a1b2c3d4e5f6g7h8', 300, 'INR', 'CAPTURED', 0,   NULL,                    '2026-06-09 10:00:00', '2026-06-09 10:05:00'),
  (2,  3,  'bob@example.com',      'order_2h3i4j5k6l7m8n', 'pay_1a2b3c4d5e6f7g8h', 'sig_h8g7f6e5d4c3b2a1', 300, 'INR', 'CAPTURED', 0,   NULL,                    '2026-06-10 11:00:00', '2026-06-10 11:04:00'),
  (3,  4,  'charlie@example.com',  'order_9o0p1q2r3s4t5u', 'pay_9i8h7g6f5e4d3c2b', 'sig_b2c3d4e5f6g7h8i9', 300, 'INR', 'CAPTURED', 0,   NULL,                    '2026-06-11 09:30:00', '2026-06-11 09:35:00'),
  (4,  5,  'david@example.com',    'order_5v6w7x8y9z0a1b', 'pay_1c2d3e4f5g6h7i8j', 'sig_i9h8g7f6e5d4c3b2', 300, 'INR', 'CAPTURED', 0,   NULL,                    '2026-06-12 14:00:00', '2026-06-12 14:04:00'),
  (5,  6,  'eva@example.com',      'order_3c4d5e6f7g8h9i', 'pay_9j8k7l6m5n4o3p2q', 'sig_j2k3l4m5n6o7p8q9', 300, 'INR', 'CAPTURED', 0,   NULL,                    '2026-06-13 08:00:00', '2026-06-13 08:03:00'),
  (6,  7,  'frank@example.com',    'order_1i2j3k4l5m6n7o', 'pay_1r2s3t4u5v6w7x8y', 'sig_q9r8s7t6u5v4w3x2', 300, 'INR', 'CAPTURED', 0,   NULL,                    '2026-06-14 12:00:00', '2026-06-14 12:04:00'),
  (7,  8,  'grace@example.com',    'order_9o0p1q2r3s4t5u', 'pay_9y8z7a6b5c4d3e2f', 'sig_x2y3z4a5b6c7d8e9', 300, 'INR', 'CAPTURED', 0,   NULL,                    '2026-06-15 10:30:00', '2026-06-15 10:34:00'),
  (8,  9,  'henry@example.com',    'order_5v6w7x8y9z0a1b', 'pay_1f2g3h4i5j6k7l8m', 'sig_e9f8g7h6i5j4k3l2', 300, 'INR', 'CAPTURED', 0,   NULL,                    '2026-06-16 15:00:00', '2026-06-16 15:04:00'),
  (9,  10, 'irene@example.com',    'order_3c4d5e6f7g8h9i', 'pay_9m8n7o6p5q4r3s2t', 'sig_l2m3n4o5p6q7r8s9', 450, 'INR', 'CAPTURED', 0,   NULL,                    '2026-06-09 11:00:00', '2026-06-09 11:05:00'),
  (10, 11, 'jack@example.com',     'order_1i2j3k4l5m6n7o', 'pay_1u2v3w4x5y6z7a8b', 'sig_t9u8v7w6x5y4z3a2', 450, 'INR', 'CAPTURED', 0,   NULL,                    '2026-06-10 09:00:00', '2026-06-10 09:05:00'),
  (11, 12, 'karen@example.com',    'order_9o0p1q2r3s4t5u', 'pay_9b8c7d6e5f4g3h2i', 'sig_a2b3c4d5e6f7g8h9', 450, 'INR', 'CAPTURED', 0,   NULL,                    '2026-06-11 13:00:00', '2026-06-11 13:05:00'),
  (12, 13, 'leo@example.com',      'order_5v6w7x8y9z0a1b', 'pay_1i2j3k4l5m6n7o8p', 'sig_h9i8j7k6l5m4n3o2', 450, 'INR', 'CAPTURED', 0,   NULL,                    '2026-06-12 10:00:00', '2026-06-12 10:05:00'),
  (13, 14, 'mia@example.com',      'order_3c4d5e6f7g8h9i', 'pay_9q8r7s6t5u4v3w2x', 'sig_o2p3q4r5s6t7u8v9', 450, 'INR', 'CAPTURED', 0,   NULL,                    '2026-06-13 16:00:00', '2026-06-13 16:05:00'),
  (16, 17, 'paul@example.com',     'order_1i2j3k4l5m6n7o', 'pay_1y2z3a4b5c6d7e8f', 'sig_x9y8z7a6b5c4d3e2', 400, 'INR', 'CAPTURED', 0,   NULL,                    '2026-06-09 14:00:00', '2026-06-09 14:05:00'),
  (17, 18, 'queen@example.com',    'order_9o0p1q2r3s4t5u', 'pay_9f8g7h6i5j4k3l2m', 'sig_e2f3g4h5i6j7k8l9', 400, 'INR', 'CAPTURED', 0,   NULL,                    '2026-06-10 16:00:00', '2026-06-10 16:05:00'),
  (18, 19, 'queen@example.com',    'order_5v6w7x8y9z0a1b', 'pay_1m2n3o4p5q6r7s8t', 'sig_l9m8n7o6p5q4r3s2', 400, 'INR', 'CAPTURED', 0,   NULL,                    '2026-06-11 12:00:00', '2026-06-11 12:05:00'),
  (19, 20, 'ryan@example.com',     'order_3c4d5e6f7g8h9i', 'pay_9u8v7w6x5y4z3a2b', 'sig_t2u3v4w5x6y7z8a9', 400, 'INR', 'CAPTURED', 0,   NULL,                    '2026-06-12 08:00:00', '2026-06-12 08:05:00'),
  (20, 21, 'sophia@example.com',   'order_1i2j3k4l5m6n7o', 'pay_1b2c3d4e5f6g7h8i', 'sig_a9b8c7d6e5f4g3h2', 400, 'INR', 'CAPTURED', 0,   NULL,                    '2026-06-13 11:00:00', '2026-06-13 11:05:00'),
  (21, 22, 'thomas@example.com',   'order_9o0p1q2r3s4t5u', 'pay_9i8j7k6l5m4n3o2p', 'sig_h2i3j4k5l6m7n8o9', 400, 'INR', 'CAPTURED', 0,   NULL,                    '2026-06-14 10:00:00', '2026-06-14 10:05:00'),
  (22, 23, 'uma@example.com',      'order_5v6w7x8y9z0a1b', 'pay_1p2q3r4s5t6u7v8w', 'sig_o9p8q7r6s5t4u3v2', 400, 'INR', 'CAPTURED', 0,   NULL,                    '2026-06-15 14:00:00', '2026-06-15 14:05:00'),
  (23, 24, 'victor@example.com',   'order_3c4d5e6f7g8h9i', 'pay_9w8x7y6z5a4b3c2d', 'sig_v2w3x4y5z6a7b8c9', 400, 'INR', 'CAPTURED', 0,   NULL,                    '2026-06-16 09:00:00', '2026-06-16 09:05:00'),

  -- PENDING payments (created but not yet captured)
  (14, 15, 'nancy@example.com',    'order_7a8b9c0d1e2f3g4h', NULL, NULL, 450, 'INR', 'CREATED', 0,   NULL,                    '2026-07-18 10:00:00', '2026-07-18 10:00:00'),
  (15, 16, 'oliver@example.com',   'order_2h3i4j5k6l7m8n', NULL, NULL, 450, 'INR', 'CREATED', 0,   NULL,                    '2026-07-19 08:00:00', '2026-07-19 08:00:00'),

  -- FAILED payments
  (24, 25, 'wendy@example.com',    'order_9o0p1q2r3s4t5u', NULL, NULL, 300, 'INR', 'FAILED', 0,   'Insufficient funds',    '2026-06-18 09:00:00', '2026-06-18 09:01:00'),
  (25, 26, 'xavier@example.com',   'order_5v6w7x8y9z0a1b', NULL, NULL, 450, 'INR', 'FAILED', 0,   'Payment timeout',       '2026-06-19 11:00:00', '2026-06-19 11:01:00'),

  -- REFUNDED payments (full refund)
  (26, 27, 'yasmin@example.com',   'order_3c4d5e6f7g8h9i', 'pay_9d8c7b6a5z4y3x2w', 'sig_w9x8y7z6a5b4c3d2', 400, 'INR', 'REFUNDED', 400, NULL,                    '2026-06-20 13:00:00', '2026-06-22 10:00:00'),
  (27, 2,  'alice@example.com',    'order_1i2j3k4l5m6n7o', 'pay_1e2f3g4h5i6j7k8l', 'sig_d2e3f4g5h6i7j8k9', 450, 'INR', 'REFUNDED', 450, NULL,                    '2026-07-17 15:00:00', '2026-07-18 09:00:00'),

  -- PARTIAL_REFUNDED payments
  (28, 3,  'bob@example.com',      'order_9o0p1q2r3s4t5u', 'pay_9k8l7m6n5o4p3q2r', 'sig_l9m8n7o6p5q4r3s2', 400, 'INR', 'PARTIAL_REFUNDED', 150, 'Partial cancellation by hotel', '2026-07-18 12:00:00', '2026-07-19 10:00:00'),

  -- CAPTURED payments (completed stays, no reviews yet)
  (29, 15, 'nancy@example.com',    'order_4d5e6f7g8h9i0j', 'pay_1a2b3c4d5e6f7g8h', 'sig_a1b2c3d4e5f6g7h8', 300, 'INR', 'CAPTURED', 0,   NULL,                    '2026-06-30 10:00:00', '2026-06-30 10:05:00'),
  (30, 16, 'oliver@example.com',   'order_8j9k0l1m2n3o4p', 'pay_9i8h7g6f5e4d3c2b', 'sig_h8g7f6e5d4c3b2a1', 400, 'INR', 'CAPTURED', 0,   NULL,                    '2026-07-04 11:00:00', '2026-07-04 11:05:00');

-- +goose Down
DELETE FROM payments WHERE booking_id BETWEEN 1 AND 30;

-- +goose Up

-- Reviews: spread across users 1-27, hotels 1-3, bookings 1-28
-- Each review matches the user+hotel from the corresponding booking
-- Ratings vary 1-5, some reviews are soft-deleted, is_synced varies
INSERT INTO reviews (user_id, booking_id, hotel_id, comment, rating, created_at, updated_at, deleted_at, is_synced) VALUES
  -- Hotel 1 (Grand Hotel) - bookings 1-8 (alice through henry)
  (2,  1,  1, 'Amazing stay! The rooms were spotless and staff was incredibly friendly.', 5, '2026-06-10 10:00:00', '2026-06-10 10:00:00', NULL, TRUE),
  (3,  2,  1, 'Great location, but the AC was a bit noisy at night.', 4, '2026-06-11 14:30:00', '2026-06-11 14:30:00', NULL, TRUE),
  (4,  3,  1, 'Decent hotel for the price. Breakfast could be better.', 3, '2026-06-12 09:15:00', '2026-06-12 09:15:00', NULL, TRUE),
  (5,  4,  1, 'Terrible experience. Room was not cleaned properly and the front desk was rude.', 1, '2026-06-13 16:45:00', '2026-06-13 16:45:00', NULL, TRUE),
  (6,  5,  1, 'Loved the pool and spa facilities. Will definitely come back!', 5, '2026-06-14 11:00:00', '2026-06-14 11:00:00', NULL, TRUE),
  (7,  6,  1, 'Room was small but clean. Good value for money.', 3, '2026-06-15 08:20:00', '2026-06-15 08:20:00', NULL, TRUE),
  (8,  7,  1, 'The wifi was terrible. Could barely load a webpage.', 2, '2026-06-16 13:00:00', '2026-06-16 13:00:00', NULL, TRUE),
  (9,  8,  1, 'Perfect honeymoon trip! Everything was magical.', 5, '2026-06-17 17:30:00', '2026-06-17 17:30:00', NULL, TRUE),

  -- Hotel 2 (Beach Resort) - bookings 9-15 (irene through oliver)
  (10, 9,  2, 'Beautiful beachfront property. The sunset views were breathtaking.', 5, '2026-06-20 12:00:00', '2026-06-20 12:00:00', NULL, TRUE),
  (11, 10, 2, 'Sand gets everywhere but that is expected. Great resort overall.', 4, '2026-06-21 15:45:00', '2026-06-21 15:45:00', NULL, TRUE),
  (12, 11, 2, 'The water sports were mediocre. Expected more variety.', 3, '2026-06-22 10:30:00', '2026-06-22 10:30:00', NULL, TRUE),
  (13, 12, 2, 'Overpriced for what you get. The food was cold when served.', 2, '2026-06-23 19:00:00', '2026-06-23 19:00:00', NULL, TRUE),
  (14, 13, 2, 'Kids loved the kids club! Family friendly resort.', 5, '2026-06-24 14:15:00', '2026-06-24 14:15:00', NULL, TRUE),
  -- Booking 14 (nancy, PENDING) - no review yet (still pending)
  -- Booking 15 (oliver, PENDING) - no review yet (still pending)

  -- Hotel 3 (Mountain Lodge) - bookings 16-23 (paul through wendy)
  (17, 16, 3, 'The mountain views from the room were stunning. Peaceful retreat.', 5, '2026-07-01 09:00:00', '2026-07-01 09:00:00', NULL, TRUE),
  (18, 17, 3, 'Hiking trails nearby were well marked. Great for nature lovers.', 4, '2026-07-02 11:30:00', '2026-07-02 11:30:00', NULL, TRUE),
  (19, 18, 3, 'The fireplace in the room was a nice touch. Very cozy.', 5, '2026-07-03 18:00:00', '2026-07-03 18:00:00', NULL, TRUE),
  (20, 19, 3, 'Road to the lodge is rough. Need a good car to get there.', 3, '2026-07-04 10:45:00', '2026-07-04 10:45:00', NULL, TRUE),
  (21, 20, 3, 'Room heater broke in the middle of the night. Freezing cold!', 1, '2026-07-05 08:30:00', '2026-07-05 08:30:00', NULL, TRUE),
  (22, 21, 3, 'Excellent breakfast with local ingredients. Highly recommend.', 5, '2026-07-06 07:15:00', '2026-07-06 07:15:00', NULL, TRUE),
  (23, 22, 3, 'Average experience. Nothing special but nothing terrible either.', 3, '2026-07-07 12:00:00', '2026-07-07 12:00:00', NULL, TRUE),
  (24, 23, 3, 'Will come back in winter for skiing! The lodge is perfectly located.', 4, '2026-07-08 14:30:00', '2026-07-08 14:30:00', NULL, TRUE),

  -- Soft-deleted reviews (deleted_at IS NOT NULL) - for cancelled/refunded bookings
  (25, 24, 1, 'This review was a mistake. Deleting it.', 3, '2026-06-18 09:00:00', '2026-06-18 10:00:00', '2026-06-18 10:00:00', FALSE),
  (26, 25, 2, 'Changed my mind about this review.', 2, '2026-06-19 11:30:00', '2026-06-19 12:00:00', '2026-06-19 12:00:00', FALSE),
  (27, 26, 3, 'Removing this review per hotel request.', 4, '2026-06-20 15:00:00', '2026-06-20 15:30:00', '2026-06-20 15:30:00', FALSE),

  -- Unsynchronized reviews (is_synced = FALSE, deleted_at = NULL)
  -- For alice's refunded booking and bob's partial refund booking
  (2,  27, 2, 'Stay was okay but got refunded. Mixed feelings about this place.', 3, '2026-07-18 10:00:00', '2026-07-18 10:00:00', NULL, FALSE),
  (3,  28, 3, 'Partial refund received. Service could have been better.', 2, '2026-07-19 08:00:00', '2026-07-19 08:00:00', NULL, FALSE);

-- Review eligibility: mark all 28 bookings as eligible
INSERT INTO review_eligibility (booking_id, user_id, hotel_id, room_id, eligible, created_at) VALUES
  (1,  2,  1,  1, TRUE,  '2026-06-10 08:00:00'),
  (2,  3,  1,  2, TRUE,  '2026-06-11 08:00:00'),
  (3,  4,  1,  3, TRUE,  '2026-06-12 08:00:00'),
  (4,  5,  1,  4, TRUE,  '2026-06-13 08:00:00'),
  (5,  6,  1,  5, TRUE,  '2026-06-14 08:00:00'),
  (6,  7,  1,  6, TRUE,  '2026-06-15 08:00:00'),
  (7,  8,  1,  7, TRUE,  '2026-06-16 08:00:00'),
  (8,  9,  1,  8, TRUE,  '2026-06-17 08:00:00'),
  (9,  10, 2,  9, TRUE,  '2026-06-20 08:00:00'),
  (10, 11, 2, 10, TRUE,  '2026-06-21 08:00:00'),
  (11, 12, 2, 11, TRUE,  '2026-06-22 08:00:00'),
  (12, 13, 2, 12, TRUE,  '2026-06-23 08:00:00'),
  (13, 14, 2, 13, TRUE,  '2026-06-24 08:00:00'),
  (14, 15, 2, 14, FALSE, '2026-07-18 08:00:00'),
  (15, 16, 2, 15, FALSE, '2026-07-19 08:00:00'),
  (16, 17, 3, 16, TRUE,  '2026-07-01 08:00:00'),
  (17, 18, 3, 17, TRUE,  '2026-07-02 08:00:00'),
  (18, 19, 3, 18, TRUE,  '2026-07-03 08:00:00'),
  (19, 20, 3, 19, TRUE,  '2026-07-04 08:00:00'),
  (20, 21, 3, 20, TRUE,  '2026-07-05 08:00:00'),
  (21, 22, 3, 21, TRUE,  '2026-07-06 08:00:00'),
  (22, 23, 3, 22, TRUE,  '2026-07-07 08:00:00'),
  (23, 24, 3, 23, TRUE,  '2026-07-08 08:00:00'),
  (24, 25, 1, 24, TRUE,  '2026-06-18 08:00:00'),
  (25, 26, 2, 25, TRUE,  '2026-06-19 08:00:00'),
  (26, 27, 3, 26, TRUE,  '2026-06-20 08:00:00'),
  (27, 2,  2, 27, TRUE,  '2026-07-18 08:00:00'),
  (28, 3,  3, 28, TRUE,  '2026-07-19 08:00:00'),
  -- Completed stays, eligible to review but NO review yet
  (29, 15, 1, 29, TRUE,  '2026-07-03 08:00:00'),
  (30, 16, 3, 30, TRUE,  '2026-07-07 08:00:00');
-- Note: room_id 24-30 exist in hotelService (airbnb_development), not in review_service DB

-- +goose Down
DELETE FROM review_eligibility WHERE booking_id BETWEEN 1 AND 30;
DELETE FROM reviews WHERE user_id BETWEEN 1 AND 27;

import { check } from 'k6';
import { apiPost, loginAsSeededUser, loadDateRange, uuidv4, bookingSuccess, bookingError, defaultOptions } from './helpers.js';

export const options = {
  ...defaultOptions,
  scenarios: {
    default: {
      executor: 'per-vu-iterations',
      vus: 5,
      iterations: 3,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.1'],
  },
};

// Same idempotency key across all requests from the same VU
// Expected: 1 booking created (201), rest return existing (200)
export default function () {
  const token = loginAsSeededUser(__VU);
  if (!token) return;

  const dates = loadDateRange(20 + __VU * 5, 2);
  const idempotencyKey = uuidv4(`fixed-key-vu-${__VU}`);

  const res = apiPost('/api/v1/bookings/', {
    hotelId: 1,
    roomId: 1,
    totalGuests: 1,
    bookingAmount: 100,
    checkIn: dates.checkIn,
    checkOut: dates.checkOut,
    idempotencyKey,
  }, token);

  const ok = check(res, {
    'status is 201 or 200': (r) => r.status === 201 || r.status === 200,
  });

  if (ok) bookingSuccess.add(1);
  else bookingError.add(1);
}

import { check } from 'k6';
import { loginAsSeededUser, loadDateRange, apiPost, uuidv4, bookingSuccess, bookingError, defaultOptions } from './helpers.js';

export const options = {
  ...defaultOptions,
  scenarios: {
    default: {
      executor: 'per-vu-iterations',
      vus: 10,
      iterations: 1,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    booking_duration: ['p(95)<2000'],
  },
};

// Each VU books a UNIQUE room — all should succeed
// Expected: 10 × 201
export default function () {
  const token = loginAsSeededUser(__VU);
  if (!token) return;

  const dates = loadDateRange(5, 2);

  const res = apiPost('/api/v1/bookings/', {
    hotelId: 1,
    roomId: __VU, // unique room per VU (rooms 1-10 exist)
    totalGuests: 1,
    bookingAmount: 100,
    checkIn: dates.checkIn,
    checkOut: dates.checkOut,
    idempotencyKey: uuidv4(`${__VU}-${__ITER}-dist-${Date.now()}`),
  }, token);

  if (res.status === 201) bookingSuccess.add(1);
  else bookingError.add(1);

  check(res, {
    'status is 201': (r) => r.status === 201,
  });
}

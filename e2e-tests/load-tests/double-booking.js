import { check } from 'k6';
import { loginAsSeededUser, loadDateRange, apiPost, uuidv4, bookingSuccess, bookingConflict, bookingError, defaultOptions } from './helpers.js';

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
    http_req_failed: ['rate<0.6'],
  },
};

// All VUs book the SAME room on the SAME dates
// Expected: 1 success (201), 9 conflicts (400/409)
export default function () {
  const token = loginAsSeededUser(__VU);
  if (!token) return;

  const dates = loadDateRange(0, 2);

  const res = apiPost('/api/v1/bookings/', {
    hotelId: 1,
    roomId: 1,
    totalGuests: 1,
    bookingAmount: 100,
    checkIn: dates.checkIn,
    checkOut: dates.checkOut,
    idempotencyKey: uuidv4(`${__VU}-${__ITER}-dbl-${Date.now()}`),
  }, token);

  if (res.status === 201) bookingSuccess.add(1);
  else if (res.status === 400 || res.status === 409) bookingConflict.add(1);
  else bookingError.add(1);

  check(res, {
    'status is 201 or 400/409': (r) => r.status === 201 || r.status === 400 || r.status === 409,
  });
}

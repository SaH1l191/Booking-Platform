import { check, sleep } from 'k6';
import { loginAsSeededUser, loadDateRange, apiPost, apiPatch, uuidv4, bookingSuccess, bookingError, defaultOptions } from './helpers.js';

export const options = {
  ...defaultOptions,
  scenarios: {
    default: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 5,
    },
  },
};

// Rapid rebook cycle: create → cancel → rebook same room
// Expected: all 5 cycles succeed
export default function () {
  const token = loginAsSeededUser(__VU);
  if (!token) return;

  const dates = loadDateRange(10 + __ITER * 5, 2);

  // Create
  const createRes = apiPost('/api/v1/bookings/', {
    hotelId: 1, roomId: 1, totalGuests: 1, bookingAmount: 100,
    checkIn: dates.checkIn, checkOut: dates.checkOut,
    idempotencyKey: uuidv4(`${__VU}-${__ITER}-create-${Date.now()}`),
  }, token);
  check(createRes, { 'create succeeded': (r) => r.status === 201 });

  if (createRes.status !== 201) {
    bookingError.add(1);
    return;
  }

  const bookingId = createRes.json('data.bookingId') || createRes.json('data.id');
  sleep(0.5);

  // Cancel
  const cancelRes = apiPatch(`/api/v1/bookings/cancel/${bookingId}`, null, token);
  check(cancelRes, { 'cancel succeeded': (r) => r.status === 200 });
  sleep(0.5);

  // Rebook same dates
  const rebookRes = apiPost('/api/v1/bookings/', {
    hotelId: 1, roomId: 1, totalGuests: 1, bookingAmount: 100,
    checkIn: dates.checkIn, checkOut: dates.checkOut,
    idempotencyKey: uuidv4(`${__VU}-${__ITER}-rebook-${Date.now()}`),
  }, token);
  check(rebookRes, { 'rebook succeeded': (r) => r.status === 201 });

  if (rebookRes.status === 201) bookingSuccess.add(1);
  else bookingError.add(1);
}

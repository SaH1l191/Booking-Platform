import { check, sleep } from 'k6';
import { loginAsSeededUser, loadDateRange, apiGet, apiPost, uuidv4, bookingSuccess, bookingError, defaultOptions } from './helpers.js';

export const options = {
  ...defaultOptions,
  scenarios: {
    default: {
      executor: 'per-vu-iterations',
      vus: 20,
      iterations: 10,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.2'],
    booking_duration: ['p(95)<3000'],
  },
};

// Mixed traffic: random operations (search, availability, book, list)
export default function () {
  const token = loginAsSeededUser(__VU);
  if (!token) return;

  const action = Math.random();

  if (action < 0.4) {
    // 40% — Search hotels
    const res = apiGet('/api/v1/hotels/?page=1&limit=10', token);
    check(res, { 'search ok': (r) => r.status === 200 });

  } else if (action < 0.7) {
    // 30% — Check availability (dates outside any booking window)
    const dates = loadDateRange(200, 2);
    const res = apiGet(
      `/api/v1/bookings/availability?hotelId=1&roomId=1&checkIn=${dates.checkIn}&checkOut=${dates.checkOut}`,
      token,
    );
    check(res, { 'availability ok': (r) => r.status === 200 });

  } else if (action < 0.9) {
    // 20% — Create booking
    const dates = loadDateRange(25 + __ITER, 2);
    const res = apiPost('/api/v1/bookings/', {
      hotelId: 1, roomId: 1, totalGuests: 1, bookingAmount: 100,
      checkIn: dates.checkIn, checkOut: dates.checkOut,
      idempotencyKey: uuidv4(`${__VU}-${__ITER}-mixed-${Date.now()}`),
    }, token);
    const ok = check(res, { 'book ok': (r) => r.status === 201 || r.status === 400 || r.status === 409 });
    if (ok && res.status === 201) bookingSuccess.add(1);

  } else {
    // 10% — List user bookings
    const res = apiGet('/api/v1/bookings/me', token);
    check(res, { 'my bookings ok': (r) => r.status === 200 });
  }

  sleep(0.5);
}

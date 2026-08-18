import { check, sleep } from 'k6';
import { loginAsSeededUser, loadDateRange, apiGet, apiPost, uuidv4, bookingSuccess, bookingConflict, bookingError, bookingDuration } from './helpers.js';

// Stress test: pushes system to its limits
export const options = {
  scenarios: {
    // Ramp up → hold → ramp down
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 20 },   // warm up
        { duration: '15s', target: 50 },   // ramp to normal peak
        { duration: '30s', target: 50 },   // hold at normal peak
        { duration: '15s', target: 100 },  // ramp to stress
        { duration: '30s', target: 100 },  // hold at stress
        { duration: '15s', target: 0 },    // cool down
      ],
      exec: 'mixedTraffic',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<800', 'p(99)<2000'],
    http_req_failed: ['rate<0.10'],
    checks: ['rate>0.95'],
    booking_duration: ['p(95)<3000'],
  },
};

function mixedTraffic() {
  const userId = ((__VU - 1) % 50) + 1;
  const token = loginAsSeededUser(userId);
  if (!token) return;

  const action = Math.random();

  if (action < 0.40) {
    const res = apiGet('/api/v1/hotels/?page=1&limit=10', token);
    check(res, { 'search ok': (r) => r.status === 200 });
  } else if (action < 0.65) {
    const roomId = ((__VU + __ITER) % 15) + 1;
    const dates = loadDateRange(200, 2);
    const res = apiGet(
      `/api/v1/bookings/availability?hotelId=1&roomId=${roomId}&checkIn=${dates.checkIn}&checkOut=${dates.checkOut}`,
      token,
    );
    check(res, { 'availability ok': (r) => r.status === 200 });
  } else if (action < 0.85) {
    const roomId = ((__VU + __ITER) % 15) + 1;
    const dates = loadDateRange(25 + __ITER, 2);
    const res = apiPost('/api/v1/bookings/', {
      hotelId: 1, roomId, totalGuests: 1, bookingAmount: 100,
      checkIn: dates.checkIn, checkOut: dates.checkOut,
      idempotencyKey: uuidv4(`${__VU}-${__ITER}-stress-${Date.now()}`),
    }, token);

    const ok = check(res, { 'book ok': (r) => r.status === 201 || r.status === 400 || r.status === 409 });
    if (ok && res.status === 201) bookingSuccess.add(1);
    else if (res.status === 409) bookingConflict.add(1);
    else if (res.status >= 500) bookingError.add(1);

    bookingDuration.add(res.timings.duration);
  } else if (action < 0.95) {
    const res = apiGet('/api/v1/bookings/me', token);
    check(res, { 'my bookings ok': (r) => r.status === 200 });
  } else {
    const res = apiGet('/health', token);
    check(res, { 'health ok': (r) => r.status === 200 });
  }

  sleep(0.3);
}

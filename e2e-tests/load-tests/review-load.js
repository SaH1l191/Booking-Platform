import { check, sleep } from 'k6';
import { loginAsSeededUser, apiGet, apiPost } from './helpers.js';

export const options = {
  scenarios: {
    ramp: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 20 },    // climb
        { duration: '30s', target: 100 },   // peak
        { duration: '10s', target: 0 },     // cool down
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.15'],
    http_req_duration: ['p(95)<500'],
  },
};

// Review traffic: read-heavy (listing), plus a write attempt.
// POST reviews requires a completed stay — ineligible posts return 400,
// which exercises validation + eligibility checks (never 500).
export default function () {
  const token = loginAsSeededUser((__VU % 50) + 1);
  if (!token) return;

  const action = Math.random();

  if (action < 0.4) {
    // 40% — List all reviews
    const res = apiGet('/api/v1/reviews/', token);
    check(res, { 'list reviews ok': (r) => r.status === 200 });

  } else if (action < 0.7) {
    // 30% — Reviews for a hotel
    const hotelId = (__VU % 4) + 1;
    const res = apiGet(`/api/v1/reviews/hotels/${hotelId}`, token);
    check(res, { 'hotel reviews ok': (r) => r.status === 200 });

  } else if (action < 0.9) {
    // 20% — Reviews by a user
    const res = apiGet(`/api/v1/reviews/user/${(__VU % 50) + 760}`, token);
    check(res, { 'user reviews ok': (r) => r.status === 200 });

  } else {
    // 10% — Write attempt (ineligible booking → 400, never 500)
    const res = apiPost('/api/v1/reviews/', {
      user_id: 1,
      booking_id: 99999,
      hotel_id: 1,
      comment: 'Load test review',
      rating: 4,
    }, token);
    check(res, { 'create review handled (no 500)': (r) => r.status !== 500 });
  }

  sleep(0.3);
}

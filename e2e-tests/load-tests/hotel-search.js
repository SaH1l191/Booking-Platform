import { check, sleep } from 'k6';
import { loginAsSeededUser, apiGet } from './helpers.js';

export const options = {
  scenarios: {
    ramp: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 50 },    // climb
        { duration: '40s', target: 200 },   // peak: 200 concurrent browsers
        { duration: '10s', target: 0 },     // cool down
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

// Read-heavy browsing: the most common real-world traffic.
// Search → hotel detail → room list. No writes, safe to hammer.
export default function () {
  const token = loginAsSeededUser((__VU % 50) + 1);
  if (!token) return;

  const hotelId = (__VU % 4) + 1;

  // Search
  const searchRes = apiGet('/api/v1/hotels/?page=1&limit=10', token);
  check(searchRes, { 'search ok': (r) => r.status === 200 });
  sleep(0.2);

  // Hotel detail
  const detailRes = apiGet(`/api/v1/hotels/${hotelId}`, token);
  check(detailRes, { 'hotel detail ok': (r) => r.status === 200 });
  sleep(0.2);

  // Rooms of that hotel
  const roomsRes = apiGet(`/api/v1/hotels/${hotelId}/rooms`, token);
  check(roomsRes, { 'rooms ok': (r) => r.status === 200 });

  sleep(0.5);
}

import { check, sleep } from 'k6';
import http from 'k6/http';
import { BASE_URL } from './helpers.js';

export const options = {
  scenarios: {
    ramp: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 20 },   // climb
        { duration: '30s', target: 80 },   // peak: 80 concurrent logins
        { duration: '10s', target: 0 },    // cool down
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
  },
};

// Login storm: bcrypt hashing is the AuthService bottleneck.
// Every real session starts with this call, so it's the hottest path.
export default function () {
  const email = `k6load${(__VU % 50) + 1}@example.com`;
  const loginRes = http.post(`${BASE_URL}/users/login`, JSON.stringify({
    email,
    password: 'TestPass123!',
  }), { headers: { 'Content-Type': 'application/json' } });

  check(loginRes, {
    'login ok': (r) => r.status === 200 && r.json('data.accessToken') !== null,
  });

  // 10% of traffic: a brand-new user signs up (bcrypt hash + DB insert)
  if (Math.random() < 0.1) {
    const suffix = `${__VU}-${__ITER}-${Date.now()}`;
    const signupRes = http.post(`${BASE_URL}/users/signup`, JSON.stringify({
      username: `loadsig${suffix}`.slice(0, 30),
      email: `loadsig-${suffix}@example.com`,
      password: 'TestPass123!',
    }), { headers: { 'Content-Type': 'application/json' } });

    check(signupRes, {
      'signup ok': (r) => r.status === 200 || r.status === 201,
    });
  }

  sleep(0.1);
}

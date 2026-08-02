import { check } from 'k6';
import { loginAsSeededUser, apiPost, defaultOptions } from './helpers.js';

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
    http_req_failed: ['rate<0.6'],
  },
};

// 5 VUs try to refund the same non-existent payment
// Expected: 403 (customer can't refund) or 404 (not found)
export default function () {
  const token = loginAsSeededUser(__VU);
  if (!token) return;

  const res = apiPost('/api/v1/payments/refund', {
    bookingId: 99999,
  }, token);

  check(res, {
    'no 500 error': (r) => r.status !== 500,
  });
}

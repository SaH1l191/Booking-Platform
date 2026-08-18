import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const bookingSuccess = new Counter('booking_success');
export const bookingConflict = new Counter('booking_conflict');
export const bookingError = new Counter('booking_error');
export const bookingDuration = new Trend('booking_duration');

// Deterministic UUID-v4 (zod .uuid() requires version 1-5 and variant 8/9/a/b)
export function uuidv4(seed) {
  let hex = '';
  for (let r = 0; r < 4; r++) {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    h ^= Math.imul(r + 1, 2654435761);
    hex += (h >>> 0).toString(16).padStart(8, '0');
  }
  hex = hex.slice(0, 12) + '4' + hex.slice(13, 16) + (['8', '9', 'a', 'b'][parseInt(hex[16], 16) % 4]) + hex.slice(17);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

export function apiGet(path, token) {
  const params = { headers: { 'Content-Type': 'application/json' } };
  if (token) params.headers['Authorization'] = `Bearer ${token}`;
  return http.get(`${BASE_URL}${path}`, params);
}

export function apiPost(path, body, token) {
  const params = { headers: { 'Content-Type': 'application/json' } };
  if (token) params.headers['Authorization'] = `Bearer ${token}`;
  return http.post(`${BASE_URL}${path}`, JSON.stringify(body), params);
}

export function apiPatch(path, body, token) {
  const params = { headers: { 'Content-Type': 'application/json' } };
  if (token) params.headers['Authorization'] = `Bearer ${token}`;
  return http.patch(`${BASE_URL}${path}`, body ? JSON.stringify(body) : null, params);
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

// Login with a pre-seeded customer user (k6load1..k6load50, password TestPass123!)
export function loginAsSeededUser(n) {
  const res = http.post(`${BASE_URL}/users/login`, JSON.stringify({
    email: `k6load${n}@example.com`,
    password: 'TestPass123!',
  }), { headers: { 'Content-Type': 'application/json' } });
  if (res.status !== 200) return null;
  return res.json('data.accessToken') || null;
}

// Sign up a fresh user then login
export function signupAndLogin(suffix) {
  const email = `k6-load-${suffix}-${Date.now()}@example.com`;
  const password = 'TestPass123!';

  const signupRes = apiPost('/users/signup', {
    username: `k6-user-${suffix}-${Date.now()}`,
    email,
    password,
  });

  if (signupRes.status !== 201 && signupRes.status !== 200) {
    return null;
  }

  const loginRes = apiPost('/users/login', { email, password });
  if (loginRes.status !== 200) return null;

  return loginRes.json('data.accessToken') || null;
}

// ---------------------------------------------------------------------------
// Booking helpers
// ---------------------------------------------------------------------------

export function createBooking(token, hotelId, roomId, checkIn, checkOut) {
  const idempotencyKey = `${__VU}-${__ITER}-${Date.now()}`;
  const start = Date.now();

  const res = apiPost('/api/v1/bookings/', {
    hotelId,
    roomId,
    totalGuests: 1,
    bookingAmount: 100,
    checkIn,
    checkOut,
    idempotencyKey,
  }, token);

  const duration = Date.now() - start;
  bookingDuration.add(duration);

  return res;
}

export function cancelBooking(token, bookingId) {
  return apiPatch(`/api/v1/bookings/cancel/${bookingId}`, null, token);
}

export function getDateRange(daysFromNow, nights) {
  const checkIn = new Date(Date.now() + daysFromNow * 86400_000);
  const checkOut = new Date(checkIn.getTime() + nights * 86400_000);
  return {
    checkIn: checkIn.toISOString().split('T')[0],
    checkOut: checkOut.toISOString().split('T')[0],
  };
}

// Date window that advances daily so consecutive load-test runs get fresh dates
export function loadDateRange(offset, nights) {
  const dayIndex = Math.floor(Date.now() / 86400_000) % 20;
  return getDateRange(130 + dayIndex + offset, nights);
}

// ---------------------------------------------------------------------------
// Default options
// ---------------------------------------------------------------------------

export const defaultOptions = {
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.05'],
    checks: ['rate>0.98'],
  },
};

import { describe, it, expect } from 'vitest';
import { GET, POST, DEL, createUser } from './setup';

describe('RBAC', () => {
  it('customer can list hotels', async () => {
    const user = await createUser();
    const res = await GET('/api/v1/hotels/', user.token);
    expect(res.status).toBe(200);
  });

  it('customer cannot create hotel', async () => {
    const user = await createUser();
    const res = await POST('/api/v1/hotels/', {
      name: 'Test', address: '123 St', location: 'City',
      latitude: 40.7, longitude: -74.0,
    }, user.token);
    expect(res.status).toBe(403);
  });

  it('customer cannot delete hotel', async () => {
    const user = await createUser();
    const res = await DEL('/api/v1/hotels/1', user.token);
    expect(res.status).toBe(403);
  });

  it('customer cannot refund', async () => {
    const user = await createUser();
    const res = await POST('/api/v1/payments/refund', {
      bookingId: 1,
    }, user.token);
    expect(res.status).toBe(403);
  });

  it('customer can list own bookings', async () => {
    const user = await createUser();
    const res = await GET('/api/v1/bookings/me', user.token);
    expect(res.status).toBe(200);
  });

  it('customer cannot list bookings by hotel', async () => {
    const user = await createUser();
    const res = await GET('/api/v1/bookings/hotel/1', user.token);
    expect(res.status).toBe(403);
  });
});

import { describe, it, expect } from 'vitest';
import { GET, POST, createUser } from './setup';

describe('Review Flow', () => {
  it('list reviews works', async () => {
    const user = await createUser();
    const res = await GET('/api/v1/reviews/', user.token);
    expect(res.status).toBe(200);
  });

  it('create review without eligibility returns error', async () => {
    const user = await createUser();
    const res = await POST('/api/v1/reviews/', {
      user_id: 1, booking_id: 99999, hotel_id: 1,
      comment: 'Great!', rating: 5,
    }, user.token);
    // Not eligible → 400
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('rejects unauthenticated', async () => {
    const res = await GET('/api/v1/reviews/');
    expect(res.status).toBe(401);
  });
});

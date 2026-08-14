import { describe, it, expect } from 'vitest';
import { GET, POST, DEL, createUser } from './setup';

describe('Auth Flow', () => {
  it('signup + login + get user + logout', async () => {
    const user = await createUser();
    expect(user.token).toBeTruthy();

    // Get user by ID (uses auth service's own route)
    const getRes = await GET(`/users/${user.userId}`, user.token);
    expect(getRes.status).toBe(200);

    // Logout
    const logoutRes = await POST('/users/logout', undefined, user.token);
    expect(logoutRes.status).toBe(200);
  });

  it('rejects wrong password', async () => {
    const user = await createUser();
    const res = await POST('/users/login', { email: user.email, password: 'WrongPass!' });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('rejects unauthenticated request', async () => {
    const res = await GET('/users/');
    expect(res.status).toBe(401);
  });
});

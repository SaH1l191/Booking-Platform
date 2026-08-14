import mysql from 'mysql2/promise';

const BASE_URL = 'http://localhost:3000';

let dbPool: mysql.Pool | null = null;

function getDbPool() {
  if (!dbPool) {
    dbPool = mysql.createPool({
      host: '127.0.0.1', port: 3306, user: 'root', password: 'root', database: 'auth_db',
      waitForConnections: true, connectionLimit: 10,
    });
  }
  return dbPool;
}

export async function api(
  method: string,
  path: string,
  body?: any,
  token?: string,
): Promise<{ status: number; data: any; headers: Headers }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data, headers: res.headers };
}

export const GET = (path: string, token?: string) => api('GET', path, undefined, token);
export const POST = (path: string, body?: any, token?: string) => api('POST', path, body, token);
export const PATCH = (path: string, body?: any, token?: string) => api('PATCH', path, body, token);
export const DEL = (path: string, token?: string) => api('DELETE', path, undefined, token);

let counter = 0;
export function uid() { return `e2e${Date.now()}${++counter}`; }

export function decodeJwt(token: string): { userId: string; email: string; roles: string[] } {
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
  const roles: string[] = Array.isArray(payload.roles) ? payload.roles : [];
  return { userId: String(payload.userId), email: payload.email, roles };
}

async function assignRole(userId: string, roleId: number) {
  const pool = getDbPool();
  for (let attempt = 0; attempt < 10; attempt++) {
    const [userRow] = await pool.execute('SELECT id FROM users WHERE id = ?', [userId]);
    if ((userRow as any[]).length > 0) break;
    await new Promise(r => setTimeout(r, 300));
  }
  await pool.execute(
    'INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)',
    [Number(userId), roleId],
  );
}

export async function createUser(roleId: number = 3) {
  const suffix = uid();
  const email = `${suffix}@example.com`;
  const password = 'Test1234!';
  const username = suffix;

  const signupRes = await POST('/users/signup', { username, email, password });
  const userId = String(signupRes.data?.data?.id || 0);

  if (roleId > 0 && userId !== '0') {
    await assignRole(userId, roleId);
  }

  const loginRes = await POST('/users/login', { email, password });

  let token = loginRes.data?.data?.accessToken || '';
  if (!token) {
    const cookie = loginRes.headers.get('set-cookie') || '';
    token = cookie.match(/access_token=([^;]+)/)?.[1] || '';
  }

  const identity = token ? decodeJwt(token) : { userId, email, roles: [] };

  return { ...identity, email, password, username, token, suffix };
}

export function wait(ms: number) { return new Promise(r => setTimeout(r, ms)); }

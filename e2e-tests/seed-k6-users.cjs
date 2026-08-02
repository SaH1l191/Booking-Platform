const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1', port: 3306, user: 'root', password: 'root', database: 'auth_db',
  });
  await conn.execute('DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE username LIKE "k6load%")');
  await conn.execute('DELETE FROM users WHERE username LIKE "k6load%"');
  console.log('Cleared old k6load users');

  for (let i = 1; i <= 50; i++) {
    const username = 'k6load' + i;
    const email = username + '@example.com';
    const signupRes = await fetch('http://localhost:3000/users/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password: 'TestPass123!' }),
    });
    if (signupRes.status !== 201 && signupRes.status !== 200) {
      console.error(`Signup failed for ${email}: ${signupRes.status} ${await signupRes.text()}`);
      process.exit(1);
    }
    const [u] = await conn.execute('SELECT id FROM users WHERE email = ?', [email]);
    await conn.execute('INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, 3)', [u[0].id]);
  }
  console.log('Seeded 50 k6 users via API with customer role');
  await conn.end();
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });

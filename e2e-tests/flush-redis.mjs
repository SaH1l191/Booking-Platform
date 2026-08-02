import net from 'net';
import mysql from 'mysql2/promise';

function flushRedis() {
  return new Promise((resolve, reject) => {
    const client = net.createConnection(6379, '127.0.0.1');
    client.on('connect', () => client.write('FLUSHALL\r\n'));
    client.on('data', () => {
      client.end();
      resolve();
    });
    client.on('error', reject);
  });
}

async function main() {
  await flushRedis();
  console.log('Redis flushed');

  const conn = await mysql.createConnection({
    host: '127.0.0.1', port: 3306, user: 'root', password: 'root', database: 'airbnb_development1',
  });
  await conn.execute('DELETE FROM idempotencykey');
  await conn.execute('DELETE FROM booking');
  await conn.execute('DELETE FROM outbox');
  await conn.end();
  console.log('Booking tables cleaned');
}

main().catch((e) => {
  console.error('Flush failed:', e);
  process.exit(1);
});

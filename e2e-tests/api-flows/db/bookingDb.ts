import mysql from 'mysql2/promise';

const BOOKING_DB = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.BOOKING_DB_NAME || 'airbnb_development1',
};

let pool: mysql.Pool | null = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({ ...BOOKING_DB, waitForConnections: true, connectionLimit: 5 });
  }
  return pool;
}

export async function getBooking(id: number) {
  const [rows] = await getPool().query(
    'SELECT id, status, hotelId, roomId, bookingAmount, userId FROM booking WHERE id = ?',
    [id],
  );
  return (rows as any[])[0] || null;
}

export async function getOutboxCount(eventType: string, bookingId: number) {
  const [rows] = await getPool().query(
    `SELECT COUNT(*) as cnt FROM outbox WHERE eventType = ? AND JSON_EXTRACT(payload, '$.bookingId') = ?`,
    [eventType, bookingId],
  );
  return (rows as any[])[0].cnt;
}

export async function getOutboxEvent(eventType: string, bookingId: number) {
  const [rows] = await getPool().query(
    `SELECT * FROM outbox WHERE eventType = ? AND JSON_EXTRACT(payload, '$.bookingId') = ? ORDER BY createdAt DESC LIMIT 1`,
    [eventType, bookingId],
  );
  return (rows as any[])[0] || null;
}

export async function backdateCheckOut(bookingId: number, checkOut: string) {
  await getPool().query('UPDATE booking SET checkOut = ? WHERE id = ?', [checkOut, bookingId]);
}

export async function countBookingsByUser(userId: number) {
  const [rows] = await getPool().query(
    'SELECT COUNT(*) as cnt FROM booking WHERE userId = ?',
    [userId],
  );
  return (rows as any[])[0].cnt;
}

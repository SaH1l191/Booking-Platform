import mysql from 'mysql2/promise';

const PAYMENT_DB = {
  host: process.env.PAYMENT_DB_HOST || '127.0.0.1',
  port: Number(process.env.PAYMENT_DB_PORT || 3306),
  user: process.env.PAYMENT_DB_USER || 'root',
  password: process.env.PAYMENT_DB_PASSWORD || 'root',
  database: process.env.PAYMENT_DB_NAME || 'payment_db',
};

let pool: mysql.Pool | null = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({ ...PAYMENT_DB, waitForConnections: true, connectionLimit: 5 });
  }
  return pool;
}

export async function getPaymentByBookingId(bookingId: number) {
  const [rows] = await getPool().query(
    'SELECT id, booking_id, status, razorpay_order_id, amount FROM payments WHERE booking_id = ? ORDER BY id DESC LIMIT 1',
    [bookingId],
  );
  return (rows as any[])[0] || null;
}

export async function getPaymentById(id: number) {
  const [rows] = await getPool().query(
    'SELECT id, booking_id, status, razorpay_order_id, amount FROM payments WHERE id = ?',
    [id],
  );
  return (rows as any[])[0] || null;
}

export async function countPaymentsByBooking(bookingId: number) {
  const [rows] = await getPool().query(
    'SELECT COUNT(*) as cnt FROM payments WHERE booking_id = ?',
    [bookingId],
  );
  return (rows as any[])[0].cnt;
}

export async function getOutboxCount(eventType: string, bookingId: number) {
  const [rows] = await getPool().query(
    `SELECT COUNT(*) as cnt FROM outbox WHERE event_type = ? AND JSON_EXTRACT(payload, '$.bookingId') = ?`,
    [eventType, bookingId],
  );
  return (rows as any[])[0].cnt;
}

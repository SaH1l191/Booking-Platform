import mysql from 'mysql2/promise';

const REVIEW_DB = {
  host: process.env.REVIEW_DB_HOST || '127.0.0.1',
  port: Number(process.env.REVIEW_DB_PORT || 3306),
  user: process.env.REVIEW_DB_USER || 'root',
  password: process.env.REVIEW_DB_PASSWORD || 'root',
  database: process.env.REVIEW_DB_NAME || 'review_service',
};

let pool: mysql.Pool | null = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({ ...REVIEW_DB, waitForConnections: true, connectionLimit: 5 });
  }
  return pool;
}

export async function getEligibility(bookingId: number) {
  const [rows] = await getPool().query(
    'SELECT booking_id, user_id, hotel_id, room_id, eligible FROM review_eligibility WHERE booking_id = ?',
    [bookingId],
  );
  return (rows as any[])[0] || null;
}

export async function countEligibilityRows(bookingId: number) {
  const [rows] = await getPool().query(
    'SELECT COUNT(*) as cnt FROM review_eligibility WHERE booking_id = ?',
    [bookingId],
  );
  return (rows as any[])[0].cnt;
}

export async function getReviewByBookingId(bookingId: number) {
  const [rows] = await getPool().query(
    'SELECT id, booking_id, user_id, hotel_id, rating, comment, deleted_at FROM reviews WHERE booking_id = ? AND deleted_at IS NULL',
    [bookingId],
  );
  return (rows as any[])[0] || null;
}

export async function countReviewsByBookingId(bookingId: number) {
  const [rows] = await getPool().query(
    'SELECT COUNT(*) as cnt FROM reviews WHERE booking_id = ? AND deleted_at IS NULL',
    [bookingId],
  );
  return (rows as any[])[0].cnt;
}

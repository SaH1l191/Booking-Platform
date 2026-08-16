import mysql from 'mysql2/promise';

const NOTIFICATION_DB = {
  host: process.env.NOTIFICATION_DB_HOST || '127.0.0.1',
  port: Number(process.env.NOTIFICATION_DB_PORT || 3306),
  user: process.env.NOTIFICATION_DB_USER || 'root',
  password: process.env.NOTIFICATION_DB_PASSWORD || 'root',
  database: process.env.NOTIFICATION_DB_NAME || 'airbnb_development',
};

let pool: mysql.Pool | null = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({ ...NOTIFICATION_DB, waitForConnections: true, connectionLimit: 5 });
  }
  return pool;
}

export async function getEmailByBookingId(bookingId: number) {
  const [rows] = await getPool().query(
    `SELECT id, event_id, to_email, subject, template_id, status, attempts
     FROM email_outbox
     WHERE JSON_EXTRACT(template_params, '$.bookingId') = ?
     ORDER BY created_at DESC LIMIT 1`,
    [bookingId],
  );
  return (rows as any[])[0] || null;
}

export async function getEmailByEventId(eventId: string) {
  const [rows] = await getPool().query(
    `SELECT id, event_id, to_email, subject, template_id, status, attempts
     FROM email_outbox
     WHERE event_id = ?`,
    [eventId],
  );
  return (rows as any[])[0] || null;
}

export async function countEmailsByBookingId(bookingId: number) {
  const [rows] = await getPool().query(
    `SELECT COUNT(*) as cnt FROM email_outbox
     WHERE JSON_EXTRACT(template_params, '$.bookingId') = ?`,
    [bookingId],
  );
  return (rows as any[])[0].cnt;
}

export async function getProcessedEvent(eventId: string) {
  const [rows] = await getPool().query(
    'SELECT event_id FROM processed_events WHERE event_id = ?',
    [eventId],
  );
  return (rows as any[])[0] || null;
}

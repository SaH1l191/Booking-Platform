import mysql from 'mysql2/promise';
import { serverConfig } from '../config';
import logger from '../config/logger';

let pool: mysql.Pool;

export async function getDB() {
    if (!pool) {
        pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'password',
            database: process.env.DB_DATABASE || 'airbnb_development',
            waitForConnections: true,
            connectionLimit: 5,
        });
        logger.info("NotificationService DB pool created");
    }
    return pool;
}

export async function ensureProcessedEventsTable() {
    const db = await getDB();
    await db.execute(`CREATE TABLE IF NOT EXISTS processed_events (
        event_id VARCHAR(36) PRIMARY KEY,
        processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    logger.info("processed_events table ensured");
}

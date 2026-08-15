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

export async function ensureEmailOutboxTable() {
    const db = await getDB();
    await db.execute(`CREATE TABLE IF NOT EXISTS email_outbox (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        event_id VARCHAR(36) NOT NULL,
        to_email VARCHAR(255) NOT NULL,
        subject VARCHAR(500) NOT NULL,
        template_id VARCHAR(100) NOT NULL,
        template_params JSON NOT NULL,
        status ENUM('PENDING', 'SENT', 'FAILED') DEFAULT 'PENDING',
        attempts INT DEFAULT 0,
        max_attempts INT DEFAULT 5,
        last_error TEXT,
        next_retry_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY idx_outbox_event_id (event_id)
    )`);
    logger.info("email_outbox table ensured");
}

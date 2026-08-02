import { PrismaClient } from "@prisma/client";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { redisClient } from "../config/redis.config";

dotenv.config({ path: path.resolve(__dirname, "../../.env.test") });

process.env.DATABASE_URL = "mysql://root:root@localhost:3306/booking_test";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS \`booking\` (
  \`id\` INT NOT NULL AUTO_INCREMENT,
  \`userId\` INT NOT NULL,
  \`userEmail\` VARCHAR(191) NOT NULL DEFAULT '',
  \`hotelId\` INT NOT NULL,
  \`roomId\` INT NOT NULL,
  \`checkIn\` DATETIME(3) NOT NULL,
  \`checkOut\` DATETIME(3) NOT NULL,
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updatedAt\` DATETIME(3) NOT NULL,
  \`bookingAmount\` INT NOT NULL,
  \`status\` ENUM('PENDING','CONFIRMED','CANCELLED','EXPIRED') NOT NULL DEFAULT 'PENDING',
  \`totalGuests\` INT NOT NULL,
  \`expiresAt\` DATETIME(3) NULL,
  \`stayCompletedEmittedAt\` DATETIME(3) NULL,
  PRIMARY KEY (\`id\`),
  INDEX \`booking_userId_idx\` (\`userId\`),
  INDEX \`booking_hotelId_idx\` (\`hotelId\`),
  INDEX \`booking_hotelId_roomId_status_idx\` (\`hotelId\`, \`roomId\`, \`status\`),
  INDEX \`booking_hotelId_roomId_checkIn_checkOut_idx\` (\`hotelId\`, \`roomId\`, \`checkIn\`, \`checkOut\`),
  INDEX \`booking_status_expiresAt_idx\` (\`status\`, \`expiresAt\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`idempotencykey\` (
  \`id\` INT NOT NULL AUTO_INCREMENT,
  \`key\` VARCHAR(191) NOT NULL,
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updatedAt\` DATETIME(3) NOT NULL,
  \`finalized\` BOOLEAN NOT NULL DEFAULT false,
  \`bookingId\` INT NOT NULL,
  UNIQUE INDEX \`IdempotencyKey_key_key\` (\`key\`),
  UNIQUE INDEX \`IdempotencyKey_bookingId_key\` (\`bookingId\`),
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`IdempotencyKey_bookingId_fkey\` FOREIGN KEY (\`bookingId\`) REFERENCES \`booking\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`outbox\` (
  \`id\` INT NOT NULL AUTO_INCREMENT,
  \`eventId\` VARCHAR(191) NOT NULL,
  \`eventType\` VARCHAR(191) NOT NULL,
  \`payload\` JSON NOT NULL,
  \`published\` BOOLEAN NOT NULL DEFAULT false,
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX \`outbox_eventId_key\` (\`eventId\`),
  INDEX \`outbox_published_createdAt_idx\` (\`published\`, \`createdAt\`),
  PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`processed_event\` (
  \`eventId\` VARCHAR(191) NOT NULL,
  \`processedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`eventId\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
`;

export default async function setup() {
  console.log("\n[TEST SETUP] Creating test database...");

  const connection = await mysql.createConnection({
    host: "localhost",
    port: 3306,
    user: "root",
    password: "root",
  });

  await connection.execute(`DROP DATABASE IF EXISTS \`booking_test\``);
  await connection.execute(
    `CREATE DATABASE \`booking_test\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await connection.changeUser({ database: "booking_test" });

  const statements = SCHEMA_SQL.split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  for (const stmt of statements) {
    await connection.execute(stmt);
  }

  await connection.end();
  console.log("[TEST SETUP] Database ready.\n");
}

export async function truncateAll() {
  const prisma = new PrismaClient();
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
  const tables = ["outbox", "processed_event", "idempotencykey", "booking"];
  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${table}\``);
  }
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
  await prisma.$disconnect();

  const holdKeys = await redisClient.keys("hold:hotel:*");
  const bookedKeys = await redisClient.keys("booked:hotel:*");
  const allKeys = [...holdKeys, ...bookedKeys];
  if (allKeys.length > 0) {
    await redisClient.del(...allKeys);
  }
}

/*
  Warnings:

  - A unique constraint covering the columns `[eventId]` on the table `outbox` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `eventId` to the `outbox` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `booking` ADD COLUMN `stayCompletedEmittedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `outbox` ADD COLUMN `eventId` VARCHAR(191) NOT NULL;

-- CreateTable
CREATE TABLE `processed_event` (
    `eventId` VARCHAR(191) NOT NULL,
    `processedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`eventId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `outbox_eventId_key` ON `outbox`(`eventId`);

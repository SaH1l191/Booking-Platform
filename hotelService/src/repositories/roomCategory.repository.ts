import RoomCategory from "../db/models/roomCategory";
import { createRoomCategoryDto } from "../dto/roomCategory.dto";
import {   NotFoundError } from "../utils/errors/app.error";
import logger from "../config/logger";

export async function createRoomCategory(data: createRoomCategoryDto) {
  const roomCategory = await RoomCategory.create(data);
  logger.info("Room category created:", roomCategory.toJSON());
  return roomCategory;
}

export async function getRoomCategoryById(id: number) {
  const roomCategory = await RoomCategory.findByPk(id);
  if (!roomCategory) {
    logger.warn(`Room category with id: ${id} not found`);
    throw new NotFoundError("RoomCategory not found");
  }
  logger.info("Room category found:", roomCategory.toJSON());
  return roomCategory;
}

export async function getAllRoomCategories() {
  const categories = await RoomCategory.findAll({ where: { deletedAt: null } });
  logger.info(`Found ${categories.length} room categories`);
  return categories;
}

export async function updateRoomCategory(id: number, data: Partial<createRoomCategoryDto>) {
  await RoomCategory.update(data, { where: { id } });
  const updatedCategory = await RoomCategory.findByPk(id);
  logger.info("Room category updated:", updatedCategory?.toJSON());
  return updatedCategory;
}

export async function deleteRoomCategory(id: number) {
  const roomCategory = await getRoomCategoryById(id);
  roomCategory.deletedAt = new Date();
  await roomCategory.save(); 
  logger.info("Room category soft-deleted:", roomCategory.toJSON());
  return roomCategory;
}
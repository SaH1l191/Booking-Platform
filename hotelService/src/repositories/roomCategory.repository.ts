import RoomCategory from "../db/models/roomCategory";
import { createRoomCategoryDto } from "../dto/roomCategory.dto";
import {   NotFoundError } from "../utils/errors/app.error";
import logger from "../config/logger";

export async function createRoomCategory(data: createRoomCategoryDto) {
  const roomCategory = await RoomCategory.create(data);
  logger.info("Room category created", { roomCategoryId: roomCategory.id });
  return roomCategory;
}

export async function getRoomCategoryById(id: number) {
  const roomCategory = await RoomCategory.findByPk(id);
  if (!roomCategory) {
    logger.warn("Room category not found", { categoryId: id });
    throw new NotFoundError("RoomCategory not found");
  }
  logger.info("Room category found", { categoryId: roomCategory.id });
  return roomCategory;
}

export async function getAllRoomCategories(hotelId?: number, page?: number, limit?: number) {
  const where: any = { deletedAt: null };
  if (hotelId) where.hotelId = hotelId;
  if (page && limit) {
    const offset = (page - 1) * limit;
    const { count, rows } = await RoomCategory.findAndCountAll({
      where,
      limit,
      offset,
    });
    logger.info(`Found ${count} room categories (page ${page}, limit ${limit})`);
    return { data: rows, total: count, page, limit, totalPages: Math.ceil(count / limit) };
  }
  const categories = await RoomCategory.findAll({ where });
  logger.info(`Found ${categories.length} room categories`);
  return categories;
}

export async function updateRoomCategory(id: number, data: Partial<createRoomCategoryDto>) {
  await RoomCategory.update(data, { where: { id } });
  const updatedCategory = await RoomCategory.findByPk(id);
  logger.info("Room category updated", { categoryId: updatedCategory?.id });
  return updatedCategory;
}

export async function deleteRoomCategory(id: number) {
  const roomCategory = await getRoomCategoryById(id);
  roomCategory.deletedAt = new Date();
  await roomCategory.save(); 
  logger.info("Room category soft-deleted", { categoryId: roomCategory.id });
  return roomCategory;
}
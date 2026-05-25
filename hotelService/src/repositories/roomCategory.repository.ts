import RoomCategory from "../db/models/roomCategory";
import { createRoomCategoryDto } from "../dto/roomCategory.dto";
import {   NotFoundError } from "../utils/errors/app.error";

export async function createRoomCategory(data: createRoomCategoryDto) {
  const roomCategory = await RoomCategory.create(data);
  return roomCategory;
}

export async function getRoomCategoryById(id: number) {
  const roomCategory = await RoomCategory.findByPk(id);
  if (!roomCategory) {
    throw new NotFoundError("RoomCategory not found");
  }
  return roomCategory;
}

export async function getAllRoomCategories() {
  const categories = await RoomCategory.findAll({ where: { deletedAt: null } });
  return categories;
}

export async function updateRoomCategory(id: number, data: Partial<createRoomCategoryDto>) {
  await RoomCategory.update(data, { where: { id } });
  return RoomCategory.findByPk(id);
}

export async function deleteRoomCategory(id: number) {
  const roomCategory = await getRoomCategoryById(id);
  roomCategory.deletedAt = new Date();
  await roomCategory.save(); 
  return roomCategory;
}
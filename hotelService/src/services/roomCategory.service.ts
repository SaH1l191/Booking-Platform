import { createRoomCategoryDto } from "../dto/roomCategory.dto";
import {
  createRoomCategory,
  deleteRoomCategory,
  getAllRoomCategories,
  getRoomCategoryById,
  updateRoomCategory,
} from "../repositories/roomCategory.repository";
import logger from "../config/logger";

export async function createRoomCategoryService(data: createRoomCategoryDto) {
  logger.info("Service: Creating room category");
  return await createRoomCategory(data);
}

export async function getRoomCategoryByIdService(id: number) {
  logger.info(`Service: Fetching room category with id: ${id}`);
  return await getRoomCategoryById(id);
}

export async function getAllRoomCategoriesService() {
  logger.info("Service: Fetching all room categories");
  return await getAllRoomCategories();
}

export async function updateRoomCategoryService(id: number, data: Partial<createRoomCategoryDto>) {
  logger.info(`Service: Updating room category with id: ${id}`);
  return await updateRoomCategory(id, data);
}

export async function deleteRoomCategoryService(id: number) {
  logger.info(`Service: Deleting room category with id: ${id}`);
  return await deleteRoomCategory(id);
}
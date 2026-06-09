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
  logger.info("Creating room category in service");
  return await createRoomCategory(data);
}

export async function getRoomCategoryByIdService(id: number) {
  logger.info("Fetching room category by ID in service", { categoryId: id });
  return await getRoomCategoryById(id);
}

export async function getAllRoomCategoriesService(hotelId?: number) {
  logger.info("Fetching all room categories in service", { hotelId });
  return await getAllRoomCategories(hotelId);
}

export async function updateRoomCategoryService(id: number, data: Partial<createRoomCategoryDto>) {
  logger.info("Updating room category in service", { categoryId: id });
  return await updateRoomCategory(id, data);
}

export async function deleteRoomCategoryService(id: number) {
  logger.info("Deleting room category in service", { categoryId: id });
  return await deleteRoomCategory(id);
}

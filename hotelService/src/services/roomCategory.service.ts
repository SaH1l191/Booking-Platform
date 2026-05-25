import { createRoomCategoryDto } from "../dto/roomCategory.dto";
import {
  createRoomCategory,
  deleteRoomCategory,
  getAllRoomCategories,
  getRoomCategoryById,
  updateRoomCategory,
} from "../repositories/roomCategory.repository";

export async function createRoomCategoryService(data: createRoomCategoryDto) {
  return await createRoomCategory(data);
}

export async function getRoomCategoryByIdService(id: number) {
  return await getRoomCategoryById(id);
}

export async function getAllRoomCategoriesService() {
  return await getAllRoomCategories();
}

export async function updateRoomCategoryService(id: number, data: Partial<createRoomCategoryDto>) {
  return await updateRoomCategory(id, data);
}

export async function deleteRoomCategoryService(id: number) {
  return await deleteRoomCategory(id);
}
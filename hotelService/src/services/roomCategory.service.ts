import { createRoomCategoryDto } from "../dto/roomCategory.dto";
import {
  createRoomCategory,
  deleteRoomCategory,
  getAllRoomCategories,
  getRoomCategoryById,
  updateRoomCategory,
} from "../repositories/roomCategory.repository";

export async function createRoomCategoryService(data: createRoomCategoryDto) {
  console.log("Creating room category in service");
  return await createRoomCategory(data);
}

export async function getRoomCategoryByIdService(id: number) {
  console.log("Fetching room category by ID in service", { categoryId: id });
  return await getRoomCategoryById(id);
}

export async function getAllRoomCategoriesService(hotelId?: number, page?: number, limit?: number) {
  console.log("Fetching all room categories in service", { hotelId, page, limit });
  return await getAllRoomCategories(hotelId, page, limit);
}

export async function updateRoomCategoryService(id: number, data: Partial<createRoomCategoryDto>) {
  console.log("Updating room category in service", { categoryId: id });
  return await updateRoomCategory(id, data);
}

export async function deleteRoomCategoryService(id: number) {
  console.log("Deleting room category in service", { categoryId: id });
  return await deleteRoomCategory(id);
}

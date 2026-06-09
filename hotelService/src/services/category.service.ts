import { createCategoryDto } from "../dto/category.dto";
import {
    createCategory, deleteCategory, getAllCategories,
    getCategoryById, getCategoryBySlug, updateCategory,
} from "../repositories/category.repository";
import logger from "../config/logger";

export async function createCategoryService(data: createCategoryDto) {
    logger.info("Creating category in service");
    return await createCategory(data);
}

export async function getCategoryByIdService(id: number) {
    logger.info("Fetching category by ID in service", { categoryId: id });
    return await getCategoryById(id);
}

export async function getAllCategoriesService() {
    logger.info("Fetching all categories in service");
    return await getAllCategories();
}

export async function updateCategoryService(id: number, data: Partial<createCategoryDto>) {
    logger.info("Updating category in service", { categoryId: id });
    return await updateCategory(id, data);
}

export async function deleteCategoryService(id: number) {
    logger.info("Deleting category in service", { categoryId: id });
    return await deleteCategory(id);
}

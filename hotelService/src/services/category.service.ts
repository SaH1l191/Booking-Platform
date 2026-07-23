import { createCategoryDto } from "../dto/category.dto";
import {
    createCategory, deleteCategory, getAllCategories,
    getCategoryById, getCategoryBySlug, updateCategory,
} from "../repositories/category.repository";

export async function createCategoryService(data: createCategoryDto) {
    console.log("Creating category in service");
    return await createCategory(data);
}

export async function getCategoryByIdService(id: number) {
    console.log("Fetching category by ID in service", { categoryId: id });
    return await getCategoryById(id);
}

export async function getAllCategoriesService() {
    console.log("Fetching all categories in service");
    return await getAllCategories();
}

export async function updateCategoryService(id: number, data: Partial<createCategoryDto>) {
    console.log("Updating category in service", { categoryId: id });
    return await updateCategory(id, data);
}

export async function deleteCategoryService(id: number) {
    console.log("Deleting category in service", { categoryId: id });
    return await deleteCategory(id);
}

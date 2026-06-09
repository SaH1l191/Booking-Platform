import logger from "../config/logger";
import Category from "../db/models/category";
import { createCategoryDto } from "../dto/category.dto";
import { NotFoundError, ConflictError } from "../utils/errors/app.error";

export async function createCategory(data: createCategoryDto) {
    const existing = await Category.findOne({ where: { slug: data.slug } });
    if (existing) {
        throw new ConflictError("Category with this slug already exists");
    }
    const category = await Category.create(data);
    return category;
}

export async function getCategoryById(id: number) {
    const category = await Category.findByPk(id);
    if (!category) {
        throw new NotFoundError("Category not found");
    }
    return category;
}

export async function getCategoryBySlug(slug: string) {
    const category = await Category.findOne({ where: { slug } });
    if (!category) {
        throw new NotFoundError("Category not found");
    }
    return category;
}

export async function getAllCategories() {
    const categories = await Category.findAll({
        order: [["name", "ASC"]],
    });
    return categories;
}

export async function updateCategory(id: number, data: Partial<createCategoryDto>) {
    const category = await getCategoryById(id);
    if (data.name) category.name = data.name;
    if (data.slug) category.slug = data.slug;
    if (data.icon !== undefined) category.icon = data.icon;
    await category.save();
    return category;
}

export async function deleteCategory(id: number) {
    const category = await getCategoryById(id);
    await category.destroy();
    return category;
}

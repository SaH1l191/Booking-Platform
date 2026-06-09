import { Request, Response } from 'express';
import {
    createCategoryService,
    deleteCategoryService,
    getAllCategoriesService,
    getCategoryByIdService,
    updateCategoryService,
} from '../services/category.service';
import logger from '../config/logger';

export async function createCategoryHandler(req: Request, res: Response) {
    logger.info("Creating category", { body: req.body });
    const result = await createCategoryService(req.body);
    logger.info("Category created successfully");
    res.status(201).json({ message: "Category created", data: result, success: true });
}

export async function getCategoryByIdHandler(req: Request, res: Response) {
    const id = Number(req.params.id);
    logger.info("Fetching category by ID", { categoryId: id });
    const result = await getCategoryByIdService(id);
    logger.info("Category fetched successfully", { categoryId: id });
    res.status(200).json({ message: "Category fetched", data: result, success: true });
}

export async function getAllCategoriesHandler(_req: Request, res: Response) {
    logger.info("Fetching all categories");
    const result = await getAllCategoriesService();
    logger.info("Categories fetched successfully");
    res.status(200).json({ message: "Categories fetched", data: result, success: true });
}

export async function updateCategoryHandler(req: Request, res: Response) {
    const id = Number(req.params.id);
    logger.info("Updating category", { categoryId: id });
    const result = await updateCategoryService(id, req.body);
    logger.info("Category updated successfully", { categoryId: id });
    res.status(200).json({ message: "Category updated", data: result, success: true });
}

export async function deleteCategoryHandler(req: Request, res: Response) {
    const id = Number(req.params.id);
    logger.info("Deleting category", { categoryId: id });
    const result = await deleteCategoryService(id);
    logger.info("Category deleted successfully", { categoryId: id });
    res.status(200).json({ message: "Category deleted", data: result, success: true });
}

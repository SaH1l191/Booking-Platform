import { Request, Response } from 'express';
import {
    createCategoryService,
    deleteCategoryService,
    getAllCategoriesService,
    getCategoryByIdService,
    updateCategoryService,
} from '../services/category.service';

export async function createCategoryHandler(req: Request, res: Response) {
    console.log("Creating category", { body: req.body });
    const result = await createCategoryService(req.body);
    console.log("Category created successfully");
    res.status(201).json({ message: "Category created", data: result, success: true });
}

export async function getCategoryByIdHandler(req: Request, res: Response) {
    const id = Number(req.params.id);
    console.log("Fetching category by ID", { categoryId: id });
    const result = await getCategoryByIdService(id);
    console.log("Category fetched successfully", { categoryId: id });
    res.status(200).json({ message: "Category fetched", data: result, success: true });
}

export async function getAllCategoriesHandler(_req: Request, res: Response) {
    console.log("Fetching all categories");
    const result = await getAllCategoriesService();
    console.log("Categories fetched successfully");
    res.status(200).json({ message: "Categories fetched", data: result, success: true });
}

export async function updateCategoryHandler(req: Request, res: Response) {
    const id = Number(req.params.id);
    console.log("Updating category", { categoryId: id });
    const result = await updateCategoryService(id, req.body);
    console.log("Category updated successfully", { categoryId: id });
    res.status(200).json({ message: "Category updated", data: result, success: true });
}

export async function deleteCategoryHandler(req: Request, res: Response) {
    const id = Number(req.params.id);
    console.log("Deleting category", { categoryId: id });
    const result = await deleteCategoryService(id);
    console.log("Category deleted successfully", { categoryId: id });
    res.status(200).json({ message: "Category deleted", data: result, success: true });
}

import { Request, Response } from "express";
import {
  createRoomCategoryService,
  deleteRoomCategoryService,
  getAllRoomCategoriesService,
  getRoomCategoryByIdService,
  updateRoomCategoryService,
} from "../services/roomCategory.service";
import logger from "../config/logger";

export async function createRoomCategoryHandler(req: Request, res: Response) {
  logger.info("Creating room category with data:", req.body);
  const result = await createRoomCategoryService(req.body);
  logger.info("Room category created successfully");
  res.status(201).json({ message: "RoomCategory created", data: result, success: true });
}

export async function getRoomCategoryByIdHandler(req: Request, res: Response) {
  const categoryId = Number(req.params.id);
  logger.info(`Fetching room category with id: ${categoryId}`);
  const result = await getRoomCategoryByIdService(categoryId);
  logger.info(`Room category with id: ${categoryId} fetched successfully`);
  res.status(200).json({ message: "RoomCategory fetched", data: result, success: true });
}

export async function getAllRoomCategoriesHandler(_req: Request, res: Response) {
  logger.info("Fetching all room categories");
  const result = await getAllRoomCategoriesService();
  logger.info("Room categories fetched successfully");
  res.status(200).json({ message: "RoomCategories fetched", data: result, success: true });
}

export async function updateRoomCategoryHandler(req: Request, res: Response) {
  const categoryId = Number(req.params.id);
  logger.info(`Updating room category with id: ${categoryId}`);
  const result = await updateRoomCategoryService(categoryId, req.body);
  logger.info(`Room category with id: ${categoryId} updated successfully`);
  res.status(200).json({ message: "RoomCategory updated", data: result, success: true });
}

export async function deleteRoomCategoryHandler(req: Request, res: Response) {
  const categoryId = Number(req.params.id);
  logger.info(`Deleting room category with id: ${categoryId}`);
  const result = await deleteRoomCategoryService(categoryId);
  logger.info(`Room category with id: ${categoryId} deleted successfully`);
  res.status(200).json({ message: "RoomCategory deleted", data: result, success: true });
}
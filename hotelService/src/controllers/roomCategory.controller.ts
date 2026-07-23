import { Request, Response } from "express";
import {
  createRoomCategoryService,
  deleteRoomCategoryService,
  getAllRoomCategoriesService,
  getRoomCategoryByIdService,
  updateRoomCategoryService,
} from "../services/roomCategory.service";

export async function createRoomCategoryHandler(req: Request, res: Response) {
  console.log("Creating room category", { body: req.body });
  const result = await createRoomCategoryService(req.body);
  console.log("Room category created successfully");
  res.status(201).json({ message: "RoomCategory created", data: result, success: true });
}

export async function getRoomCategoryByIdHandler(req: Request, res: Response) {
  const categoryId = Number(req.params.id);
  console.log("Fetching room category by ID", { categoryId });
  const result = await getRoomCategoryByIdService(categoryId);
  console.log("Room category fetched successfully", { categoryId });
  res.status(200).json({ message: "RoomCategory fetched", data: result, success: true });
}

export async function getAllRoomCategoriesHandler(req: Request, res: Response) {
  console.log("Fetching all room categories", { query: req.query });
  const hotelId = req.query.hotelId ? Number(req.query.hotelId) : undefined;
  const result = await getAllRoomCategoriesService(hotelId);
  console.log("Room categories fetched successfully");
  res.status(200).json({ message: "RoomCategories fetched", data: result, success: true });
}

export async function updateRoomCategoryHandler(req: Request, res: Response) {
  const categoryId = Number(req.params.id);
  console.log("Updating room category", { categoryId });
  const result = await updateRoomCategoryService(categoryId, req.body);
  console.log("Room category updated successfully", { categoryId });
  res.status(200).json({ message: "RoomCategory updated", data: result, success: true });
}

export async function deleteRoomCategoryHandler(req: Request, res: Response) {
  const categoryId = Number(req.params.id);
  console.log("Deleting room category", { categoryId });
  const result = await deleteRoomCategoryService(categoryId);
  console.log("Room category deleted successfully", { categoryId });
  res.status(200).json({ message: "RoomCategory deleted", data: result, success: true });
}

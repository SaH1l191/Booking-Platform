import { Request, Response } from "express";
import {
  createRoomCategoryService,
  deleteRoomCategoryService,
  getAllRoomCategoriesService,
  getRoomCategoryByIdService,
  updateRoomCategoryService,
} from "../services/roomCategory.service";

export async function createRoomCategoryHandler(req: Request, res: Response) {
  const result = await createRoomCategoryService(req.body);
  res.status(201).json({ message: "RoomCategory created", data: result, success: true });
}

export async function getRoomCategoryByIdHandler(req: Request, res: Response) {
  const result = await getRoomCategoryByIdService(Number(req.params.id));
  res.status(200).json({ message: "RoomCategory fetched", data: result, success: true });
}

export async function getAllRoomCategoriesHandler(_req: Request, res: Response) {
  const result = await getAllRoomCategoriesService();
  res.status(200).json({ message: "RoomCategories fetched", data: result, success: true });
}

export async function updateRoomCategoryHandler(req: Request, res: Response) {
  const result = await updateRoomCategoryService(Number(req.params.id), req.body);
  res.status(200).json({ message: "RoomCategory updated", data: result, success: true });
}

export async function deleteRoomCategoryHandler(req: Request, res: Response) {
  const result = await deleteRoomCategoryService(Number(req.params.id));
  res.status(200).json({ message: "RoomCategory deleted", data: result, success: true });
}
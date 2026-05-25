import { Request, Response } from "express";
import {
  createRoomService,
  deleteRoomService,
  getAllRoomsService,
  getRoomByIdService,
  updateRoomService,
} from "../services/room.service";

export async function createRoomHandler(req: Request, res: Response) {
  const result = await createRoomService(req.body);
  res.status(201).json({ message: "Room created", data: result, success: true });
}

export async function getRoomByIdHandler(req: Request, res: Response) {
  const result = await getRoomByIdService(Number(req.params.id));
  res.status(200).json({ message: "Room fetched", data: result, success: true });
}

export async function getAllRoomsHandler(_req: Request, res: Response) {
  const result = await getAllRoomsService();
  res.status(200).json({ message: "Rooms fetched", data: result, success: true });
}

export async function updateRoomHandler(req: Request, res: Response) {
  const result = await updateRoomService(Number(req.params.id), req.body);
  res.status(200).json({ message: "Room updated", data: result, success: true });
}

export async function deleteRoomHandler(req: Request, res: Response) {
  const result = await deleteRoomService(Number(req.params.id));
  res.status(200).json({ message: "Room deleted", data: result, success: true });
}
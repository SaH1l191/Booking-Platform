import { Request, Response } from "express";
import {
  createRoomService,
  deleteRoomService,
  getAllRoomsService,
  getRoomByIdService,
  updateRoomService,
} from "../services/room.service";
import logger from "../config/logger";

export async function createRoomHandler(req: Request, res: Response) {
  logger.info("Creating room", { body: req.body });
  const result = await createRoomService(req.body);
  logger.info("Room created successfully");
  res.status(201).json({ message: "Room created", data: result, success: true });
}

export async function getRoomByIdHandler(req: Request, res: Response) {
  const roomId = Number(req.params.id);
  logger.info("Fetching room by ID", { roomId });
  const result = await getRoomByIdService(roomId);
  logger.info("Room fetched successfully", { roomId });
  res.status(200).json({ message: "Room fetched", data: result, success: true });
}

export async function getAllRoomsHandler(req: Request, res: Response) {
  logger.info("Fetching all rooms", { query: req.query });
  const result = await getAllRoomsService(req.query);
  logger.info("Rooms fetched successfully");
  res.status(200).json({ message: "Rooms fetched", data: result, success: true });
}

export async function updateRoomHandler(req: Request, res: Response) {
  const roomId = Number(req.params.id);
  logger.info("Updating room", { roomId });
  const result = await updateRoomService(roomId, req.body);
  logger.info("Room updated successfully", { roomId });
  res.status(200).json({ message: "Room updated", data: result, success: true });
}

export async function deleteRoomHandler(req: Request, res: Response) {
  const roomId = Number(req.params.id);
  logger.info("Deleting room", { roomId });
  const result = await deleteRoomService(roomId);
  logger.info("Room deleted successfully", { roomId });
  res.status(200).json({ message: "Room deleted", data: result, success: true });
}

export async function getRoomsByHotelHandler(req: Request, res: Response) {
  const hotelId = Number(req.params.id || req.params.hotelId);
  logger.info("Fetching rooms for hotel", { hotelId });
  const result = await getAllRoomsService({ hotelId: hotelId });
  logger.info("Hotel rooms fetched successfully", { hotelId });
  res.status(200).json({ message: "Hotel rooms fetched", data: result, success: true });
}
